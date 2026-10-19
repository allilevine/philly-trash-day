import { geocodeAddress, lookupZone, getCoordinatesFromBrowser } from './geocode.js';
import { getPickupStatus } from './schedule.js';

// Data loaded once at module init
let zonesGeojson = null;
let holidays = [];
let overrides = {};

async function loadData() {
  const [geojsonRes, holidaysRes, overridesRes] = await Promise.all([
    fetch('/data/zones.geojson'),
    fetch('/data/holidays.json'),
    fetch('/data/holiday-overrides.json'),
  ]);
  zonesGeojson = await geojsonRes.json();
  const holidaysRaw = await holidaysRes.json();
  overrides = await overridesRes.json();
  holidays = Object.values(holidaysRaw).flat();
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function render(state, data = {}) {
  const states = ['initial', 'loading', 'result', 'error'];
  for (const s of states) {
    const el = document.querySelector(`[data-state="${s}"]`);
    if (el) el.style.display = s === state ? '' : 'none';
  }

  if (state === 'result' && data.status && data.zone) {
    const { status, zone } = data;
    const today = document.getElementById('result-today');
    const recycling = document.getElementById('result-recycling');
    const next = document.getElementById('result-next');
    const calLink = document.getElementById('result-cal-link');

    if (today) {
      if (status.isTrashDay) {
        today.textContent = 'Yes — put your bins out today.';
        today.dataset.answer = 'yes';
      } else if (status.isSecondTrashDay) {
        today.textContent = 'Yes — trash only today (no recycling).';
        today.dataset.answer = 'yes';
      } else {
        today.textContent = 'No — not your pickup day.';
        today.dataset.answer = 'no';
      }
    }

    if (recycling) {
      recycling.textContent = status.isRecyclingDay
        ? 'Recycling is collected today.'
        : `Next recycling pickup: ${status.nextTrashDate ?? '—'}`;
    }

    if (next) {
      const lines = [`Next trash pickup: ${status.nextTrashDate ?? '—'}`];
      if (zone.secondTrashDay && status.nextSecondTrashDate) {
        lines.push(`Next second pickup (trash only): ${status.nextSecondTrashDate}`);
      }
      next.textContent = lines.join(' · ');
    }

    if (calLink) {
      const feedId = zone.secondTrashDay
        ? `${zone.trashDay.toLowerCase()}-${zone.secondTrashDay.toLowerCase()}`
        : zone.trashDay.toLowerCase();
      calLink.href = `webcal://${location.host}/feeds/${feedId}.ics`;
    }
  }

  if (state === 'error' && data.message) {
    const el = document.getElementById('error-message');
    if (el) el.textContent = data.message;
  }
}

async function handleLookup(lat, lon) {
  render('loading');
  const zone = lookupZone(lat, lon, zonesGeojson);
  if (!zone) {
    render('error', { message: 'Address is outside Philadelphia.' });
    return;
  }
  const status = getPickupStatus(zone, todayISO(), holidays, overrides);
  render('result', { status, zone });
}

async function handleAddressSubmit(address) {
  render('loading');
  const coords = await geocodeAddress(address);
  if (!coords) {
    render('error', { message: 'Address not found. Try including the street number and city.' });
    return;
  }
  await handleLookup(coords.lat, coords.lon);
}

async function handleGeolocate() {
  render('loading');
  try {
    const coords = await getCoordinatesFromBrowser();
    await handleLookup(coords.lat, coords.lon);
  } catch {
    render('error', { message: 'Location access denied. Enter your address instead.' });
  }
}

// Boot
(async () => {
  await loadData();

  const form = document.getElementById('address-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[name="address"]');
      if (input?.value.trim()) handleAddressSubmit(input.value.trim());
    });
  }

  const geoBtn = document.getElementById('geolocate-btn');
  if (geoBtn) {
    geoBtn.addEventListener('click', handleGeolocate);
  }

  render('initial');
})();
