/**
 * Fixture regression: geocode each known-good address, run point-in-polygon
 * against zones.geojson, and compare to expected zone data.
 *
 * Run after build-data.js: node scripts/verify-fixture.js
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const fixture = JSON.parse(readFileSync(join(root, 'tests/fixtures/known-good-addresses.json'), 'utf8'));
const geojson = JSON.parse(readFileSync(join(root, 'src/data/zones.geojson'), 'utf8'));

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=us`;
  const res = await fetch(url, { headers: { 'User-Agent': 'phillytrashday.com/1.0' } });
  const results = await res.json();
  if (!results.length) return null;
  return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
}

function lookupZone(lat, lon) {
  const pt = point([lon, lat]);
  for (const feature of geojson.features) {
    if (booleanPointInPolygon(pt, feature)) return feature.properties;
  }
  return null;
}

let pass = 0;
let fail = 0;

for (const entry of fixture.addresses) {
  // Rate-limit Nominatim: 1 req/sec
  await new Promise(r => setTimeout(r, 1100));

  const coords = await geocode(entry.address);
  if (!coords) {
    console.log(`SKIP  ${entry.address} — geocode returned null`);
    continue;
  }

  const zone = lookupZone(coords.lat, coords.lon);
  if (!zone) {
    console.log(`FAIL  ${entry.address} — outside all polygons (${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)})`);
    fail++;
    continue;
  }

  const exp = entry.expected;
  const trashOk = zone.trashDay === exp.trashDay;
  const secondOk = zone.secondTrashDay === exp.secondTrashDay;
  const sandisOk = zone.sandis === exp.sandis;

  if (trashOk && secondOk && sandisOk) {
    console.log(`PASS  ${entry.address}`);
    pass++;
  } else {
    console.log(`FAIL  ${entry.address}`);
    if (!trashOk) console.log(`        trashDay: got ${zone.trashDay}, expected ${exp.trashDay}`);
    if (!secondOk) console.log(`        secondTrashDay: got ${zone.secondTrashDay}, expected ${exp.secondTrashDay}`);
    if (!sandisOk) console.log(`        sandis: got ${zone.sandis}, expected ${exp.sandis}`);
    fail++;
  }
}

console.log(`\n${pass} passed, ${fail} failed out of ${pass + fail} geocoded`);
if (fail > 0) process.exit(1);
