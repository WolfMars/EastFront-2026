import { AxialCoord, hexToPixel, pixelToHex } from './hex';
import { generateMap, getTerrainColor, Hex, TerrainType, getTerrainMovementCost, getTerrainDisplayName } from './map';
import { GameState, Player, UnitType } from './game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const HEX_SIZE = 25; // pixels
const OFFSET_X = canvas.width / 2;
const OFFSET_Y = canvas.height / 2;

let hexMap = generateMap(canvas.width, canvas.height);
let gameState = new GameState(hexMap);

/**
 * Convert game coordinates to canvas coordinates
 */
function gameToCanvas(coord: AxialCoord): { x: number; y: number } {
    const pixel = hexToPixel(coord, HEX_SIZE);
    return {
        x: pixel.x + OFFSET_X,
        y: pixel.y + OFFSET_Y,
    };
}

/**
 * Convert canvas coordinates to game coordinates
 */
function canvasToGame(x: number, y: number): AxialCoord {
    return pixelToHex(x - OFFSET_X, y - OFFSET_Y, HEX_SIZE);
}

/**
 * Draw a single hex
 */
function drawHex(
    coord: AxialCoord,
    fillColor: string,
    strokeColor: string = '#333333',
    strokeWidth: number = 1
): void {
    const pixel = gameToCanvas(coord);
    const x = pixel.x;
    const y = pixel.y;

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = x + HEX_SIZE * Math.cos(angle);
        const hy = y + HEX_SIZE * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

/**
 * Draw the entire map
 */
function drawMap(): void {
    hexMap.forEach((hex: Hex) => {
        const color = getTerrainColor(hex.terrain);
        drawHex(hex.coord, color);

        // Draw city names
        if (hex.name) {
            const pixel = gameToCanvas(hex.coord);
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(hex.name, pixel.x, pixel.y);
        }
    });
}

/**
 * Draw a unit
 */
function drawUnit(unitId: string): void {
    const unit = gameState.units.get(unitId);
    if (!unit) return;

    const pixel = gameToCanvas(unit.position);
    const x = pixel.x;
    const y = pixel.y;

    // Unit color based on player
    const color = unit.owner === Player.AXIS ? '#FF4444' : '#4444FF';

    // Draw unit circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, HEX_SIZE * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Draw unit type indicator
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let label = 'I';
    if (unit.type === UnitType.ARMOR) label = 'A';
    else if (unit.type === UnitType.HEADQUARTERS) label = 'HQ';

    ctx.fillText(label, x, y);
}

/**
 * Draw all units
 */
function drawUnits(): void {
    gameState.units.forEach((_, unitId) => {
        drawUnit(unitId);
    });
}

/**
 * Draw only the outline of a hex (no fill)
 */
function drawHexOutline(coord: AxialCoord, strokeColor: string = '#FFFF00', strokeWidth: number = 3): void {
    const pixel = gameToCanvas(coord);
    const x = pixel.x;
    const y = pixel.y;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = x + HEX_SIZE * Math.cos(angle);
        const hy = y + HEX_SIZE * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
}

function drawSelectedHex(): void {
    if (!gameState.selectedHex) return;
    const coord = gameState.selectedHex;
    const key = `${coord.q},${coord.r}`;
    const hex = hexMap.get(key);
    if (!hex) {
        drawHexOutline(coord, '#FFCC00', 2);
        return;
    }

    // Draw a translucent fill overlay, then a bright outline
    drawHex(coord, 'rgba(255, 255, 0, 0.08)', '#FFCC00', 2);
    drawHexOutline(coord, '#FFCC00', 3);
}

/**
 * Highlight valid moves
 */
function drawValidMoves(): void {
    gameState.validMoves.forEach((coord) => {
        drawHex(coord, 'rgba(255, 255, 0, 0.3)', '#FFFF00', 2);
    });
}

/**
 * Main render loop
 */
function render(): void {
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawMap();
    drawValidMoves();
    drawUnits();
    drawSelectedHex();
}

/**
 * Update UI panels
 */
function updateUI(): void {
    const currentPlayerSpan = document.getElementById('current-player')!;
    const turnCounterSpan = document.getElementById('turn-counter')!;
    const statusText = document.getElementById('status-text')!;
    const unitInfo = document.getElementById('unit-info')!;

    currentPlayerSpan.textContent = `Current Player: ${gameState.currentPlayer.toUpperCase()}`;
    turnCounterSpan.textContent = `Turn: ${gameState.turn}`;

    if (gameState.selectedUnitId) {
        const unit = gameState.units.get(gameState.selectedUnitId);
        if (unit) {
            statusText.textContent = `${unit.type} selected. Click a highlighted hex to move.`;
            unitInfo.innerHTML = `
                <div class="unit-stat">
                    <span>Type:</span>
                    <strong>${unit.type}</strong>
                </div>
                <div class="unit-stat">
                    <span>Strength:</span>
                    <strong>${unit.strength}</strong>
                </div>
                <div class="unit-stat">
                    <span>Movement:</span>
                    <strong>${unit.movement}/${unit.maxMovement}</strong>
                </div>
            `;
        }
    } else if (gameState.selectedHex) {
        const coord = gameState.selectedHex;
        const key = `${coord.q},${coord.r}`;
        const hex = hexMap.get(key);
        if (hex) {
            statusText.textContent = `Hex selected: ${hex.terrainName}`;
            unitInfo.innerHTML = `
                <div class="unit-stat">
                    <span>Coords:</span>
                    <strong>${coord.q}, ${coord.r}</strong>
                </div>
                <div class="unit-stat">
                    <span>Terrain:</span>
                    <strong>${hex.terrainName}</strong>
                </div>
                <div class="unit-stat">
                    <span>Movement Cost:</span>
                    <strong>${hex.movementCost}</strong>
                </div>
                ${hex.name ? `<div class="unit-stat"><span>Name:</span><strong>${hex.name}</strong></div>` : ''}
            `;
        } else {
            statusText.textContent = 'Hex selected (off-map)';
            unitInfo.innerHTML = `
                <div class="unit-stat">
                    <span>Coords:</span>
                    <strong>${coord.q}, ${coord.r}</strong>
                </div>
            `;
        }
    } else {
        statusText.textContent = 'Select a unit to begin.';
        unitInfo.innerHTML = '<p>None selected</p>';
    }
}

/**
 * Canvas click handler
 */
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const coord = canvasToGame(x, y);

    // Check if clicking on a unit
    const unit = gameState.getUnitAt(coord);
    if (unit && unit.owner === gameState.currentPlayer) {
        gameState.selectUnit(unit.id);
    } else if (gameState.selectedUnitId) {
        // If the clicked hex is a valid move, move; otherwise select the hex (unselecting the unit)
        const isValidMove = gameState.validMoves.some(m => m.q === coord.q && m.r === coord.r);
        if (isValidMove) {
            gameState.moveUnit(coord);
        } else {
            gameState.selectHex(coord);
        }
    } else if (!unit) {
        // Empty hex clicked: select hex for info
        gameState.selectHex(coord);
    }

    render();
    updateUI();
});

/**
 * End turn button
 */
document.getElementById('end-turn-btn')!.addEventListener('click', () => {
    gameState.endTurn();
    render();
    updateUI();
});

/**
 * Reset game button
 */
document.getElementById('reset-btn')!.addEventListener('click', () => {
    hexMap = generateMap(canvas.width, canvas.height);
    gameState = new GameState(hexMap);
    render();
    updateUI();
});

// Initial render
render();
updateUI();

/**
 * Populate the map key in the sidebar showing color, name and movement cost
 */
function renderMapKey(): void {
    const keyDiv = document.getElementById('map-key')!;
    keyDiv.innerHTML = '';

    // Iterate over TerrainType enum members
    const terrains = Object.values(TerrainType) as TerrainType[];
    terrains.forEach((t) => {
        const color = getTerrainColor(t);
        const name = getTerrainDisplayName(t);
        const cost = getTerrainMovementCost(t);

        const row = document.createElement('div');
        row.className = 'map-key-row';
        row.innerHTML = `
            <span class="map-key-swatch" style="background:${color}"></span>
            <span class="map-key-name">${name}</span>
            <span class="map-key-cost">Cost: ${cost}</span>
        `;
        keyDiv.appendChild(row);
    });
}

renderMapKey();
