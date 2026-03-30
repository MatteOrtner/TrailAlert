# Design: Komoot Route Import

**Date:** 2026-03-30

---

## Overview

Extend the `/tour-check` page with a second input method alongside the existing GPX upload: the user pastes a Komoot tour URL, the app fetches the GPX data server-side via a Next.js API proxy, and runs the same collision detection as a normal GPX upload.

**Scope:** Public Komoot tours only. No Komoot OAuth, no private tours, no account required.

---

## Page Layout

The upload area gets a two-tab switch at the top:

- **Tab 1: "GPX hochladen"** — existing drag & drop / click upload, unchanged
- **Tab 2: "Komoot-Link"** — text input for the tour URL + "Laden" button + hint text: *"Nur öffentliche Komoot-Touren werden unterstützt."*

After a successful Komoot fetch, the flow is identical to a GPX upload: the GPX text is passed through the existing `parseGpx()` parser, `routePoints` and `hits` are set, the status banner and warning list appear.

The file info bar (filename + × button) is reused for Komoot too, showing the tour ID (e.g. `Komoot-Tour 123456789`) instead of a filename. Clearing works the same way.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/app/api/komoot/route.ts` | Server-side proxy: fetch GPX from Komoot, return raw text |
| Modify | `src/app/tour-check/TourCheckClient.tsx` | Add tab switch, Komoot URL input, fetch logic |

---

## API Route: `src/app/api/komoot/route.ts`

**GET** `/api/komoot?tourId=123456789`

1. Validates `tourId` is a non-empty numeric string. Returns `400` if not.
2. Fetches `https://www.komoot.com/api/v007/tours/{tourId}.gpx` with header `User-Agent: TrailAlert/1.0`.
3. If Komoot returns non-2xx (tour not found or private) → returns `404` with JSON `{ error: "Tour nicht gefunden oder privat." }`.
4. Returns the raw GPX text as `Content-Type: text/xml`.

No caching, no authentication, no other endpoints.

---

## Client Changes: `TourCheckClient.tsx`

### New state
- `activeTab: 'gpx' | 'komoot'` — which tab is selected (default: `'gpx'`)
- `komootUrl: string` — value of the Komoot URL input
- `komootLoading: boolean` — shows spinner on "Laden" button while fetching

### URL parsing
```ts
function extractTourId(url: string): string | null {
  const match = url.match(/\/tour\/(\d+)/)
  return match ? match[1] : null
}
```
Matches all URL variants: `komoot.com/tour/123`, `komoot.com/de-at/tour/123/details`, `komoot.de/tour/123`, etc.

### Fetch flow
1. User pastes URL + clicks "Laden"
2. `extractTourId()` extracts the ID — if null → `setFileError('Ungültige Komoot-URL.')`
3. `setKomootLoading(true)`, fetch `/api/komoot?tourId={id}`
4. Non-ok response → `setFileError(json.error)` (e.g. "Tour nicht gefunden oder privat.")
5. Network error → `setFileError('Netzwerkfehler. Bitte versuche es erneut.')`
6. Success → pass response text through existing `parseGpx()`, then same state updates as GPX upload: `setRoutePoints`, `setFileName` (`'Komoot-Tour ${tourId}'`), `setHits`

### Tab switching
Switching tabs clears any current route, hits, and errors (same as `handleClear()`).

---

## Error Cases

| Situation | German error text |
|-----------|-------------------|
| URL contains no `/tour/\d+` | `Ungültige Komoot-URL.` |
| Komoot returns 404 | `Tour nicht gefunden oder privat.` |
| Network failure | `Netzwerkfehler. Bitte versuche es erneut.` |
| GPX has < 2 points | `Keine Route in dieser Datei gefunden.` (existing) |

---

## Out of Scope

- Komoot OAuth / private tours
- Caching fetched GPX data
- Strava or other platform imports
- `komoot.at` domain (does not exist — Komoot only uses `.com`)
