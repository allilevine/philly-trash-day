import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

/**
 * Geocodes an address string to coordinates using Nominatim.
 * Returns null if no result is found.
 *
 * @param {string} address
 * @returns {Promise<{lat: number, lon: number}|null>}
 */
export async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=us`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'phillytrashday.com/1.0' },
  });
  const results = await res.json();
  if (!results.length) return null;
  return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
}

/**
 * Finds the collection zone for a coordinate pair using point-in-polygon.
 * Returns null if coordinates fall outside all zone polygons.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {object} geojson - zones FeatureCollection
 * @returns {object|null} Zone properties or null
 */
export function lookupZone(lat, lon, geojson) {
  const pt = point([lon, lat]);
  for (const feature of geojson.features) {
    if (booleanPointInPolygon(pt, feature)) {
      return feature.properties;
    }
  }
  return null;
}

/**
 * Requests the browser's current position.
 * Rejects if geolocation is unavailable or permission is denied.
 *
 * @returns {Promise<{lat: number, lon: number}>}
 */
export function getCoordinatesFromBrowser() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not available in this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(err.message || 'Location access denied'))
    );
  });
}
