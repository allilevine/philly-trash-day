import { geocodeAddress, lookupZone, getCoordinatesFromBrowser } from './geocode.js';
import { getPickupStatus } from './schedule.js';
import { count } from './count.js';

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
  const [zonesData, holidaysRaw, overridesData] = await Promise.all([
    geojsonRes.json(),
    holidaysRes.json(),
    overridesRes.json(),
  ]);
  zonesGeojson = zonesData;
  holidays = Object.values(holidaysRaw).flat();
  overrides = overridesData;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shiftISO(dateStr, days) {
  const [y, m, day] = dateStr.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatRelativeDate(isoDate) {
  const today = todayISO();
  if (isoDate === today) return 'today';
  if (isoDate === shiftISO(today, 1)) return 'tomorrow';
  const [y, m, day] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, day);
  const [ty, tm, td] = today.split('-').map(Number);
  const daysAway = Math.round((date - new Date(ty, tm - 1, td)) / 86400000);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  if (daysAway < 7) return `this ${dayName}`;
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function render(state, data = {}) {
  const states = ['initial', 'loading', 'result', 'error'];
  for (const s of states) {
    const el = document.querySelector(`[data-state="${s}"]`);
    if (el) el.style.display = s === state ? '' : 'none';
  }

  if (state === 'result' && data.status && data.zone) {
    const { status, zone } = data;
    const todayEl = document.getElementById('result-today');
    const upcomingEl = document.getElementById('result-upcoming');
    const calLink = document.getElementById('result-cal-link');

    if (todayEl) {
      if (status.isTrashDay) {
        todayEl.textContent = 'Yes — put your bins out today.';
        todayEl.dataset.answer = 'yes';
      } else if (status.isSecondTrashDay) {
        todayEl.textContent = 'Yes — trash only today (no recycling).';
        todayEl.dataset.answer = 'yes';
      } else {
        todayEl.textContent = 'No — not your pickup day.';
        todayEl.dataset.answer = 'no';
      }
    }

    if (upcomingEl) {
      upcomingEl.innerHTML = '';

      if (status.isTrashDay || status.isSecondTrashDay) {
        // On a pickup day — show what's next
        if (status.nextTrashDate) {
          const p = document.createElement('p');
          p.className = 'result-detail';
          p.textContent = `Next trash & recycling pickup: ${formatRelativeDate(status.nextTrashDate)}`;
          upcomingEl.appendChild(p);
        }
      } else {
        // Not a pickup day — show the soonest upcoming pickup(s)
        const primary = status.nextTrashDate
          ? { date: status.nextTrashDate, label: 'trash & recycling' }
          : null;
        const secondary = status.nextSecondTrashDate
          ? { date: status.nextSecondTrashDate, label: 'trash only (no recycling)' }
          : null;

        // Sort by date, soonest first
        const pickups = [primary, secondary]
          .filter(Boolean)
          .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

        pickups.forEach((pickup, i) => {
          const p = document.createElement('p');
          p.className = i === 0 ? 'result-upcoming-primary' : 'result-detail';
          p.textContent = i === 0
            ? `Next pickup: ${formatRelativeDate(pickup.date)} — ${pickup.label}`
            : `Then: ${formatRelativeDate(pickup.date)} — ${pickup.label}`;
          upcomingEl.appendChild(p);
        });
      }
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

async function handleLookup(lat, lon, source) {
  render('loading');
  const zone = lookupZone(lat, lon, zonesGeojson);
  if (!zone) {
    count('outside-philly');
    render('error', { message: 'Address is outside Philadelphia.' });
    return;
  }
  const status = getPickupStatus(zone, todayISO(), holidays, overrides);
  count(`${source}-ok`);
  render('result', { status, zone });
}

async function handleAddressSubmit(address) {
  render('loading');
  try {
    const coords = await geocodeAddress(address);
    if (!coords) {
      count('address-not-found');
      render('error', { message: 'Address not found. Try including the street number and city.' });
      return;
    }
    await handleLookup(coords.lat, coords.lon, 'address');
  } catch {
    count('address-error');
    render('error', { message: 'Something went wrong. Check your connection and try again.' });
  }
}

async function handleGeolocate() {
  render('loading');
  try {
    const coords = await getCoordinatesFromBrowser();
    await handleLookup(coords.lat, coords.lon, 'geo');
  } catch {
    count('geo-denied');
    render('error', { message: 'Location access denied. Enter your address instead.' });
  }
}

// Boot
(async () => {
  try {
    await loadData();
  } catch {
    render('error', { message: 'Failed to load schedule data. Please refresh the page.' });
    return;
  }

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
