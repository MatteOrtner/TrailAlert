# Design: GPX Tour Checker

**Date:** 2026-03-30

---

## Overview

A dedicated page (`/tour-check`) where MTB riders can upload a GPX route file before heading out. The app draws the route on a map and automatically checks whether it passes within 75m of any active closure. Conflicting closures are listed with their name and severity. Tapping a closure in the list flies the map to that marker and opens its popup.

**Scope:** GPX upload only. No Komoot OAuth, no snap-to-road, no polygon closure areas. No login required.

---

## Page Layout (mobile-first, stacked)

1. **Upload area** — drag & drop or click, accepts `.gpx` files only, max 5MB. Once a file is loaded, the upload area is replaced by a single line: `"Route: Dateiname.gpx · [×] Entfernen"`.
2. **Status banner** — appears after upload:
   - Green: "Alles klar — keine Sperren auf deiner Route"
   - Amber: "2 Sperren auf deiner Route" (with count)
3. **Warning list** — only visible when there are hits. Each entry: closure title + severity colour dot + distance to route in metres. Tapping an entry flies the map to that marker and opens its popup.
4. **Map** — fills the remaining screen height. Shows the route as an amber polyline + all active closure markers. Before upload: empty map centred on Osttirol.

On desktop, the same stacked layout is used — no special breakpoint needed.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/geo.ts` | `haversineMeters` + `pointToSegmentMeters` utilities |
| Modify | `src/components/ReportForm.tsx` | Import `haversineMeters` from `src/lib/geo.ts` instead of local copy |
| Create | `src/components/TourMap.tsx` | Minimal Leaflet map: tile layer + route polyline + closure markers |
| Create | `src/app/tour-check/page.tsx` | Server component shell, metadata |
| Create | `src/app/tour-check/TourCheckClient.tsx` | All client logic: upload, GPX parsing, collision detection, state |
| Modify | `src/components/Header.tsx` | Add "Tour prüfen" nav link |

---

## Components & Data Flow

### `src/lib/geo.ts`
Two pure functions:
- `haversineMeters(lat1, lng1, lat2, lng2): number` — moved from `ReportForm.tsx`
- `pointToSegmentMeters(p, a, b): number` — minimum distance from point `p` to line segment `a→b`, using Haversine for the actual distance

### `TourCheckClient.tsx`
State:
- `routePoints: { lat: number; lng: number }[]` — parsed GPX track points
- `hits: { closure: Closure; distanceM: number }[]` — closures within 75m
- `selectedClosureId: string | null` — drives map fly-to + popup
- `fileError: string | null` — parse/validation error message

Data:
- Closures loaded via `useClosures()` hook (existing, no extra fetch)
- GPX parsed in-browser via `DOMParser` — no external package

Flow:
1. User drops/selects a `.gpx` file
2. File is validated (size ≤ 5MB, extension `.gpx`)
3. `DOMParser` extracts all `<trkpt lat lon>` elements → `routePoints`
4. For each closure with status `active`, `unconfirmed`, or `pending_review`, compute `pointToSegmentMeters` against every route segment; keep minimum
5. Closures with min distance ≤ 75m → `hits`, sorted by distance
6. Render banner + list + map

### `TourMap.tsx`
Props: `routePoints`, `closures`, `selectedClosureId`, `onMarkerClick`
- Thin wrapper: `MapContainer` + `TileLayer` (OpenTopoMap, same as main map) + `Polyline` (amber, weight 4) + `ClosureMarker` per closure
- When `selectedClosureId` changes, uses `useMap()` to `flyTo` the closure and programmatically opens its popup

---

## GPX Parsing

```
DOMParser → getElementsByTagName('trkpt') → map to { lat, lng }
```

Error cases:
- File > 5MB → "Datei zu groß (max. 5 MB)"
- Not valid XML / no `<trkpt>` elements → "Keine Route in dieser Datei gefunden"
- Wrong file type → "Bitte eine .gpx-Datei hochladen"

---

## Collision Detection

For each closure point `C` and each route segment `A→B`:
1. Compute `pointToSegmentMeters(C, A, B)`
2. Track minimum across all segments
3. If minimum ≤ 75m → hit

This is O(closures × segments), runs synchronously in < 10ms for typical routes (< 1000 points) and < 20 closures.

---

## Navigation

`Header.tsx` gets a new link "Tour prüfen" pointing to `/tour-check`, visible to all users (no auth required), styled identically to the existing nav links.

---

## Out of Scope

- Komoot / Strava OAuth integration
- Snap-to-road
- Polygon closure areas
- Saving/sharing checked routes
- Multiple GPX files at once
