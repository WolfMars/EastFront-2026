#!/usr/bin/env node
// scripts/river_tool.mjs
//
// River authoring helper. Implements the hexside-CORNER model described in
// docs/RIVER_CREATION_GUIDE.md. Two river hexsides are connected if and only if
// they share a hex CORNER (the point where three hexes meet) - never merely a hex.
//
// Usage:
//   node scripts/river_tool.mjs corners  "<side>"            list the two corners of a hexside
//   node scripts/river_tool.mjs path     "<start>" "<end>"   shortest corner-connected chain
//   node scripts/river_tool.mjs validate [RiverName]         check river(s) in data/rivers-sidekeys.json
//   node scripts/river_tool.mjs regen    <RiverName>         rebuild river from its first/last listed side and compare
//   node scripts/river_tool.mjs selftest                     cross-check corner model against the renderer geometry
//
// Side format: "q,r|q,r" (the "//" separator is also accepted on the command line).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RIVER_FILE = path.join(ROOT, 'data', 'rivers-sidekeys.json');

// Map bounds, matching BOARD_ROWS in src/map.ts.
const Q_MIN = -21, Q_MAX = 7, R_MIN = -8, R_MAX = 18;

// Same order as HEX_DIRS in src/main.ts: E, SE, SW, W, NW, NE.
// Consecutive entries (cyclically) are mutually adjacent hexes around a centre hex.
const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];

// ---------- hex / side / corner model (exact integer logic, no floats) ----------

const hexKey = (h) => `${h.q},${h.r}`;
const parseHex = (s) => { const [q, r] = s.split(',').map(Number); return { q, r }; };
const inBounds = (h) => h.q >= Q_MIN && h.q <= Q_MAX && h.r >= R_MIN && h.r <= R_MAX;
const hexLess = (a, b) => a.q < b.q || (a.q === b.q && a.r < b.r);

function parseSide(text) {
    const m = /^\s*(-?\d+)\s*,\s*(-?\d+)\s*(?:\||\/\/)\s*(-?\d+)\s*,\s*(-?\d+)\s*$/.exec(text);
    if (!m) throw new Error(`Bad side format: "${text}" (expected "q,r|q,r")`);
    return [{ q: +m[1], r: +m[2] }, { q: +m[3], r: +m[4] }];
}

function canon(a, b) {
    const [f, s] = hexLess(a, b) ? [a, b] : [b, a];
    return `${hexKey(f)}|${hexKey(s)}`;
}

function canonText(text) {
    const [a, b] = parseSide(text);
    return canon(a, b);
}

/** Index i such that b = a + DIRS[i], or -1 if a and b are not adjacent. */
function dirIndex(a, b) {
    return DIRS.findIndex(([dq, dr]) => a.q + dq === b.q && a.r + dr === b.r);
}

/** The two corners of a hexside. A corner is identified by the three hexes meeting there. */
function sideCorners(side) {
    const [a, b] = parseSide(side);
    const i = dirIndex(a, b);
    if (i < 0) throw new Error(`Not a hexside (hexes are not adjacent): ${side}`);
    const c1 = { q: a.q + DIRS[(i + 5) % 6][0], r: a.r + DIRS[(i + 5) % 6][1] };
    const c2 = { q: a.q + DIRS[(i + 1) % 6][0], r: a.r + DIRS[(i + 1) % 6][1] };
    return [c1, c2].map((c) => cornerId(a, b, c));
}

function cornerId(a, b, c) {
    return [a, b, c].sort((x, y) => (hexLess(x, y) ? -1 : hexLess(y, x) ? 1 : 0)).map(hexKey).join(';');
}

/** The three hexsides that meet at a corner. */
function cornerSides(corner) {
    const [a, b, c] = corner.split(';').map(parseHex);
    return [canon(a, b), canon(a, c), canon(b, c)];
}

const sideInBounds = (side) => parseSide(side).every(inBounds);

/**
 * Deterministic ordering used to break ties between equally short chains:
 * by first hex (q, then r), then by direction of the second hex (E, SE, NE).
 */
function tieBreakKey(side) {
    const [a, b] = parseSide(side);
    const rank = b.q === a.q + 1 && b.r === a.r ? 0 : b.q === a.q && b.r === a.r + 1 ? 1 : 2;
    return [a.q, a.r, rank];
}

function compareSides(x, y) {
    const kx = tieBreakKey(x), ky = tieBreakKey(y);
    for (let i = 0; i < 3; i++) if (kx[i] !== ky[i]) return kx[i] - ky[i];
    return 0;
}

/** Hexsides sharing a corner with the given one (excluding itself), with the shared corner. */
function sideNeighbors(side) {
    const out = [];
    for (const corner of sideCorners(side)) {
        for (const other of cornerSides(corner)) {
            if (other !== side && sideInBounds(other)) out.push({ side: other, corner });
        }
    }
    return out.sort((x, y) => compareSides(x.side, y.side));
}

// ---------- path search ----------

/** Shortest corner-connected chain. Also reports how many equally short chains exist. */
function shortestPath(start, end) {
    const dist = new Map([[start, 0]]);
    const ways = new Map([[start, 1]]);
    const parent = new Map([[start, null]]);
    const queue = [start];
    for (let head = 0; head < queue.length; head++) {
        const cur = queue[head];
        for (const { side: n } of sideNeighbors(cur)) {
            if (!dist.has(n)) {
                dist.set(n, dist.get(cur) + 1);
                ways.set(n, 0);
                parent.set(n, cur);
                queue.push(n);
            }
            if (dist.get(n) === dist.get(cur) + 1) ways.set(n, ways.get(n) + ways.get(cur));
        }
    }
    if (!dist.has(end)) return null;
    const chain = [];
    for (let s = end; s !== null; s = parent.get(s)) chain.push(s);
    return { chain: chain.reverse(), equallyShort: ways.get(end) };
}

// ---------- validation ----------

function validateRiver(segments) {
    const errors = [];
    const warnings = [];
    const seen = new Set();
    const sides = [];

    for (const text of segments) {
        let side;
        try {
            side = canonText(text);
            sideCorners(side); // throws if not adjacent
        } catch (e) {
            errors.push(e.message);
            continue;
        }
        if (side !== text) warnings.push(`not in canonical form: "${text}" (canonical: "${side}")`);
        if (!sideInBounds(side)) errors.push(`outside map bounds: ${side}`);
        if (seen.has(side)) errors.push(`duplicate side: ${side}`);
        seen.add(side);
        sides.push(side);
    }

    // corner usage inside this river
    const cornerUse = new Map();
    for (const s of sides) {
        for (const c of sideCorners(s)) cornerUse.set(c, (cornerUse.get(c) ?? []).concat(s));
    }
    for (const [c, used] of cornerUse) {
        if (used.length > 2) errors.push(`branch: ${used.length} sides meet at corner ${c}: ${used.join(', ')}`);
    }
    const ends = [...cornerUse].filter(([, used]) => used.length === 1);

    // connectivity (order independent)
    const set = new Set(sides);
    const visited = new Set();
    const pieces = [];
    for (const s of sides) {
        if (visited.has(s)) continue;
        const piece = [s];
        const stack = [s];
        visited.add(s);
        while (stack.length) {
            const cur = stack.pop();
            for (const c of sideCorners(cur)) {
                for (const o of cornerSides(c)) {
                    if (set.has(o) && !visited.has(o)) { visited.add(o); stack.push(o); piece.push(o); }
                }
            }
        }
        pieces.push(piece);
    }
    const components = pieces.length;
    if (components > 1) {
        errors.push(`river is ${components} disconnected pieces (must be one chain):`);
        pieces.forEach((p, i) => errors.push(`  piece ${i + 1}: ${p.length} sides, e.g. ${p.slice(0, 3).join('  ')}`));
    }
    if (components === 1 && ends.length !== 2 && ends.length !== 0) {
        errors.push(`expected 2 open ends (or 0 for a loop), found ${ends.length}`);
    }

    // is the listed order itself a chain?
    let listedInOrder = true;
    for (let i = 1; i < sides.length; i++) {
        const shared = sideCorners(sides[i - 1]).filter((c) => sideCorners(sides[i]).includes(c));
        if (shared.length === 0) { listedInOrder = false; break; }
    }
    return { errors, warnings, count: sides.length, components, ends: ends.map(([, u]) => u[0]), listedInOrder };
}

// ---------- self test against renderer geometry ----------

function selfTest() {
    // Reproduces the geometry used by drawRivers() in src/main.ts: hex centre via hexToPixel,
    // vertices at angle (PI/3)*(i+0.5), hexside between neighbours = vertices v1,v2 of HEX_DIRS.
    const V = [[5, 0], [0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]; // v1,v2 per DIRS entry
    const sqrt3 = Math.sqrt(3);
    const vertex = (h, i) => {
        const cx = sqrt3 * h.q + (sqrt3 / 2) * h.r;
        const cy = 1.5 * h.r;
        const a = (Math.PI / 3) * (i + 0.5);
        // snap to the integer lattice (x in units of sqrt3/2, y in units of 1/2) to avoid float noise
        return `${Math.round((cx + Math.cos(a)) / (sqrt3 / 2))},${Math.round((cy + Math.sin(a)) * 2)}`;
    };
    const byVertex = new Map();
    const sideSet = new Set();
    for (let q = Q_MIN; q <= Q_MAX; q++) {
        for (let r = R_MIN; r <= R_MAX; r++) {
            const h = { q, r };
            DIRS.forEach(([dq, dr], d) => {
                const n = { q: q + dq, r: r + dr };
                if (!inBounds(n)) return;
                const side = canon(h, n);
                if (sideSet.has(side)) return;
                sideSet.add(side);
                for (const v of V[d].map((i) => vertex(h, i))) {
                    if (!byVertex.has(v)) byVertex.set(v, new Set());
                    byVertex.get(v).add(side);
                }
            });
        }
    }
    let mismatches = 0;
    for (const side of sideSet) {
        const fromGeometry = new Set();
        for (const sides of byVertex.values()) {
            if (sides.has(side)) for (const o of sides) if (o !== side) fromGeometry.add(o);
        }
        const fromModel = new Set(sideNeighbors(side).map((n) => n.side));
        const same = fromGeometry.size === fromModel.size && [...fromModel].every((s) => fromGeometry.has(s));
        if (!same) {
            if (mismatches++ < 5) console.log(`MISMATCH at ${side}`);
        }
    }
    console.log(`checked ${sideSet.size} hexsides, mismatches: ${mismatches}`);
    return mismatches === 0;
}

// ---------- CLI ----------

function loadRivers() {
    return JSON.parse(fs.readFileSync(RIVER_FILE, 'utf8')).rivers.filter((r) => r && Array.isArray(r.segments));
}

function findRiver(name) {
    const river = loadRivers().find((r) => r.name === name);
    if (!river) throw new Error(`River "${name}" not found in ${path.relative(ROOT, RIVER_FILE)}`);
    return river;
}

function printChain(chain) {
    console.log(chain.map((s, i) => `        "${s}"${i < chain.length - 1 ? ',' : ''}`).join('\n'));
}

function main() {
    const [cmd, ...args] = process.argv.slice(2);
    switch (cmd) {
        case 'corners': {
            const side = canonText(args[0]);
            const corners = sideCorners(side);
            console.log(`side ${side}`);
            for (const c of corners) console.log(`  corner ${c}\n    other hexsides here: ${cornerSides(c).filter((s) => s !== side).join('  ')}`);
            return 0;
        }
        case 'path': {
            const start = canonText(args[0]);
            const end = canonText(args[1]);
            sideCorners(start); sideCorners(end);
            const res = shortestPath(start, end);
            if (!res) { console.log('NO PATH'); return 1; }
            console.log(`${res.chain.length} segments; equally short chains: ${res.equallyShort}`);
            printChain(res.chain);
            return 0;
        }
        case 'validate': {
            const rivers = args[0] ? [findRiver(args[0])] : loadRivers();
            let failed = false;
            for (const r of rivers) {
                const v = validateRiver(r.segments);
                console.log(`${v.errors.length ? 'FAIL' : 'ok  '} ${r.name}: ${v.count} sides, ${v.components} piece(s), listed in chain order: ${v.listedInOrder ? 'yes' : 'no'}`);
                if (!v.errors.length && v.ends.length) console.log(`       open ends: ${v.ends.join('  ')}`);
                v.errors.forEach((e) => console.log(`       error: ${e}`));
                v.warnings.forEach((w) => console.log(`       warn:  ${w}`));
                if (v.errors.length) failed = true;
            }
            return failed ? 1 : 0;
        }
        case 'regen': {
            const river = findRiver(args[0]);
            const stored = river.segments.map(canonText);
            const start = stored[0];
            const end = stored[stored.length - 1];
            const res = shortestPath(start, end);
            if (!res) { console.log('NO PATH'); return 1; }
            const sameSeq = res.chain.length === stored.length && res.chain.every((s, i) => s === stored[i]);
            const sameSet = res.chain.length === stored.length && res.chain.every((s) => stored.includes(s));
            console.log(`${river.name}: start ${start}  end ${end}`);
            console.log(`  stored: ${stored.length} sides, generated: ${res.chain.length} sides, equally short chains: ${res.equallyShort}`);
            console.log(`  identical sequence: ${sameSeq}   same set of sides: ${sameSet}`);
            if (!sameSet) {
                console.log('  only in stored   :', stored.filter((s) => !res.chain.includes(s)).join('  ') || '-');
                console.log('  only in generated:', res.chain.filter((s) => !stored.includes(s)).join('  ') || '-');
            }
            return sameSet ? 0 : 1;
        }
        case 'selftest':
            return selfTest() ? 0 : 1;
        default:
            console.log('Commands: corners | path | validate | regen | selftest (see header of this file)');
            return 2;
    }
}

try {
    process.exitCode = main();
} catch (e) {
    console.error(e.message);
    process.exitCode = 2;
}
