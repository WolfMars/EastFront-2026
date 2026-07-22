import { AxialCoord, hexToPixel, pixelToHex, hexSideKey } from './hex';
import { generateMap, getTerrainColor, getOwnerColor, getFrontlineColor, applyBorderData, Hex, TerrainType, getTerrainMovementCost, getTerrainDisplayName, type BorderData } from './map';
import { GameState, Player, UnitType, type GameSetupData, TurnPhase } from './game';
import { globalBus, type GameMessage } from './messaging';
import defaultBorderData from './data/1941-06-barbarossa.json';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const HEX_SIZE = 28; // pixels
const PAN_STEP = 32;

let offsetX = canvas.width / 2;
let offsetY = canvas.height / 2;

let hexMap = generateMap(canvas.width, canvas.height);
let currentBorderData: BorderData = defaultBorderData as BorderData;
applyBorderData(hexMap, currentBorderData);
let gameState = new GameState(hexMap);

// Simple on-page logger: writes a short message to #log-message and appends history to #log-history.
export function pageLog(message: string, appendHistory: boolean = true): void {
    const logSpan = document.getElementById('log-message');
    if (logSpan) logSpan.textContent = message;
    if (appendHistory) {
        const history = document.getElementById('log-history');
        if (history) {
            const p = document.createElement('div');
            p.className = 'log-entry';
            p.textContent = `${new Date().toLocaleTimeString()} — ${message}`;
            history.prepend(p);
            // Trim history to most recent 20 entries
            while (history.children.length > 20) history.removeChild(history.lastChild!);
        }
    }
}

// Toast helpers
function ensureToastContainer(): HTMLElement {
    let c = document.getElementById('toast-container');
    if (!c) {
        c = document.createElement('div');
        c.id = 'toast-container';
        c.className = 'toast-container';
        document.body.appendChild(c);
    }
    return c;
}

function showToast(text: string, type: GameMessage['type'] = 'info', timeout = 4000): void {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `<div class="toast-text">${text}</div>`;

    const close = document.createElement('button');
    close.className = 'close';
    close.innerText = '×';
    close.setAttribute('aria-label', 'Dismiss');
    close.onclick = () => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
    };
    toast.appendChild(close);

    container.appendChild(toast);
    if (type === 'movement') {
        // For movement messages, make the toast stay shorter
        timeout = 1000;
    }
    setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, timeout);
}

// Subscribe to game messages and render them in the UI
globalBus.on((m: GameMessage) => {
    // default UI behavior: put message in page log and keep history unless message requests otherwise
    const append = m.data && typeof m.data.appendHistory === 'boolean' ? m.data.appendHistory : true;
    pageLog(m.text, append);
    // show a toast for important message types
    if (m.type === 'combat' || m.type === 'attack' || m.type === 'movement') {
        showToast(m.text, m.type);
    }
    // also update debug panel content (updateDebugPanel reads gameState.lastCombatMessages)
    updateDebugPanel();
});

// Persistent debug panel state
let lastClick: { q: number; r: number } | null = null;

function updateDebugPanel(): void {
    const panel = document.getElementById('debug-panel');
    if (!panel) return;
    const phase = gameState.phase;
    const selected = gameState.selectedUnitId ?? 'none';
    const currentPlayer = gameState.currentPlayer;
    const selectedPos = gameState.selectedUnitId ? (() => {
        const u = gameState.units.get(gameState.selectedUnitId!);
        return u ? `${u.position.q},${u.position.r}` : 'unknown';
    })() : 'none';
    const last = lastClick ? `${lastClick.q},${lastClick.r}` : 'none';
    const attacksArray = Array.from(gameState.attacks.entries());
    const attacksHtml = attacksArray.length === 0
        ? '<em>none</em>'
        : `<ul>${attacksArray.map(([a,t]) => `<li>${a} → ${t}</li>`).join('')}</ul>`;
    const combatMsgs = Array.isArray((gameState as any).lastCombatMessages) ? (gameState as any).lastCombatMessages as string[] : [];
    const combatHtml = combatMsgs.length === 0 ? '<em>none</em>' : `<ul>${combatMsgs.map(m => `<li>${m}</li>`).join('')}</ul>`;
    const uniqueCount = typeof gameState.getUniqueAttackTargetsCount === 'function' ? gameState.getUniqueAttackTargetsCount() : 0;

    panel.innerHTML = `
        <div><strong>DEBUG</strong></div>
        <div>Phase: ${phase}</div>
        <div>Current player: ${currentPlayer}</div>
        <div>Selected unit: ${selected} (${selectedPos})</div>
        <div>Last click: ${last}</div>
        <div>Unique targets: ${uniqueCount}</div>
        <div>Attacks: ${attacksHtml}</div>
        <div>Combat results: ${combatHtml}</div>
    `;
}

async function clearLogHistory(): Promise<void> {
    const history = document.getElementById('log-history');
    if (history) {
        history.innerHTML = '';
    }
}

async function loadSetupFromFile(file: File): Promise<void> {
    const text = await file.text();
    const setupData = JSON.parse(text) as GameSetupData;
    hexMap = generateMap(canvas.width, canvas.height);
    applyBorderData(hexMap, currentBorderData);
    gameState = new GameState(hexMap, setupData);
    render();
    updateUI();
}

async function loadBorderFromFile(file: File): Promise<void> {
    const text = await file.text();
    currentBorderData = JSON.parse(text) as BorderData;
    hexMap = generateMap(canvas.width, canvas.height);
    applyBorderData(hexMap, currentBorderData);
    gameState = new GameState(hexMap);
    render();
    updateUI();
}

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let suppressNextClick = false;
let dragTotalDistance = 0; // accumulate movement while dragging

canvas.style.cursor = 'grab';
canvas.style.touchAction = 'none';

/**
 * Convert game coordinates to canvas coordinates
 */
function gameToCanvas(coord: AxialCoord): { x: number; y: number } {
    const pixel = hexToPixel(coord, HEX_SIZE);
    return {
        x: pixel.x + offsetX,
        y: pixel.y + offsetY,
    };
}

/**
 * Convert canvas coordinates to game coordinates
 */
function canvasToGame(x: number, y: number): AxialCoord {
    return pixelToHex(x - offsetX, y - offsetY, HEX_SIZE);
}

function panMap(dx: number, dy: number): void {
    offsetX += dx;
    offsetY += dy;
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
        const angle = (Math.PI / 3) * (i + 0.5); //Där satt pointy top!!!
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

// Pointy-top hex directions with the two vertex indices that form the shared edge.
// Vertices are at angle (π/3)*(i+0.5); edge between v1 and v2 faces neighbor (dq, dr).
const HEX_DIRS = [
    { dq: +1, dr:  0, v1: 5, v2: 0 }, // E
    { dq:  0, dr: +1, v1: 0, v2: 1 }, // SE
    { dq: -1, dr: +1, v1: 1, v2: 2 }, // SW
    { dq: -1, dr:  0, v1: 2, v2: 3 }, // W
    { dq:  0, dr: -1, v1: 3, v2: 4 }, // NW
    { dq: +1, dr: -1, v1: 4, v2: 5 }, // NE
] as const;

function drawOwnershipDots(): void {
    hexMap.forEach((hex: Hex) => {
        const color = getOwnerColor(hex.owner);
        if (!color) return;
        const { x, y } = gameToCanvas(hex.coord);
        ctx.beginPath();
        ctx.arc(x + HEX_SIZE * 0.45, y + HEX_SIZE * 0.45, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    });
}

function drawFrontlines(): void {
    const drawn = new Set<string>();
    hexMap.forEach((hex: Hex) => {
        for (const dir of HEX_DIRS) {
            const neighbor = hexMap.get(`${hex.coord.q + dir.dq},${hex.coord.r + dir.dr}`);
            if (!neighbor) continue;
            const color = getFrontlineColor(hex.owner, neighbor.owner);
            if (!color) continue;
            const key = hexSideKey(hex.coord, neighbor.coord);
            if (drawn.has(key)) continue;
            drawn.add(key);
            const { x, y } = gameToCanvas(hex.coord);
            const a1 = (Math.PI / 3) * (dir.v1 + 0.5);
            const a2 = (Math.PI / 3) * (dir.v2 + 0.5);
            ctx.beginPath();
            ctx.moveTo(x + HEX_SIZE * Math.cos(a1), y + HEX_SIZE * Math.sin(a1));
            ctx.lineTo(x + HEX_SIZE * Math.cos(a2), y + HEX_SIZE * Math.sin(a2));
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.stroke();
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
    const color = unit.owner === Player.SOVIET ? '#FF4444' : '#6A8CFF';

    const rectWidth = HEX_SIZE * 1.4;
    const rectHeight = HEX_SIZE * 1.12;
    const rectX = x - rectWidth / 2;
    const rectY = y - rectHeight / 2;

    ctx.fillStyle = color;
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.rect(rectX, rectY, rectWidth, rectHeight);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.2;
    ctx.beginPath();

    if (unit.type === UnitType.ARMOR) {
        ctx.ellipse(x, y - 4, rectWidth * 0.3, rectHeight * 0.2, 0, 0, Math.PI * 2);
        ctx.stroke();
    } else if (unit.type === UnitType.INFANTRY) {
        ctx.moveTo(rectX + 6, rectY + 6);
        ctx.lineTo(rectX + rectWidth - 6, rectY + rectHeight -10);
        ctx.moveTo(rectX + rectWidth - 6, rectY + 6);
        ctx.lineTo(rectX + 6, rectY + rectHeight - 10);
        ctx.stroke();
    } else if (unit.type === UnitType.HEADQUARTERS) {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('HQ', x, y - 2);
    }

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const detailText = `${unit.strength}-${unit.maxMovement}`;
    ctx.fillText(detailText, x, y + 10);
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

function drawNorthArrow(): void {
    const x = 36;
    const y = 36;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 20, y - 20, 40, 40, 8);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#0d3b66';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x - 4, y - 4);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + 4, y - 4);
    ctx.stroke();

    ctx.fillStyle = '#0d3b66';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', x, y + 18);
    ctx.restore();
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
    drawOwnershipDots();
    drawFrontlines();
    drawValidMoves();
    drawUnits();
    drawSelectedHex();
    drawNorthArrow();
}

/**
 * Update UI panels
 */
function updateUI(): void {
    const currentPlayerSpan = document.getElementById('current-player')!;
    const turnCounterSpan = document.getElementById('turn-counter')!;
    const statusText = document.getElementById('status-text')!;
    const phaseIndicator = document.getElementById('phase-indicator')!;
    const phaseBadge = document.getElementById('phase-badge') as HTMLDivElement | null;
    const unitInfo = document.getElementById('unit-info')!;

    currentPlayerSpan.textContent = `Current Player: ${gameState.currentPlayer.toUpperCase()}`;
    turnCounterSpan.textContent = `Turn: ${gameState.turn}`;
    phaseIndicator.textContent = `Phase: ${gameState.phase.toUpperCase()}`;

    const endBtn = document.getElementById('end-turn-btn') as HTMLButtonElement | null;
    if (endBtn) {
        endBtn.textContent = gameState.phase === TurnPhase.MOVE ? 'End Phase' : 'End Turn';
    }

    if (phaseBadge) {
        phaseBadge.textContent = gameState.phase.toUpperCase();
        // Simple styling: green for MOVE, crimson for ATTACK
        if (gameState.phase === TurnPhase.MOVE) {
            phaseBadge.style.backgroundColor = '#2ecc71';
            phaseBadge.style.color = '#042a14';
        } else {
            phaseBadge.style.backgroundColor = '#ff6b6b';
            phaseBadge.style.color = '#330000';
        }
        phaseBadge.style.padding = '6px 10px';
        phaseBadge.style.display = 'inline-block';
        phaseBadge.style.borderRadius = '6px';
        phaseBadge.style.fontWeight = 'bold';
    }

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
        const selectedUnit = gameState.getUnitAt(gameState.selectedHex);
        if (selectedUnit && selectedUnit.owner !== gameState.currentPlayer) {
            statusText.textContent = `Enemy ${selectedUnit.type} selected.`;
            unitInfo.innerHTML = `
                <div class="unit-stat">
                    <span>Type:</span>
                    <strong>${selectedUnit.type}</strong>
                </div>
                <div class="unit-stat">
                    <span>Owner:</span>
                    <strong>${selectedUnit.owner}</strong>
                </div>
                <div class="unit-stat">
                    <span>Strength:</span>
                    <strong>${selectedUnit.strength}</strong>
                </div>
                <div class="unit-stat">
                    <span>Movement:</span>
                    <strong>${selectedUnit.movement}/${selectedUnit.maxMovement}</strong>
                </div>
            `;
            return;
        }
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
        statusText.textContent = 'Stick a unit to begin.';
        unitInfo.innerHTML = '<p>None selected</p>';
    }
    if (gameState.phase === TurnPhase.ATTACK && typeof gameState.getUniqueAttackTargetsCount === 'function') {
        globalBus.emit({ type: 'info', text: `Enemies targeted: ${gameState.getUniqueAttackTargetsCount()}`, data: { appendHistory: false } });
    }
    updateDebugPanel();
}

/**
 * Canvas click handler
 */
canvas.addEventListener('pointerdown', (event) => {
    isDragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    suppressNextClick = false;
    dragTotalDistance = 0;
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
    if (!isDragging) return;

    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;
    // update accumulated drag distance and only suppress the next click
    // if movement exceeded a small threshold (prevents tiny jitters from cancelling clicks)
    dragTotalDistance += Math.hypot(dx, dy);
    dragStartX = event.clientX;
    dragStartY = event.clientY;

    panMap(dx, dy);
    const CLICK_SUPPRESS_THRESHOLD = 6; // pixels
    suppressNextClick = dragTotalDistance > CLICK_SUPPRESS_THRESHOLD;
    render();
});

canvas.addEventListener('pointerup', (event) => {
    isDragging = false;
    canvas.style.cursor = 'grab';
    canvas.releasePointerCapture(event.pointerId);
});

canvas.addEventListener('pointerleave', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
});

canvas.addEventListener('click', (event) => {
    if (suppressNextClick) {
        suppressNextClick = false;
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const coord = canvasToGame(x, y);
    // Debug: show click coordinates and current phase so we can trace why logging/attacks
    globalBus.emit({ type: 'info', text: `Click ${coord.q},${coord.r} phase=${gameState.phase}`, data: { appendHistory: false } });
    lastClick = { q: coord.q, r: coord.r };
    updateDebugPanel();

    // Check if clicking on a unit
    const unit = gameState.getUnitAt(coord);
    if (unit) {
        // If we're in ATTACK phase and an own unit is selected, and the clicked unit is an enemy,
        // treat this as an attack attempt (if adjacent). Otherwise, default to selection behavior.
        if (gameState.phase === TurnPhase.ATTACK && gameState.selectedUnitId && unit.owner !== gameState.currentPlayer) {
            const attacker = gameState.units.get(gameState.selectedUnitId);
            if (attacker) {
                const adjacent = [
                    { q: attacker.position.q + 1, r: attacker.position.r },
                    { q: attacker.position.q - 1, r: attacker.position.r },
                    { q: attacker.position.q, r: attacker.position.r + 1 },
                    { q: attacker.position.q, r: attacker.position.r - 1 },
                    { q: attacker.position.q + 1, r: attacker.position.r - 1 },
                    { q: attacker.position.q - 1, r: attacker.position.r + 1 },
                ];
                const isAdjacent = adjacent.some(c => c.q === coord.q && c.r === coord.r);
                globalBus.emit({ type: 'info', text: `Enemy at click: ${unit.id} owner=${unit.owner} adjacent=${isAdjacent}`, data: { unitId: unit.id, owner: unit.owner, adjacent: isAdjacent } });
                if (isAdjacent) {
                    const ok = gameState.recordAttack(attacker.id, unit.id);
                    if (ok) {
                        globalBus.emit({ type: 'attack', text: `Attacker ${attacker.id} -> target ${unit.id}`, data: { attackerId: attacker.id, targetId: unit.id } });
                        gameState.selectedUnitId = null;
                    } else {
                        const alreadyUsed = gameState.attacks.has(attacker.id);
                        globalBus.emit({ type: 'error', text: `1 - Attack failed: attacker=${attacker.id} owner=${attacker.owner}, target=${unit.id} owner=${unit.owner}, currentPlayer=${gameState.currentPlayer}, alreadyUsed=${alreadyUsed}`, data: { attackerId: attacker.id, targetId: unit.id, alreadyUsed } });
                    }
                    render();
                    updateUI();
                    updateDebugPanel();
                    // we've handled the click as an attack
                    // return early to avoid also selecting the hex below
                    return;
                }
            }
        }
        if (unit.owner === gameState.currentPlayer) {
            gameState.selectUnit(unit.id);
        } else {
            gameState.selectHex(coord);
        }
    } else if (gameState.selectedUnitId) {
        // ATTACK phase: if an attacker is selected and user clicks an adjacent enemy unit,
        // register the attack (one attack per attacker). Otherwise behave like movement.
        if (gameState.phase === TurnPhase.ATTACK) {
            const attacker = gameState.units.get(gameState.selectedUnitId);
            if (attacker) {
                // Check for adjacent enemy unit at clicked coord
                const enemy = gameState.getUnitAt(coord);
                if (enemy && enemy.owner !== gameState.currentPlayer) {
                    const adjacentCoords = [
                        { q: attacker.position.q + 1, r: attacker.position.r },
                        { q: attacker.position.q - 1, r: attacker.position.r },
                        { q: attacker.position.q, r: attacker.position.r + 1 },
                        { q: attacker.position.q, r: attacker.position.r - 1 },
                        { q: attacker.position.q + 1, r: attacker.position.r - 1 },
                        { q: attacker.position.q - 1, r: attacker.position.r + 1 },
                    ];
                    const isAdjacent = adjacentCoords.some(c => c.q === coord.q && c.r === coord.r);
                    // Debug: report whether enemy exists and adjacency before recording attack
                    globalBus.emit({ type: 'info', text: `Enemy at click: ${enemy ? enemy.id : 'none'} owner=${enemy ? enemy.owner : 'n/a'} adjacent=${isAdjacent}`, data: { adjacent: isAdjacent } });
                    if (isAdjacent) {
                        // recordAttack enforces one attack per attacker
                        const ok = gameState.recordAttack(attacker.id, enemy.id);
                        if (ok) {
                            //globalBus.emit({ type: 'attack', text: `Attacker ${attacker.id} -> target ${enemy.id}`, data: { attackerId: attacker.id, targetId: enemy.id } });
                            // deselect attacker to encourage selecting next attacker
                            gameState.selectedUnitId = null;
                        } else {
                            // Provide detailed failure info to debug why recordAttack returned false
                            const attackerOwner = attacker.owner;
                            const targetOwner = enemy.owner;
                            const alreadyUsed = gameState.attacks.has(attacker.id);
                            globalBus.emit({ type: 'error', text: `2 - Attack failed: attacker=${attacker.id} owner=${attackerOwner}, target=${enemy.id} owner=${targetOwner}, currentPlayer=${gameState.currentPlayer}, alreadyUsed=${alreadyUsed}`, data: { attackerId: attacker.id, targetId: enemy.id, alreadyUsed } });
                        }
                        render();
                        updateUI();
                        updateDebugPanel();
                    } else {
                        gameState.selectHex(coord);
                    }
                } else {
                    gameState.selectHex(coord);
                }
            }
        } else {
            // Movement-phase behavior: move if valid, otherwise select hex
            const isValidMove = gameState.validMoves.some(m => m.q === coord.q && m.r === coord.r);
            if (isValidMove) {
                gameState.moveUnit(coord);
            } else {
                gameState.selectHex(coord);
            }
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
    gameState.advancePhase();
    render();
    updateUI();
});

/**
 * Reset game button
 */
document.getElementById('reset-btn')!.addEventListener('click', () => {
    hexMap = generateMap(canvas.width, canvas.height);
    applyBorderData(hexMap, currentBorderData);
    gameState = new GameState(hexMap);
    render();
    updateUI();
});

document.getElementById('load-setup-btn')!.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        await loadSetupFromFile(file);
    };
    input.click();
});

document.getElementById('load-border-btn')!.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        await loadBorderFromFile(file);
    };
    input.click();
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
        event.preventDefault();
        panMap(-PAN_STEP, 0);
        render();
    } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        panMap(PAN_STEP, 0);
        render();
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        panMap(0, -PAN_STEP);
        render();
    } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        panMap(0, PAN_STEP);
        render();
    }
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

document.getElementById('clear-log-btn')!.addEventListener('click', async () => {
    await clearLogHistory();
    pageLog('Log cleared', false);
});

renderMapKey();
