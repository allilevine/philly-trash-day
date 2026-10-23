// First-party usage counters.
//
// Each event is a GET for a 1-byte file under /e/, so it shows up as a path in
// the Space's own request analytics. No identifiers, no cookies, no third-party
// script — just a tally per outcome, which is all the server-side view counts
// can't tell us (how many lookups actually resolve).

const EVENTS = new Set([
  'address-ok',
  'address-not-found',
  'address-error',
  'outside-philly',
  'geo-ok',
  'geo-denied',
  'data-error',
]);

export function count(event) {
  // Guard against a typo quietly becoming a 404 that never gets counted.
  if (!EVENTS.has(event)) return;
  try {
    // no-store, so a second event in the same session is a fresh request
    // rather than a browser cache hit the analytics never see.
    fetch(`/e/${event}`, { cache: 'no-store', keepalive: true }).catch(() => {});
  } catch {
    // A counter must never break a lookup.
  }
}
