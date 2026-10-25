# philly-trash-day

**https://phillytrashday.com**

Enter your Philadelphia address to find out if today is your trash and recycling pickup day. Includes a calendar subscription feed that automatically accounts for holiday delays.

## Setup

```sh
npm install
```

Before the first dev run or build, fetch the zone boundary data from OpenDataPhilly:

```sh
node scripts/build-data.js
```

This writes `public/data/zones.geojson`, `public/data/holidays.json`, `public/data/holiday-overrides.json`, `public/feeds/*.ics`, and `src/data/zone-index.json`. These files are git-ignored and must be generated locally.

## Development

```sh
npm run dev
```

Starts the Astro dev server at `http://localhost:4321`.

## Build

```sh
npm run build
```

Runs `build-data.js` automatically (via the `prebuild` script), then produces a fully static site in `dist/`.

## Preview

```sh
npm run preview
```

Serves the `dist/` output locally to check the production build.

## Tests

```sh
npm test
```
