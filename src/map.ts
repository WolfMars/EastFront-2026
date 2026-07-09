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
    terrainName: string;
    movementCost: number;
    name?: string;
    owner?: string;
}

const TERRAIN_COLORS: Record<TerrainType, string> = {
    [TerrainType.CLEAR]: '#D8C16B',
    [TerrainType.FOREST]: '#2F6B2F',
    [TerrainType.MOUNTAIN]: '#7B746B',
    [TerrainType.MARSHLAND]: '#7AB8B8',
    [TerrainType.WATER]: '#3B6EE6',
    [TerrainType.CITY]: '#F2C94C',
};

const TERRAIN_MOVEMENT_COST: Record<TerrainType, number> = {
    [TerrainType.CLEAR]: 1,
    [TerrainType.FOREST]: 2,
    [TerrainType.MOUNTAIN]: 3,
    [TerrainType.MARSHLAND]: 4,
    [TerrainType.WATER]: 99,
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

const BOARD_ROWS = [
    { r: -12, qStart: -12, codes: '......ww...ffwxfffffffffff' },
    { r: -11, qStart: -12, codes: 'wwwwwwwffffffwwwwffffffwww' },
    { r: -10, qStart: -12, codes: 'wwwwwwffffffwwwwffffffwww' },
    { r: -9, qStart: -11, codes: 'wwwwwffff....fffffwwwww' },
    { r: -8, qStart: -11, codes: 'wwwwffff....C..fffffwwwww' },
    { r: -7, qStart: -11, codes: 'wwwffff...CC...fffffwwwww' },
    { r: -6, qStart: -11, codes: 'wwwffff...CC...fffffwwwww' },
    { r: -5, qStart: -11, codes: 'wwffff.....Cfff..ffffwwww' },
    { r: -4, qStart: -11, codes: 'wwffff..xxxx.Cffff..ffffw' },
    { r: -3, qStart: -11, codes: 'wwwwffff..xxxx..ffffwwwww' },
    { r: -2, qStart: -11, codes: 'wwwffffffffff..mmmmmmwwww' },
    { r: -1, qStart: -11, codes: 'wwwwwwwwff....mmmmmmmwwww' },
    { r: 0, qStart: -10, codes: 'wwwwwwwwwww....mmmmmmmwww' },
    { r: 1, qStart: -10, codes: 'wwwwwwwwwwwwmmmmmmmmmwwww' },
    { r: 2, qStart: -10, codes: 'wwwwwwwwwwwwwwmmmwwwwwwww' },
    { r: 3, qStart: -10, codes: 'wwwwwwwwwwwwwwwwwwwwwwwww' },
    { r: 4, qStart: -10, codes: 'wwwwwwwwwwwwwwwwwwwwwwwww' },
];

const TERRAIN_CODE_MAP: Record<string, TerrainType> = {
    '.': TerrainType.CLEAR,
    'f': TerrainType.FOREST,
    'm': TerrainType.MOUNTAIN,
    'x': TerrainType.MARSHLAND,
    'w': TerrainType.WATER,
    'C': TerrainType.CITY,
};

const BOARD_TERRAIN = new Map<string, TerrainType>();

BOARD_ROWS.forEach((row) => {
    [...row.codes].forEach((code, index) => {
        const q = row.qStart + index;
        const terrain = TERRAIN_CODE_MAP[code];
        if (!terrain) {
            throw new Error(`Invalid board terrain code: ${code} at q=${q}, r=${row.r}`);
        }
        BOARD_TERRAIN.set(`${q},${row.r}`, terrain);
    });
});

const BOARD_CITIES: Array<{ q: number; r: number; name: string }> = [
    { q: -9, r: -8, name: 'Tallinn' },
    { q: -8, r: -7, name: 'Riga' },
    { q: -6, r: -6, name: 'Leningrad' },
    { q: -2, r: -4, name: 'Tver' },
    { q: -1, r: -3, name: 'Smolensk' },
    { q: 1, r: -1, name: 'Moscow' },
    { q: 2, r: 1, name: 'Kiev' },
];

function getBoardTerrain(q: number, r: number): TerrainType {
    return BOARD_TERRAIN.get(`${q},${r}`) ?? TerrainType.WATER;
}

export function generateMap(_width: number, _height: number): Map<string, Hex> {
    const hexes = new Map<string, Hex>();
    const cityPositions = new Map<string, string>();

    BOARD_CITIES.forEach((city) => {
        cityPositions.set(`${city.q},${city.r}`, city.name);
    });

    for (let q = -15; q <= 15; q++) {
        for (let r = -15; r <= 15; r++) {
            const key = `${q},${r}`;
            let terrain = getBoardTerrain(q, r);
            const name = cityPositions.get(key);

            if (name) {
                terrain = TerrainType.CITY;
            }

            const movementCost = TERRAIN_MOVEMENT_COST[terrain] ?? 1;
            const terrainName = TERRAIN_DISPLAY_NAME[terrain] ?? String(terrain);

            hexes.set(key, {
                coord: { q, r },
                terrain,
                terrainName,
                movementCost,
                name,
            });
        }
    }

    return hexes;
}

export function getTerrainColor(terrain: TerrainType): string {
    return TERRAIN_COLORS[terrain] || '#888888';
}

export function getTerrainMovementCost(terrain: TerrainType): number {
    return TERRAIN_MOVEMENT_COST[terrain] ?? 1;
}

export function getTerrainDisplayName(terrain: TerrainType): string {
    return TERRAIN_DISPLAY_NAME[terrain] ?? String(terrain);
}
