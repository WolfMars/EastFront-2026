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
export type HexSideType = 'none' | 'river' | 'bridge';

/** Map from a canonical hex-side key (see hexSideKey) to its side data. */
export type HexSideMap = Map<string, HexSideType>;

/**
 * Apply river/side data to the map.
 *
 * Supported formats:
 * 1) Flat legacy format:
 *    { "rivers": ["q,r|q,r", "q,r|q,r"] }
 * 2) Named-river format:
 *    {
 *      "rivers": [
 *        { "name": "Daugava", "segments": ["q,r|q,r", "q,r|q,r"] },
 *        { "name": "Bug", "segments": [] }
 *      ]
 *    }
 *
 * Returns a HexSideMap of canonical side keys -> side type.
 */
export function applyRiverData(_hexMap: Map<string, Hex>, riverData: any): HexSideMap {
    const sideMap: HexSideMap = new Map();
    if (!riverData) return sideMap;

    const entries: Array<string | { key?: string; type?: string; segments?: string[]; name?: string }> = [];
    if (Array.isArray(riverData.rivers)) {
        for (const e of riverData.rivers) entries.push(e);
    } else if (Array.isArray(riverData.sides)) {
        for (const e of riverData.sides) entries.push(e);
    }

    for (const e of entries) {
        if (typeof e === 'string') {
            sideMap.set(e, 'river');
            continue;
        }
        if (e && Array.isArray(e.segments)) {
            for (const segment of e.segments) {
                if (typeof segment === 'string') sideMap.set(segment, 'river');
            }
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
// Geographic range: q=-21..+7, r=-8..+22 (29 wide × 31 tall).
// Water bodies: Baltic Sea, Gulf of Finland, Lake Ladoga, Lake Peipus,
//               Black Sea, Sea of Azov, Caspian (western edge).
// Key terrain: Pripyat Marshes (r=4-7, q=-12 to -9),
//              Carpathians (r=10-13 SW), Caucasus (r=18-22 SE).
const BOARD_ROWS = [
    { r:  -8, qStart: -21, codes: 'wwwwwwwwwwwwwfffffffwxfffffff' }, // SW Finland coast (Turku) / Lake Ladoga
    { r:  -7, qStart: -21, codes: 'wwwwwwwwwwwwwwwwwwwfxxfffffff' }, // Gulf of Finland / Leningrad
    { r:  -6, qStart: -21, codes: 'wwwwwwwwwwwwwwfffffffffffffff' }, // Tallinn / Estonia coast
    { r:  -5, qStart: -21, codes: 'wwwwwwwwwwww.fffwffffffffffff' }, // W Estonia coast (Haapsalu) / Lake Peipus
    { r:  -4, qStart: -21, codes: 'wwwwwwwwwwwww.f.wfff.ffffffff' }, // Gulf of Riga north / Parnu / Lake Peipus
    { r:  -3, qStart: -21, codes: 'wwwwwwwwwwfw..fff.ffx.fffffff' }, // Courland tip (Ventspils) / Gulf of Riga
    { r:  -2, qStart: -21, codes: 'wwwwwwwwww..f..ff.f..ffffffff' }, // Riga / Lithuania
    { r:  -1, qStart: -21, codes: 'wwwwwwwww....ffffffffffffffff' }, // Liepaja coast / S Latvia / Belarus
    { r:   0, qStart: -21, codes: 'wwwwwwww.f..f.f.ffff.ffffffff' }, // N Lithuania / Central Russia
    { r:   1, qStart: -21, codes: 'wwwwwww.f.ff.f.ffffffffffffff' }, // East Prussia / Belarus
    { r:   2, qStart: -21, codes: 'wwww...f.ffffffffffffffffffff' }, // Poland border / forest
    { r:   3, qStart: -21, codes: '.......ffffffffff............' }, // Minsk / Ukraine opens east
    { r:   4, qStart: -21, codes: '...........f.ffff............' }, // Pripyat Marshes begin
    { r:   5, qStart: -21, codes: '........ffxf.fff.............' }, // Pripyat Marshes center
    { r:   6, qStart: -21, codes: '........fxxxffff.............' }, // Pripyat / Brest
    { r:   7, qStart: -21, codes: '........xx...................' }, // Pripyat Marshes south
    { r:   8, qStart: -21, codes: '.............................' }, // Ukraine steppes / Kiev (extended for AGS)
    { r:   9, qStart: -21, codes: '.............................' }, // Ukraine / Kharkov / Lviv (extended for AGS)
    { r:  10, qStart: -21, codes: '....f........................' }, // Carpathians / Caspian (extended for AGS)
    { r:  11, qStart: -21, codes: '...ff........................' }, // Carpathians / Stalingrad (extended for AGS)
    { r:  12, qStart: -21, codes: '...fmm.......................' }, // Carpathian foothills (extended for AGS)
    { r:  13, qStart: -21, codes: '...fmm.....................ww' }, // Romania / Black Sea west
    { r:  14, qStart: -21, codes: '.....m.........w..........www' }, // Mariupol / Taganrog bay / Caspian
    { r:  15, qStart: -21, codes: '.....m......www..........wwww' }, // Odessa coast / Sea of Azov
    { r:  16, qStart: -21, codes: '........ww..ww...........wwww' }, // Karkinit gulf / Perekop / Sea of Azov
    { r:  17, qStart: -21, codes: '......xww.m...m..........wwww' }, // Danube delta / Crimea / Kerch strait (river hexside)
    { r:  18, qStart: -21, codes: '......wwwmwwwmmmmmmmmmm.wwwww' }, // Constanta / Sevastopol / Caucasus coast
    { r:  19, qStart: -21, codes: '.....wwwwwwwwmmmm...wwwwwwwww' }, // Dobrudja coast / Tuapse / Caspian
    { r:  20, qStart: -21, codes: '....wwwwwwwwwmmmmm..wwwwwwwww' }, // Varna coast / Abkhazia / Caucasus
    { r:  21, qStart: -21, codes: '....wwwwwwwwww.mmmmwwwwwwwwww' }, // Burgas coast / Colchis / Caucasus
    { r:  22, qStart: -21, codes: '..mwwwwmmwwwww.mmmmwwwwwwwwww' }, // Strandzha / Sinop (Turkey) / Georgia
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

// Coordinates are approximate present-day city centers; historical names use their modern locations.
interface BoardCity {
    q: number;
    r: number;
    name: string;
    lat: number;
    lon: number;
}

const BOARD_CITIES: BoardCity[] = [
    // Northern sector — Army Group North objectives
    { q: -7,  r: -6, name: 'Tallinn', lat: 59.4370, lon: 24.7536 },
    { q: -6,  r: -3, name: 'Pskov', lat: 57.8194, lon: 28.3318 },
    { q: -3,  r: -4, name: 'Novgorod', lat: 58.5215, lon: 31.2755 },
    // Riga is on the southern shore of the Gulf of Riga.
    { q: -10, r: -2, name: 'Riga', lat: 56.9496, lon: 24.1052 },
    { q: -2,  r: -7, name: 'Leningrad', lat: 59.9311, lon: 30.3609 },
    // Baltic states
    { q: -12, r:  1, name: 'Kaunas', lat: 54.8985, lon: 23.9036 },
    { q: -11, r:  2, name: 'Vilnius', lat: 54.6872, lon: 25.2797 },
    // Central sector — Army Group Center objectives
    { q: -10, r:  3, name: 'Minsk', lat: 53.9006, lon: 27.5590 },
    { q: -6,  r:  1, name: 'Vitebsk', lat: 55.1904, lon: 30.2049 },
    { q: -5,  r:  1, name: 'Smolensk', lat: 54.7826, lon: 32.0453 },
    { q: -4,  r:  4, name: 'Bryansk', lat: 53.2434, lon: 34.3642 },
    { q:  0,  r: -2, name: 'Tver', lat: 56.8587, lon: 35.9176 },
    { q:  0,  r:  0, name: 'Moscow', lat: 55.7558, lon: 37.6173 },
    // Southern sector — Army Group South objectives
    { q: -17, r:  2, name: 'Gdansk', lat: 54.3520, lon: 18.6466 },
    { q: -20, r:  5, name: 'Poznan', lat: 52.4064, lon: 16.9252 },
    { q: -14, r:  4, name: 'Bialystok', lat: 53.1325, lon: 23.1688 },
    { q: -15, r:  2, name: 'Königsberg', lat: 54.7104, lon: 20.4522 },
    { q: -16, r:  5, name: 'Warsaw', lat: 52.2297, lon: 21.0122 },
    { q: -14, r:  6, name: 'Brest', lat: 52.0976, lon: 23.7341 },
    { q: -16, r:  9, name: 'Lviv', lat: 49.8397, lon: 24.0297 },
    { q: -12, r:  9, name: 'Zhitomir', lat: 50.2547, lon: 28.6587 },
    { q: -10, r:  8, name: 'Kiev', lat: 50.4501, lon: 30.5234 },
    { q: -5,  r:  9, name: 'Kharkov', lat: 49.9935, lon: 36.2304 },
    { q: -13, r: 15, name: 'Odessa', lat: 46.4825, lon: 30.7233 },
    { q: -12, r: 18, name: 'Sevastopol', lat: 44.6167, lon: 33.5254 },
    { q: -18, r: 18, name: 'Bucharest', lat: 44.4268, lon: 26.1025 },
    { q: -5,  r: 14, name: 'Rostov', lat: 47.2357, lon: 39.7015 },
    { q:  0,  r: 12, name: 'Stalingrad', lat: 48.7080, lon: 44.5133 },
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

    for (let q = -21; q <= 7; q++) {
        for (let r = -8; r <= 22; r++) {
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
