import { simplify } from '@turf/simplify';

const GEOJSON_URL =
  'https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/Rubbish_Recyc_Coll_Bnd/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson';

/**
 * Fetches the OpenDataPhilly sanitation boundary GeoJSON, normalizes properties
 * to the Zone schema, and simplifies geometries.
 *
 * @returns {Promise<{ geojson: FeatureCollection, index: Record<string, Zone> }>}
 */
export async function fetchAndNormalizeZones() {
  const res = await fetch(GEOJSON_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch zones: ${res.status} ${res.statusText}`);
  }
  const raw = await res.json();

  const index = {};

  const features = raw.features
    .filter((feature) => {
      // Skip features with no valid collection day (malformed source data)
      const collday = (feature.properties?.collday || '').trim();
      return collday.length > 0;
    })
    .map((feature) => {
      const p = feature.properties;
      const trashDay = p.collday.trim().toUpperCase();
      const sandis = (p.sandis || '').trim().toUpperCase();
      const zoneId = `${sandis.toLowerCase()}${trashDay.toLowerCase()}`;
      const rawSecondary = p.secondary_rubbish_day;
      const secondTrashDay =
        rawSecondary && rawSecondary.trim() !== '' ? rawSecondary.trim().toUpperCase() : null;

      const zone = { zoneId, trashDay, secondTrashDay, sandis };
      index[zoneId] = zone;

      return {
        ...feature,
        properties: zone,
      };
    });

  const geojson = simplify(
    { ...raw, features },
    { tolerance: 0.0001, highQuality: false, mutate: false }
  );

  return { geojson, index };
}
