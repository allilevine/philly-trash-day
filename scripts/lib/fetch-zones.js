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

  const features = raw.features.map((feature) => {
    const p = feature.properties;
    const zoneId = (p.disday || '').toLowerCase();
    const trashDay = (p.collday || '').toUpperCase();
    const rawSecondary = p.secondary_rubbish_day;
    const secondTrashDay =
      rawSecondary && rawSecondary.trim() !== '' ? rawSecondary.toUpperCase() : null;
    const sandis = (p.sandis || '').toUpperCase();

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
