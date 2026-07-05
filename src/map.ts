import { AxialCoord } from './hex';

export enum TerrainType {
    CLEAR = 'clear',
    FOREST = 'forest',
    MOUNTAIN = 'mountain',
    MARSHLAND = 'marshland',
    WATER = 'water',
    CITY = 'city',
}

export interface Hex {
    coord: AxialCoord;
    terrain: TerrainType;
    terrainName: string; // Human readable terrain name
    movementCost: number; // Movement cost to enter this hex
    name?: string;
    owner?: string; // 'axis' | 'soviet'
}

const TERRAIN_COLORS: Record<TerrainType, string> = {
    [TerrainType.CLEAR]: '#90EE90',
    [TerrainType.FOREST]: '#228B22',
    [TerrainType.MOUNTAIN]: '#8B8680',
    [TerrainType.MARSHLAND]: '#7AC5CD',
    [TerrainType.WATER]: '#4169E1',
    [TerrainType.CITY]: '#FFD700',
};

const TERRAIN_MOVEMENT_COST: Record<TerrainType, number> = {
    [TerrainType.CLEAR]: 1,
    [TerrainType.FOREST]: 2,
    [TerrainType.MOUNTAIN]: 3,
    [TerrainType.MARSHLAND]: 2,
    [TerrainType.WATER]: 99, // effectively impassable for now
    [TerrainType.CITY]: 1,
};

const TERRAIN_DISPLAY_NAME: Record<TerrainType, string> = {
    [TerrainType.CLEAR]: 'Clear',
    [TerrainType.FOREST]: 'Forest',
    [TerrainType.MOUNTAIN]: 'Mountain',
    [TerrainType.MARSHLAND]: 'Marshland',
    [TerrainType.WATER]: 'Water',
    [TerrainType.CITY]: 'City',
};

/**
 * Generate a simplified Barbarossa map
 * Eastern Europe focused area
 */
export function generateMap(_width: number, _height: number): Map<string, Hex> {
    const hexes = new Map<string, Hex>();

    // Create a simplified grid with some terrain variety
    for (let q = -20; q < 20; q++) {
        for (let r = -20; r < 20; r++) {
            const coord: AxialCoord = { q, r };
            const key = `${q},${r}`;

            // Generate pseudo-random terrain
            const noise = Math.sin(q * 0.3) * Math.cos(r * 0.3);
            let terrain = TerrainType.CLEAR;

            if (noise > 0.6) terrain = TerrainType.FOREST;
            else if (noise > 0.3) terrain = TerrainType.MOUNTAIN;
            else if (noise < -0.5) terrain = TerrainType.WATER;
            // Introduce some marsh areas near center
            else if (Math.abs(q) < 5 && Math.abs(r) < 5 && Math.random() > 0.7) terrain = TerrainType.MARSHLAND;

            // Add some strategic cities
            let name: string | undefined;
            if (q === 5 && r === 5) {
                name = 'Moscow';
                terrain = TerrainType.CITY;
            } else if (q === -10 && r === 5) {
                name = 'Leningrad';
                terrain = TerrainType.CITY;
            } else if (q === 0 && r === 10) {
                name = 'Kiev';
                terrain = TerrainType.CITY;
            }

            const movementCost = TERRAIN_MOVEMENT_COST[terrain] ?? 1;
            const terrainName = TERRAIN_DISPLAY_NAME[terrain] ?? String(terrain);

            hexes.set(key, {
                coord,
                terrain,
                terrainName,
                movementCost,
                name,
            });
        }
    }

    return hexes;
}

/**
 * Get terrain color for rendering
 */
export function getTerrainColor(terrain: TerrainType): string {
    return TERRAIN_COLORS[terrain] || '#888888';
}

export function getTerrainMovementCost(terrain: TerrainType): number {
    return TERRAIN_MOVEMENT_COST[terrain] ?? 1;
}

export function getTerrainDisplayName(terrain: TerrainType): string {
    return TERRAIN_DISPLAY_NAME[terrain] ?? String(terrain);
}
