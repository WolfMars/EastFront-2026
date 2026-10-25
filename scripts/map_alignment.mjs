import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(resolve(root, 'src/map.ts'), 'utf8');
const cityBlock = source.match(/const BOARD_CITIES: BoardCity\[\] = \[([\s\S]*?)\n\];/);
if (!cityBlock) throw new Error('Could not find BOARD_CITIES in src/map.ts');

const cityPattern = /^\s*\{\s*q:\s*(-?\d+),\s*r:\s*(-?\d+),\s*name:\s*'([^']+)',\s*lat:\s*(-?\d+(?:\.\d+)?),\s*lon:\s*(-?\d+(?:\.\d+)?)\s*\},?\s*$/;
const cityLines = cityBlock[1].split(/\r?\n/).filter((line) => line.includes('{'));
const cities = cityLines.map((line) => {
    const match = line.match(cityPattern);
    if (!match) throw new Error(`Could not parse city record: ${line.trim()}`);
    const [, q, r, name, lat, lon] = match;
    const city = { q: Number(q), r: Number(r), name, lat: Number(lat), lon: Number(lon) };
    if (city.lat < -90 || city.lat > 90 || city.lon < -180 || city.lon > 180) {
        throw new Error(`Invalid latitude/longitude for ${city.name}`);
    }
    return city;
});
if (cities.length < 3) throw new Error(`Expected at least 3 cities, found ${cities.length}`);

const HEX_SIZE_KM = 80;
const EARTH_RADIUS_KM = 6371.0088;
const anchor = cities.find((city) => city.name === 'Moscow');
if (!anchor) throw new Error('Moscow must remain the fixed (0, 0) projection anchor');
const radians = (degrees) => degrees * Math.PI / 180;
const localXY = (city) => ({
    x: EARTH_RADIUS_KM * radians(city.lon - anchor.lon) * Math.cos(radians(anchor.lat)),
    y: EARTH_RADIUS_KM * radians(city.lat - anchor.lat),
});

const axialXY = (city) => ({
    x: HEX_SIZE_KM * (city.q + city.r / 2),
    y: -HEX_SIZE_KM * Math.sqrt(3) / 2 * city.r,
});
function roundAxial(q, r) {
    let x = Math.round(q);
    let z = Math.round(r);
    let y = Math.round(-q - r);
    const xError = Math.abs(x - q);
    const yError = Math.abs(y - (-q - r));
    const zError = Math.abs(z - r);
    if (xError > yError && xError > zError) x = -y - z;
    else if (yError > zError) y = -x - z;
    else z = -x - y;
    return { q: x, r: z };
}

function projectToHex(city) {
    const point = localXY(city);
    const r = -point.y / (HEX_SIZE_KM * Math.sqrt(3) / 2);
    const q = point.x / HEX_SIZE_KM - r / 2;
    return roundAxial(q, r);
}

function haversineKm(a, b) {
    const lat1 = radians(a.lat);
    const lat2 = radians(b.lat);
    const deltaLat = lat2 - lat1;
    const deltaLon = radians(b.lon - a.lon);
    const h = Math.sin(deltaLat / 2) ** 2
        + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

const cityResults = cities.map((city) => {
    const projected = projectToHex(city);
    const residual = localXY(city);
    const predicted = axialXY(city);
    const residualKm = Math.hypot(residual.x - predicted.x, residual.y - predicted.y);
    return {
        ...city,
        projected,
        deltaQ: projected.q - city.q,
        deltaR: projected.r - city.r,
        residualKm,
    };
});

const pairs = [];
for (let i = 0; i < cities.length; i++) {
    for (let j = i + 1; j < cities.length; j++) {
        const a = cities[i];
        const b = cities[j];
        const dq = b.q - a.q;
        const dr = b.r - a.r;
        const mapKm = HEX_SIZE_KM * Math.sqrt(dq * dq + dq * dr + dr * dr);
        const realKm = haversineKm(a, b);
        const errorPct = (mapKm - realKm) / realKm * 100;
        pairs.push({ a: a.name, b: b.name, mapKm, realKm, errorPct });
    }
}
pairs.sort((a, b) => Math.abs(b.errorPct) - Math.abs(a.errorPct));

const meanAbsError = pairs.reduce((sum, pair) => sum + Math.abs(pair.errorPct), 0) / pairs.length;
const meanSignedError = pairs.reduce((sum, pair) => sum + pair.errorPct, 0) / pairs.length;
const within25Pct = pairs.filter((pair) => Math.abs(pair.errorPct) <= 25).length;
const offsetCities = cityResults.filter((city) => city.deltaQ !== 0 || city.deltaR !== 0).length;

console.log(`Cities: ${cities.length}; pairs: ${pairs.length}; assumed hex spacing: ${HEX_SIZE_KM} km`);
console.log(`Projection anchor: Moscow at (0,0); grid orientation: north-up`);
console.log(`Mean absolute pair error: ${meanAbsError.toFixed(1)}%; mean signed pair error: ${meanSignedError.toFixed(1)}%`);
console.log(`Pairs within 25% distance error: ${within25Pct}/${pairs.length}; cities whose nearest projected hex differs: ${offsetCities}/${cities.length}`);
console.log('\nCity offsets (current hex -> nearest geographic projection; residual from current hex center):');
console.log('City                 Current   Suggested   Offset(q,r)   Residual km');
for (const city of cityResults) {
    const name = city.name.padEnd(20);
    const current = `(${city.q},${city.r})`.padEnd(10);
    const suggested = `(${city.projected.q},${city.projected.r})`.padEnd(12);
    const offset = `(${city.deltaQ},${city.deltaR})`.padEnd(14);
    console.log(`${name} ${current} ${suggested} ${offset} ${city.residualKm.toFixed(1)}`);
}

console.log('\nLargest absolute all-pairs distance errors:');
console.log('City pair                         Map km   Real km   Error');
for (const pair of pairs.slice(0, 10)) {
    const name = `${pair.a} - ${pair.b}`.padEnd(33);
    const mapKm = pair.mapKm.toFixed(0).padStart(6);
    const realKm = pair.realKm.toFixed(0).padStart(8);
    const error = `${pair.errorPct >= 0 ? '+' : ''}${pair.errorPct.toFixed(1)}%`.padStart(8);
    console.log(`${name} ${mapKm} ${realKm} ${error}`);
}
