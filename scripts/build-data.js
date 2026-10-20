import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchAndNormalizeZones } from './lib/fetch-zones.js';
import { generateZoneIcal } from './lib/ical-generator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function readJson(relPath) {
  return JSON.parse(readFileSync(join(root, relPath), 'utf8'));
}

const holidaysRaw = readJson('src/data/holidays.json');
const overrides = readJson('src/data/holiday-overrides.json');

// Flatten all holiday dates across years into a single array
const holidays = Object.values(holidaysRaw).flat();

console.log(`[build-data] Fetching zone data…`);
const { geojson, index } = await fetchAndNormalizeZones();
console.log(`[build-data] ${geojson.features.length} features, ${Object.keys(index).length} zones`);

// Write zone-index.json to src/data (imported at build time by ZoneTable.astro)
mkdirSync(join(root, 'src/data'), { recursive: true });
writeFileSync(join(root, 'src/data/zone-index.json'), JSON.stringify(index, null, 2));

// Write runtime-fetched files to public/data (served as static assets by Astro)
const publicDataDir = join(root, 'public/data');
mkdirSync(publicDataDir, { recursive: true });
writeFileSync(join(publicDataDir, 'zones.geojson'), JSON.stringify(geojson));
writeFileSync(join(publicDataDir, 'holidays.json'), readFileSync(join(root, 'src/data/holidays.json')));
writeFileSync(join(publicDataDir, 'holiday-overrides.json'), readFileSync(join(root, 'src/data/holiday-overrides.json')));
console.log(`[build-data] Wrote zone-index.json, public/data/zones.geojson, holidays.json, holiday-overrides.json`);

// Deduplicate by unique (trashDay, secondTrashDay) schedule — one iCal feed per schedule type
const seen = new Set();
const uniqueZones = [];
for (const zone of Object.values(index)) {
  const key = `${zone.trashDay}|${zone.secondTrashDay ?? ''}`;
  if (!seen.has(key)) {
    seen.add(key);
    // Use a feed-friendly zoneId: e.g. "tue" or "tue-fri"
    const feedId = zone.secondTrashDay
      ? `${zone.trashDay.toLowerCase()}-${zone.secondTrashDay.toLowerCase()}`
      : zone.trashDay.toLowerCase();
    uniqueZones.push({ ...zone, feedId });
  }
}
console.log(`[build-data] ${uniqueZones.length} unique schedule types → iCal feeds`);

// Generate iCal files
const feedsDir = join(root, 'public/feeds');
mkdirSync(feedsDir, { recursive: true });

const today = new Date();
const twoYearsOut = new Date(today);
twoYearsOut.setFullYear(twoYearsOut.getFullYear() + 2);

for (const zone of uniqueZones) {
  const ics = generateZoneIcal(zone, holidays, overrides, today, twoYearsOut);
  writeFileSync(join(feedsDir, `${zone.feedId}.ics`), ics);
}
console.log(`[build-data] Wrote ${uniqueZones.length} .ics files to public/feeds/`);
