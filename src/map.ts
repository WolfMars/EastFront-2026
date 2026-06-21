import { AxialCoord } from './hex';

export enum TerrainType {
    PLAIN = 'plain',
    FOREST = 'forest',
    MOUNTAIN = 'mountain',
    WATER = 'water',
    CITY = 'city',
}

export interface Hex {
    coord: AxialCoord;
    terrain: TerrainType;
    name?: string;
    owner?: string; // 'axis' | 'soviet'
}

const TERRAIN_COLORS: Record<TerrainType, string> = {
    [TerrainType.PLAIN]: '#90EE90',
    [TerrainType.FOREST]: '#228B22',
    [TerrainType.MOUNTAIN]: '#8B8680',
    [TerrainType.WATER]: '#4169E1',
    [TerrainType.CITY]: '#FFD700',
};

/**
 * Generate a simplified Barbarossa map
 * Eastern Europe focused area
 */
export function generateMap(width: number, height: number): Map<string, Hex> {
    const hexes = new Map<string, Hex>();

    // Create a simplified grid with some terrain variety
    for (let q = -20; q < 20; q++) {
        for (let r = -20; r < 20; r++) {
            const coord: AxialCoord = { q, r };
            const key = `${q},${r}`;

            // Generate pseudo-random terrain
            const noise = Math.sin(q * 0.3) * Math.cos(r * 0.3);
            let terrain = TerrainType.PLAIN;

            if (noise > 0.6) terrain = TerrainType.FOREST;
            else if (noise > 0.3) terrain = TerrainType.MOUNTAIN;
            else if (noise < -0.5) terrain = TerrainType.WATER;

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

            hexes.set(key, {
                coord,
                terrain,
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
