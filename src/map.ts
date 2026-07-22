import { AxialCoord, hexSideKey } from './hex';

/** Hex ownership: A = Axis, S = Soviet, N = None */
export type HexOwner = 'A' | 'S' | 'N';

const OWNER_COLORS: Record<HexOwner, string | null> = {
    A: '#4A5340', // Feldgrau
    S: '#CC2200', // Soviet red
    N: null,      // No indicator
};

/** Returns the ownership dot color for a hex, or null if none should be drawn. */
export function getOwnerColor(owner: HexOwner): string | null {
    return OWNER_COLORS[owner];
}

/**
 * Returns the frontline edge color when two adjacent hexes have conflicting
 * ownership (Axis vs Soviet), or null if no frontline should be drawn.
 */
export function getFrontlineColor(a: HexOwner, b: HexOwner): string | null {
    if ((a === 'A' && b === 'S') || (a === 'S' && b === 'A')) {
        return '#FF8C00'; // Orange
    }
    return null;
}

/** Terrain/feature on a hex edge. Extend this union as new side types are added. */
/** Terrain/feature on a hex edge. Extend this union as new side types are added. */
export type HexSideType = 'none' | 'river' | 'bridge';

/** Map from a canonical hex-side key (see hexSideKey) to its side data. */
export type HexSideMap = Map<string, HexSideType>;

/**
 * Apply river/side data to the map. Accepts a simple JSON structure like:
 * { "rivers": ["q,r|q,r", { "key": "q,r|q,r", "type": "river" }] }
 * Returns a HexSideMap of canonical side keys -> side type.
 */
export function applyRiverData(hexMap: Map<string, Hex>, riverData: any): HexSideMap {
    const sideMap: HexSideMap = new Map();
    if (!riverData) return sideMap;

    const entries: Array<string | { key: string; type?: string }> = [];
    if (Array.isArray(riverData.rivers)) {
        for (const e of riverData.rivers) entries.push(e);
    } else if (Array.isArray(riverData.sides)) {
        for (const e of riverData.sides) entries.push(e);
    }

    for (const e of entries) {
        if (typeof e === 'string') {
            const key = e;
            sideMap.set(key, 'river');
            continue;
        }
        if (e && typeof e.key === 'string') {
            const t = e.type === 'bridge' ? 'bridge' : 'river';
            sideMap.set(e.key, t as HexSideType);
        }
    }

    // Optionally validate keys against hexMap and canonicalize using hexSideKey
    const canonical = new Map<string, HexSideType>();
    for (const [k, v] of sideMap.entries()) {
        const parts = k.split('|');
        if (parts.length !== 2) {
            canonical.set(k, v);
            continue;
        }
        const [a, b] = parts;
        const [aq, ar] = a.split(',').map(Number);
        const [bq, br] = b.split(',').map(Number);
        const ck = hexSideKey({ q: aq, r: ar }, { q: bq, r: br });
        canonical.set(ck, v);
    }

    return canonical;
}

/** One row entry in a border scenario file.
 *  Use axisMaxQ for a simple threshold (q <= axisMaxQ → Axis, rest → Soviet).
 *  Use codes + qStart for explicit per-hex ownership ('A', 'S', or 'N'),
 *  matching the same style as BOARD_ROWS terrain codes. Both can coexist in
 *  the same file — codes takes precedence when present on a row.
 */
export interface BorderRowData {
    r: number;
    axisMaxQ?: number;
    qStart?: number;
    codes?: string;
}

/**
 * Scenario border file. For each listed row, ownership is determined by
 * codes (if present) or axisMaxQ. Rows not listed use defaultOwner.
 */
export interface BorderData {
    scenario: string;
    date: string;
    defaultOwner: HexOwner;
    rows: BorderRowData[];
}

const OWNER_CODE_MAP: Record<string, HexOwner> = { A: 'A', S: 'S', N: 'N' };

/** Apply a border scenario to an existing hex map (mutates hex.owner in-place). */
export function applyBorderData(hexMap: Map<string, Hex>, borderData: BorderData): void {
    // Build per-hex lookup from coded rows
    const hexOwnerOverride = new Map<string, HexOwner>();
    // Build threshold lookup from axisMaxQ rows
    const thresholdByR = new Map<number, number>();

    borderData.rows.forEach((row) => {
        if (row.codes !== undefined) {
            const qStart = row.qStart ?? -18;
            [...row.codes].forEach((code, index) => {
                const owner = OWNER_CODE_MAP[code];
                if (!owner) throw new Error(`Invalid border code '${code}' at r=${row.r}`);
                hexOwnerOverride.set(`${qStart + index},${row.r}`, owner);
            });
        } else if (row.axisMaxQ !== undefined) {
            thresholdByR.set(row.r, row.axisMaxQ);
        }
    });

    hexMap.forEach((hex) => {
        const key = `${hex.coord.q},${hex.coord.r}`;
        if (hexOwnerOverride.has(key)) {
            hex.owner = hexOwnerOverride.get(key)!;
        } else {
            const axisMaxQ = thresholdByR.get(hex.coord.r);
            if (axisMaxQ !== undefined) {
                hex.owner = hex.coord.q <= axisMaxQ ? 'A' : 'S';
            } else {
                hex.owner = borderData.defaultOwner;
            }
        }
    });
}

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
    owner: HexOwner;
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
    { r:  -8, qStart: -18, codes: 'wwwwwwwwwwwwfffffwxfffffff' }, // N Finland / Lake Ladoga
    { r:  -7, qStart: -18, codes: 'wwwwwwwwwwwwwwwwfxxfffffff' }, // Gulf of Finland / Leningrad
    { r:  -6, qStart: -18, codes: 'wwwwwwwwwwwfffffffffffffff' }, // Tallinn / Estonia coast
    { r:  -5, qStart: -18, codes: 'wwwwwwwwwwfffwffffffffffff' }, // Baltic states forest
    { r:  -4, qStart: -18, codes: 'wwwwwwwwwwwf.wfff.ffffffff' }, // Gulf of Riga / Lake Peipus
    { r:  -3, qStart: -18, codes: 'wwwwwwww.wfff.ffx.ffffffff' }, // N Latvia / Pskov
    { r:  -2, qStart: -18, codes: 'wwwwwww..f..ff.f..ffffffff' }, // Riga / Lithuania
    { r:  -1, qStart: -18, codes: 'wwwwwww...ffffffffffffffff' }, // S Latvia/ Belarus
    { r:   0, qStart: -18, codes: 'wwwwww..f.f.ffff.fffffffff' }, // N Lithuania / Central Russia
    { r:   1, qStart: -18, codes: 'wwww.f.ff.f.ffffffffffffff' }, // East Prussia / Belarus
    { r:   2, qStart: -18, codes: 'www.f.ffffffffffffffffffff' }, // Poland border / forest
    { r:   3, qStart: -18, codes: '.w..ffffffffff............' }, // Minsk / Ukraine opens east
    { r:   4, qStart: -18, codes: '........f.ffff............' }, // Pripyat Marshes begin
    { r:   5, qStart: -18, codes: '.....ffxf.fff.............' }, // Pripyat Marshes center
    { r:   6, qStart: -18, codes: '.....fxxxffff.............' }, // Pripyat / Brest
    { r:   7, qStart: -18, codes: '.....fxx..................' }, // Pripyat Marshes south
    { r:   8, qStart: -18, codes: '..........................' }, // Ukraine steppes / Kiev
    { r:   9, qStart: -18, codes: '..........................' }, // Ukraine / Kharkov / Lviv
    { r:  10, qStart: -18, codes: '.f......................ww' }, // Carpathians / Caspian
    { r:  11, qStart: -18, codes: 'ff......................ww' }, // Carpathians / Stalingrad
    { r:  12, qStart: -18, codes: 'fmm.....................ww' }, // Carpathian foothills
    { r:  13, qStart: -18, codes: 'fmm....................www' }, // Romania / Black Sea west
    { r:  14, qStart: -18, codes: '..m........ww..........www' }, // Odessa coast / Azov / Caspian
    { r:  15, qStart: -18, codes: '..m.....wwww..........wwww' }, // Black Sea north coast
    { r:  16, qStart: -18, codes: '...www.wwww...........wwww' }, // Black Sea / Crimea
    { r:  17, qStart: -18, codes: '..www..m...m..........wwww' }, // Crimean Mts / Black Sea
    { r:  18, qStart: -18, codes: '.wwwwmmwwwwmmmmmmmmm.wwwww' }, // Caucasus / Black Sea
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
    { q: -2,  r: -4, name: 'Novgorod' },
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
                owner: 'N',
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
