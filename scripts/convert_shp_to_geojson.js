#!/usr/bin/env node
// scripts/convert_shp_to_geojson.js
// Usage: node scripts/convert_shp_to_geojson.js <input.shp> <output.geojson>

const fs = require('fs');
const shapefile = require('shapefile');

async function convert(inPath, outPath) {
  const source = await shapefile.open(inPath);
  const features = [];
  try {
    while (true) {
      const result = await source.read();
      if (result.done) break;
      features.push({ type: 'Feature', properties: result.value.properties, geometry: result.value.geometry });
    }
  } finally {
    if (source) await source.close();
  }
  const fc = { type: 'FeatureCollection', features };
  fs.writeFileSync(outPath, JSON.stringify(fc));
  console.log(`Wrote ${features.length} features to ${outPath}`);
}

if (require.main === module) {
  const inPath = process.argv[2];
  const outPath = process.argv[3] || (inPath.replace(/\.shp$/i, '') + '.geojson');
  if (!inPath) {
    console.error('Usage: node scripts/convert_shp_to_geojson.js <input.shp> <output.geojson>');
    process.exit(2);
  }
  convert(inPath, outPath).catch(err => { console.error(err); process.exit(1); });
}
