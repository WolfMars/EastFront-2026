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

// Map covers Eastern Front at ~80 km/hex with Moscow at (0,0).
// Geographic range: q=-18..+7, r=-8..+18 (26 wide × 27 tall).
// Water bodies: Baltic Sea, Gulf of Finland, Lake Ladoga, Lake Peipus,
//               Black Sea, Sea of Azov, Caspian (western edge).
// Key terrain: Pripyat Marshes (r=4-7, q=-12 to -9),
//              Carpathians (r=10-13 SW), Caucasus (r=17-18 SE).
const BOARD_ROWS = [
    { r:  -8, qStart: -18, codes: 'wwwwwwwwwwwwfffffwwfffffff' }, // N Finland / Lake Ladoga
    { r:  -7, qStart: -18, codes: 'wwwwwwwwwwwwwwwwfwwfffffff' }, // Gulf of Finland / Leningrad
    { r:  -6, qStart: -18, codes: 'wwwwwwwwwwwfffffffffffffff' }, // Tallinn / Estonia coast
    { r:  -5, qStart: -18, codes: 'wwwwwwwwwwffffffffffffffff' }, // Baltic states forest
    { r:  -4, qStart: -18, codes: 'wwwwwwwwwwwfwwffffffffffff' }, // Gulf of Riga / Lake Peipus
    { r:  -3, qStart: -18, codes: 'wwwwwwwwwwffffffffffffffff' }, // Latvia / Pskov
    { r:  -2, qStart: -18, codes: 'wwwwwwwwwf..ffffffffffffff' }, // Riga / Lithuania
    { r:  -1, qStart: -18, codes: 'wwwwwwwfffffffffffffffffff' }, // Lithuanian coast / Belarus
    { r:   0, qStart: -18, codes: 'wwww..ffffffffffffffffffff' }, // Königsberg / Central Russia
    { r:   1, qStart: -18, codes: 'wwww.fffffffffffffffffffff' }, // East Prussia / Belarus
    { r:   2, qStart: -18, codes: 'www.ffffffffffffffffffffff' }, // Poland border / forest
    { r:   3, qStart: -18, codes: 'ww.fffffffffff............' }, // Minsk / Ukraine opens east
    { r:   4, qStart: -18, codes: '......xxxxffff............' }, // Pripyat Marshes begin
    { r:   5, qStart: -18, codes: '.....xxxxffff.............' }, // Pripyat Marshes center
    { r:   6, qStart: -18, codes: '.....xxxxffff.............' }, // Pripyat / Brest
    { r:   7, qStart: -18, codes: '....xxxx..................' }, // Pripyat Marshes south
    { r:   8, qStart: -18, codes: '..........................' }, // Ukraine steppes / Kiev
    { r:   9, qStart: -18, codes: '..........................' }, // Ukraine / Kharkov / Lviv
    { r:  10, qStart: -18, codes: 'mmm.....................ww' }, // Carpathians / Caspian
    { r:  11, qStart: -18, codes: 'mmm.....................ww' }, // Carpathians / Stalingrad
    { r:  12, qStart: -18, codes: 'mm......................ww' }, // Carpathian foothills
    { r:  13, qStart: -18, codes: 'mm.....................www' }, // Romania / Black Sea west
    { r:  14, qStart: -18, codes: '.........wwww..........www' }, // Odessa coast / Azov / Caspian
    { r:  15, qStart: -18, codes: '.........wwww.........wwww' }, // Black Sea north coast
    { r:  16, qStart: -18, codes: '.wwww....wwwww........wwww' }, // Black Sea / Crimea
    { r:  17, qStart: -18, codes: '.wwwwmmmmwwwww........wwww' }, // Crimean Mts / Black Sea
    { r:  18, qStart: -18, codes: 'wwww.mmmwwwwwmmmmmmm.wwwww' }, // Caucasus / Black Sea
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
    // Northern sector — Army Group North objectives
    { q: -6,  r: -6, name: 'Tallinn' },
    { q: -6,  r: -3, name: 'Pskov' },
    { q: -3,  r: -4, name: 'Novgorod' },
    { q: -9,  r: -2, name: 'Riga' },
    { q: -2,  r: -7, name: 'Leningrad' },
    // Baltic states
    { q: -11, r:  1, name: 'Kaunas' },
    { q: -11, r:  2, name: 'Vilnius' },
    // Central sector — Army Group Center objectives
    { q: -10, r:  3, name: 'Minsk' },
    { q: -6,  r:  1, name: 'Vitebsk' },
    { q: -5,  r:  1, name: 'Smolensk' },
    { q: -5,  r:  4, name: 'Bryansk' },
    { q:  0,  r: -2, name: 'Tver' },
    { q:  0,  r:  0, name: 'Moscow' },
    // Southern sector — Army Group South objectives
    { q: -15, r:  2, name: 'Königsberg' },
    { q: -17, r:  6, name: 'Warsaw' },
    { q: -14, r:  6, name: 'Brest' },
    { q: -16, r:  9, name: 'Lviv' },
    { q: -12, r:  9, name: 'Zhitomir' },
    { q: -10, r:  8, name: 'Kiev' },
    { q: -6,  r:  9, name: 'Kharkov' },
    { q: -14, r: 15, name: 'Odessa' },
    { q: -13, r: 18, name: 'Sevastopol' },
    { q: -5,  r: 14, name: 'Rostov' },
    { q:  0,  r: 11, name: 'Stalingrad' },
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

    for (let q = -18; q <= 7; q++) {
        for (let r = -8; r <= 18; r++) {
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
