#!/usr/bin/env node
// scripts/generate_rivers.js
// Usage:
//   node scripts/generate_rivers.js <rivers.geojson> [output.json] [centerLon centerLat hexSizeKm]
// If you want Natural Earth data, download and convert the shapefile to GeoJSON first
// (e.g. using `ogr2ogr -f GeoJSON rivers.geojson ne_10m_rivers_lake_centerlines.shp`).
// Example:
//   npm install @turf/turf
//   node scripts/generate_rivers.js rivers.geojson rivers-sidekeys.json 30 54 80

const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

if (process.argv.length < 3) {
    console.error('Usage: node scripts/generate_rivers.js <rivers.geojson> [output.json] [centerLon centerLat hexSizeKm]');
    process.exit(2);
}

const inputPath = process.argv[2];
const outputPath = process.argv[3] || 'rivers-sidekeys.json';
const centerLon = Number(process.argv[4] || 30);
const centerLat = Number(process.argv[5] || 54);
const hexSizeKm = Number(process.argv[6] || 80);

// Grid bounds matching the game's BOARD ranges in src/map.ts
const Q_MIN = -18, Q_MAX = 7, R_MIN = -8, R_MAX = 18;

function canonicalSideKey(a, b) {
    if (a.q < b.q || (a.q === b.q && a.r < b.r)) return `${a.q},${a.r}|${b.q},${b.r}`;
    return `${b.q},${b.r}|${a.q},${a.r}`;
}

function axialToLonLat(q, r, centerLon, centerLat, hexSizeKm) {
    // approximate degrees per km at center latitude
    const degPerKmLat = 1 / 111.0;
    const degPerKmLon = 1 / (111.0 * Math.cos((centerLat * Math.PI) / 180));
    const sqrt3 = Math.sqrt(3);
    const xKm = hexSizeKm * (sqrt3 * q + (sqrt3 / 2) * r);
    const yKm = hexSizeKm * (3 / 2 * r);
    const lon = centerLon + xKm * degPerKmLon;
    const lat = centerLat + yKm * degPerKmLat;
    return [lon, lat];
}

function hexVertexLonLat(q, r, i, centerLon, centerLat, hexSizeKm) {
    // pointy-top vertices at angle (PI/3)*(i+0.5)
    const angle = (Math.PI / 3) * (i + 0.5);
    const sqrt3 = Math.sqrt(3);
    // convert vertex offset in km from axial coordinates
    const dxKm = hexSizeKm * Math.cos(angle);
    const dyKm = hexSizeKm * Math.sin(angle);

    // We need to convert local dx/dy (km) to lon/lat degrees.
    // Compute center lon/lat for hex
    const [centerLonHex, centerLatHex] = axialToLonLat(q, r, centerLon, centerLat, hexSizeKm);
    const degPerKmLat = 1 / 111.0;
    const degPerKmLon = 1 / (111.0 * Math.cos((centerLat * Math.PI) / 180));

    // Note: dx is in east direction, dy is north direction (y increases northwards here)
    const lon = centerLonHex + dxKm * degPerKmLon;
    const lat = centerLatHex + dyKm * degPerKmLat;
    return [lon, lat];
}

// Load rivers GeoJSON
let geo;
try {
    geo = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (e) {
    console.error('Failed to read or parse GeoJSON:', e.message);
    process.exit(3);
}

const riverFeatures = [];
for (const f of geo.features || []) {
    if (f.geometry && (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString')) {
        riverFeatures.push(f);
    }
}

console.log(`Loaded ${riverFeatures.length} river features`);

const sideKeys = new Set();

for (let q = Q_MIN; q <= Q_MAX; q++) {
    for (let r = R_MIN; r <= R_MAX; r++) {
        // build vertices
        const verts = [];
        for (let i = 0; i < 6; i++) {
            verts.push(hexVertexLonLat(q, r, i, centerLon, centerLat, hexSizeKm));
        }

        // edges are pairs (i, (i+1)%6)
        for (let i = 0; i < 6; i++) {
            const a = verts[i];
            const b = verts[(i + 1) % 6];
            const edgeLine = turf.lineString([a, b]);

            // test intersection with any river feature
            let intersects = false;
            for (const f of riverFeatures) {
                if (turf.booleanDisjoint(edgeLine, f)) continue;
                // not disjoint => intersect or touch
                // To avoid false positives from very distant features, test bbox first
                const bboxEdge = turf.bbox(edgeLine);
                const bboxFeat = turf.bbox(f);
                // quick bbox overlap
                if (bboxEdge[2] < bboxFeat[0] || bboxEdge[0] > bboxFeat[2] || bboxEdge[3] < bboxFeat[1] || bboxEdge[1] > bboxFeat[3]) {
                    continue;
                }

                const inter = turf.lineIntersect(edgeLine, f);
                if (inter.features && inter.features.length > 0) {
                    intersects = true;
                    break;
                }
                // fallback: check distance from midpoint to feature
                const mid = turf.midpoint(turf.point(a), turf.point(b));
                const nearest = turf.nearestPointOnLine(f, mid, { units: 'kilometers' });
                if (nearest && nearest.properties && nearest.properties.dist !== undefined) {
                    const distKm = nearest.properties.dist || 0;
                    if (distKm < 0.5) { // within 0.5 km
                        intersects = true;
                        break;
                    }
                }
            }

            if (intersects) {
                // compute neighbor axial coordinate for this edge
                // Find neighbor cube: use the same direction ordering as game's computeReachableCosts
                // Directions mapping for pointy-top axial: [ (1,0), (-1,0), (0,1), (0,-1), (1,-1), (-1,1) ]
                // We need to map edge index to direction. The hex vertex ordering used here matches main.ts angles.
                // We'll compute neighbor by testing candidate neighbors and choosing the one whose edge matches the same segment.
                const neighborCandidates = [
                    { q: q + 1, r: r },
                    { q: q - 1, r: r },
                    { q: q, r: r + 1 },
                    { q: q, r: r - 1 },
                    { q: q + 1, r: r - 1 },
                    { q: q - 1, r: r + 1 },
                ];

                // For each candidate, compute its verts and see if it shares this exact edge (within tolerance)
                let chosenNeighbor = null;
                for (const nc of neighborCandidates) {
                    if (nc.q < Q_MIN || nc.q > Q_MAX || nc.r < R_MIN || nc.r > R_MAX) continue;
                    const nverts = [];
                    for (let j = 0; j < 6; j++) nverts.push(hexVertexLonLat(nc.q, nc.r, j, centerLon, centerLat, hexSizeKm));
                    // check if any nverts edge matches our edge (a,b or b,a)
                    for (let j = 0; j < 6; j++) {
                        const na = nverts[j];
                        const nb = nverts[(j + 1) % 6];
                        const da = Math.hypot(na[0] - a[0], na[1] - a[1]);
                        const db = Math.hypot(nb[0] - b[0], nb[1] - b[1]);
                        const da2 = Math.hypot(na[0] - b[0], na[1] - b[1]);
                        const db2 = Math.hypot(nb[0] - a[0], nb[1] - a[1]);
                        if ((da < 1e-6 && db < 1e-6) || (da2 < 1e-6 && db2 < 1e-6)) {
                            chosenNeighbor = nc;
                            break;
                        }
                    }
                    if (chosenNeighbor) break;
                }

                if (chosenNeighbor) {
                    const key = canonicalSideKey({ q, r }, chosenNeighbor);
                    sideKeys.add(key);
                } else {
                    // If no neighbor found (edge at map border), still add key using a placeholder neighbor computed from angle
                    // attempt to compute neighbor using dir index mapping: map edge index to direction
                    const dirMap = [ {q:1,r:0}, {q:0,r:1}, {q:-1,r:1}, {q:-1,r:0}, {q:0,r:-1}, {q:1,r:-1} ];
                    const d = dirMap[i % dirMap.length];
                    const nc = { q: q + d.q, r: r + d.r };
                    const key = canonicalSideKey({ q, r }, nc);
                    sideKeys.add(key);
                }
            }
        }
    }
}

const out = { rivers: Array.from(sideKeys).sort() };
fs.writeFileSync(outputPath, JSON.stringify(out, null, 2), 'utf8');
console.log(`Wrote ${out.rivers.length} river side keys to ${outputPath}`);
