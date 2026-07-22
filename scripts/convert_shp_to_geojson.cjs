#!/usr/bin/env node
const fs = require('fs');
const shapefile = require('shapefile');

async function convert(inPath, outPath) {
  const fc = await shapefile.read(inPath);
  fs.writeFileSync(outPath, JSON.stringify(fc));
  console.log(`Wrote ${fc.features.length} features to ${outPath}`);
}

if (require.main === module) {
  const inPath = process.argv[2];
  const outPath = process.argv[3] || (inPath.replace(/\.shp$/i, '') + '.geojson');
  if (!inPath) {
    console.error('Usage: node scripts/convert_shp_to_geojson.cjs <input.shp> <output.geojson>');
    process.exit(2);
  }
  convert(inPath, outPath).catch(err => { console.error(err); process.exit(1); });
}
