# GPX Tour Checker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/tour-check` page where riders upload a GPX file, see their route drawn on a map, and get a warning list of active closures within 75m of the route.

**Architecture:** Pure client-side feature — GPX parsed in the browser with `DOMParser`, collision detection uses a Haversine point-to-segment algorithm against already-loaded closures from `useClosures()`. A minimal `TourMap` component (no filter/report UI) renders the polyline + markers. `haversineMeters` is moved from `ReportForm.tsx` into a shared `src/lib/geo.ts` utility.

**Tech Stack:** Next.js 14 App Router, React-Leaflet, TypeScript, Tailwind CSS, `useClosures` hook (existing).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/geo.ts` | `haversineMeters` + `pointToSegmentMeters` + `LatLng` type |
| Create | `src/lib/__tests__/geo.test.ts` | Unit tests for geo utilities |
| Modify | `src/components/ReportForm.tsx` | Replace local `haversineMeters` with import from `src/lib/geo.ts` |
| Create | `src/components/TourMap.tsx` | Minimal Leaflet map: tile layer + polyline + closure markers + fly-to controller |
| Create | `src/app/tour-check/TourCheckClient.tsx` | All client logic: upload, GPX parse, collision detection, UI |
| Create | `src/app/tour-check/page.tsx` | Server component shell + metadata |
| Modify | `src/components/Header.tsx` | Add "Tour prüfen" link to desktop nav and mobile menu |

---

## Task 1: Create `src/lib/geo.ts` with shared geo utilities

**Files:**
- Create: `src/lib/geo.ts`
- Create: `src/lib/__tests__/geo.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/geo.test.ts`:
```typescript
import { haversineMeters, pointToSegmentMeters } from '../geo'

describe('haversineMeters', () => {
  it('returns 0 for identical points', () => {
    expect(haversineMeters(46.8, 12.7, 46.8, 12.7)).toBe(0)
  })

  it('returns ~111 195 m for 1 degree latitude at the equator', () => {
    expect(haversineMeters(0, 0, 1, 0)).toBeCloseTo(111_195, -3)
  })

  it('is symmetric', () => {
    const d1 = haversineMeters(46.8, 12.7, 46.85, 12.75)
    const d2 = haversineMeters(46.85, 12.75, 46.8, 12.7)
    expect(d1).toBeCloseTo(d2, 5)
  })
})

describe('pointToSegmentMeters', () => {
  it('returns 0 when point lies on the segment midpoint', () => {
    const a = { lat: 0, lng: 0 }
    const b = { lat: 0, lng: 0.002 }
    const p = { lat: 0, lng: 0.001 }
    expect(pointToSegmentMeters(p, a, b)).toBeCloseTo(0, 0)
  })

  it('snaps to endpoint A when projection falls before the segment', () => {
    const a = { lat: 0, lng: 0 }
    const b = { lat: 0, lng: 0.001 }
    const p = { lat: 0, lng: -0.001 } // before A
    const expected = haversineMeters(p.lat, p.lng, a.lat, a.lng)
    expect(pointToSegmentMeters(p, a, b)).toBeCloseTo(expected, 1)
  })

  it('returns perpendicular distance when projection is within the segment', () => {
    const a = { lat: 0, lng: 0 }
    const b = { lat: 0, lng: 0.002 }
    const p = { lat: 0.0009, lng: 0.001 } // ~100 m above midpoint
    const d = pointToSegmentMeters(p, a, b)
    expect(d).toBeGreaterThan(50)
    expect(d).toBeLessThan(150)
  })

  it('handles zero-length segment by returning distance to the point', () => {
    const a = { lat: 46.8, lng: 12.7 }
    const b = { lat: 46.8, lng: 12.7 }
    const p = { lat: 46.81, lng: 12.7 }
    expect(pointToSegmentMeters(p, a, b)).toBeCloseTo(
      haversineMeters(p.lat, p.lng, a.lat, a.lng), 1,
    )
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd C:\Users\matte\trailalert
npx jest src/lib/__tests__/geo.test.ts --no-coverage
```
Expected: FAIL — `Cannot find module '../geo'`

- [ ] **Step 3: Create `src/lib/geo.ts`**

```typescript
export interface LatLng {
  lat: number
  lng: number
}

/**
 * Great-circle distance in metres between two lat/lng points (Haversine formula).
 */
export function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R    = 6_371_000
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Minimum distance in metres from point P to line segment A→B.
 * Projects P onto the segment; clamps the parameter t to [0, 1]
 * so the result never falls outside the segment.
 */
export function pointToSegmentMeters(p: LatLng, a: LatLng, b: LatLng): number {
  const dx    = b.lng - a.lng
  const dy    = b.lat - a.lat
  const lenSq = dx * dx + dy * dy

  if (lenSq === 0) return haversineMeters(p.lat, p.lng, a.lat, a.lng)

  const t = Math.max(0, Math.min(1,
    ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / lenSq,
  ))

  return haversineMeters(p.lat, p.lng, a.lat + t * dy, a.lng + t * dx)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/lib/__tests__/geo.test.ts --no-coverage
```
Expected: PASS — 7 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/geo.ts src/lib/__tests__/geo.test.ts
git commit -m "feat(geo): add haversineMeters and pointToSegmentMeters utilities"
```

---

## Task 2: Update `ReportForm.tsx` to import from `geo.ts`

**Files:**
- Modify: `src/components/ReportForm.tsx`

- [ ] **Step 1: Add `LatLng` + `haversineMeters` to the import from `@/lib/geo`**

Find the existing type import near line 13:
```typescript
import type { Closure, ClosureType, SeverityLevel } from '@/lib/types'
```
Add a new import line directly below it:
```typescript
import { haversineMeters } from '@/lib/geo'
```

- [ ] **Step 2: Remove the local `haversineMeters` function**

Find and delete this block (around lines 93–106):
```typescript
// ---------------------------------------------------------------------------
// Haversine distance in metres between two lat/lng points
// ---------------------------------------------------------------------------
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6_371_000
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:\Users\matte\trailalert
npx tsc --noEmit
```
Expected: no errors in `ReportForm.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/ReportForm.tsx
git commit -m "refactor(form): import haversineMeters from shared geo utility"
```

---

## Task 3: Create `src/components/TourMap.tsx`

**Files:**
- Create: `src/components/TourMap.tsx`

This is a minimal Leaflet map. It renders:
- The OpenTopoMap tile layer (same as the main map)
- The GPX route as an amber polyline
- Closure markers using the existing `ClosureMarker` component
- A `FlyToController` inner component that pans + zooms to a selected closure

It is imported with `dynamic(..., { ssr: false })` in `TourCheckClient` — do NOT add `'use client'` to this file, just import Leaflet CSS and use react-leaflet directly.

- [ ] **Step 1: Create `src/components/TourMap.tsx`**

```typescript
import 'leaflet/dist/leaflet.css'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet'
import { ClosureMarker } from './ClosureMarker'
import type { LatLng } from '@/lib/geo'
import type { Closure } from '@/lib/types'

const TILE_URL         = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'

// Osttirol centre — shown before any GPX is loaded
const DEFAULT_CENTER: [number, number] = [46.8489, 12.7672]
const DEFAULT_ZOOM = 11

// ---------------------------------------------------------------------------
// Inner component: flies the map to the selected closure when it changes
// ---------------------------------------------------------------------------
function FlyToController({
  closureId,
  closures,
}: {
  closureId: string | null
  closures:  Closure[]
}) {
  const map    = useMap()
  const prevId = useRef<string | null>(null)

  useEffect(() => {
    if (!closureId || closureId === prevId.current) return
    const target = closures.find((c) => c.id === closureId)
    if (!target) return
    prevId.current = closureId
    map.flyTo([target.latitude, target.longitude], 15, { animate: true, duration: 0.8 })
  }, [closureId, closures, map])

  return null
}

// ---------------------------------------------------------------------------
// TourMap
// ---------------------------------------------------------------------------
export interface TourMapProps {
  routePoints:       LatLng[]
  closures:          Closure[]
  selectedClosureId: string | null
}

export function TourMap({ routePoints, closures, selectedClosureId }: TourMapProps) {
  const positions = routePoints.map((p): [number, number] => [p.lat, p.lng])

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url={TILE_URL}
        attribution={TILE_ATTRIBUTION}
        subdomains={['a', 'b', 'c']}
        maxZoom={17}
      />

      {positions.length > 1 && (
        <Polyline positions={positions} color="#f59e0b" weight={4} opacity={0.85} />
      )}

      {closures.map((c) => (
        <ClosureMarker
          key={c.id}
          closure={c}
          autoOpen={c.id === selectedClosureId}
        />
      ))}

      <FlyToController closureId={selectedClosureId} closures={closures} />
    </MapContainer>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TourMap.tsx
git commit -m "feat(map): add minimal TourMap component for GPX route display"
```

---

## Task 4: Create `TourCheckClient.tsx`

**Files:**
- Create: `src/app/tour-check/TourCheckClient.tsx`

This is the main client component. It:
- Dynamically imports `TourMap` with `ssr: false`
- Parses the uploaded GPX via `DOMParser`
- Runs the collision check using `pointToSegmentMeters`
- Renders the upload area, status banner, warning list, and map

- [ ] **Step 1: Create `src/app/tour-check/TourCheckClient.tsx`**

```typescript
'use client'

import dynamic from 'next/dynamic'
import { useRef, useState } from 'react'
import { Upload, X, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { useClosures } from '@/hooks/useClosures'
import { pointToSegmentMeters } from '@/lib/geo'
import type { LatLng } from '@/lib/geo'
import type { Closure } from '@/lib/types'

// Leaflet cannot run on the server — load TourMap only in the browser
const TourMap = dynamic(
  () => import('@/components/TourMap').then((m) => ({ default: m.TourMap })),
  {
    ssr:     false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center" style={{ background: 'var(--bg-dark)' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    ),
  },
)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_FILE_BYTES     = 5 * 1024 * 1024
const COLLISION_RADIUS_M = 75

const SEVERITY_COLORS = {
  full_closure: '#ef4444',
  partial:      '#f59e0b',
  warning:      '#eab308',
} as const

// ---------------------------------------------------------------------------
// GPX parser — extracts track points from raw XML text
// ---------------------------------------------------------------------------
function parseGpx(xml: string): LatLng[] {
  const doc    = new DOMParser().parseFromString(xml, 'application/xml')
  const trkpts = Array.from(doc.getElementsByTagName('trkpt'))
  return trkpts
    .map((pt) => ({
      lat: parseFloat(pt.getAttribute('lat') ?? 'NaN'),
      lng: parseFloat(pt.getAttribute('lon') ?? 'NaN'),
    }))
    .filter((p) => isFinite(p.lat) && isFinite(p.lng))
}

// ---------------------------------------------------------------------------
// Minimum distance from a closure point to the full route
// ---------------------------------------------------------------------------
function minDistanceToRoute(closure: Closure, route: LatLng[]): number {
  let min = Infinity
  for (let i = 0; i < route.length - 1; i++) {
    const d = pointToSegmentMeters(
      { lat: closure.latitude, lng: closure.longitude },
      route[i],
      route[i + 1],
    )
    if (d < min) min = d
  }
  return min
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function TourCheckClient() {
  const { closures, loading: closuresLoading } = useClosures()

  const [routePoints,       setRoutePoints]       = useState<LatLng[]>([])
  const [fileName,          setFileName]          = useState<string | null>(null)
  const [hits,              setHits]              = useState<{ closure: Closure; distanceM: number }[]>([])
  const [fileError,         setFileError]         = useState<string | null>(null)
  const [selectedClosureId, setSelectedClosureId] = useState<string | null>(null)
  const [dragOver,          setDragOver]          = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function processFile(file: File) {
    setFileError(null)

    if (!file.name.toLowerCase().endsWith('.gpx')) {
      setFileError('Bitte eine .gpx-Datei hochladen.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError('Datei zu groß (max. 5 MB).')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text   = e.target?.result as string
      const points = parseGpx(text)

      if (points.length < 2) {
        setFileError('Keine Route in dieser Datei gefunden.')
        return
      }

      // Only check non-resolved closures
      const candidates = closures.filter(
        (c) => c.status === 'active' || c.status === 'unconfirmed' || c.status === 'pending_review',
      )

      const newHits = candidates
        .map((c) => ({ closure: c, distanceM: minDistanceToRoute(c, points) }))
        .filter(({ distanceM }) => distanceM <= COLLISION_RADIUS_M)
        .sort((a, b) => a.distanceM - b.distanceM)

      setRoutePoints(points)
      setFileName(file.name)
      setHits(newHits)
      setSelectedClosureId(null)
    }
    reader.readAsText(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = '' // reset so the same file can be re-uploaded
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleClear() {
    setRoutePoints([])
    setFileName(null)
    setHits([])
    setFileError(null)
    setSelectedClosureId(null)
  }

  // Closures displayed on the map: all non-resolved ones
  const mapClosures = closures.filter(
    (c) => c.status === 'active' || c.status === 'unconfirmed' || c.status === 'pending_review',
  )

  return (
    <div className="flex flex-col" style={{ minHeight: '100svh', background: 'var(--bg-dark)' }}>

      {/* ── Top panel ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 px-4 pb-4 pt-20">

        {/* Header text */}
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
            Tour prüfen
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Lade deine GPX-Route hoch und sieh sofort, ob aktive Sperren auf deinem Weg liegen.
          </p>
        </div>

        {/* Upload area or file info */}
        {!fileName ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl py-8 transition-colors"
            style={{
              border:     `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
              background: dragOver ? 'rgba(245,158,11,0.05)' : 'var(--bg-card)',
            }}
          >
            <Upload className="h-8 w-8" style={{ color: 'var(--accent)' }} />
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                GPX-Datei hochladen
              </p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                Drag &amp; Drop oder klicken · max. 5 MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".gpx"
              className="sr-only"
              onChange={handleFileInput}
            />
          </div>
        ) : (
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <span className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {fileName}
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="ml-3 shrink-0 rounded-md p-1 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* File error */}
        {fileError && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>{fileError}</p>
        )}

        {/* Status banner — shown after a successful parse */}
        {fileName && !fileError && (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{
              background: hits.length === 0
                ? 'rgba(34,197,94,0.1)'
                : 'rgba(245,158,11,0.1)',
              border: `1px solid ${hits.length === 0
                ? 'rgba(34,197,94,0.3)'
                : 'rgba(245,158,11,0.3)'}`,
            }}
          >
            {hits.length === 0 ? (
              <>
                <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: '#22c55e' }} />
                <span className="text-sm font-semibold" style={{ color: '#22c55e' }}>
                  Alles klar — keine Sperren auf deiner Route
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: '#f59e0b' }} />
                <span className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
                  {hits.length} {hits.length === 1 ? 'Sperre' : 'Sperren'} auf deiner Route
                </span>
              </>
            )}
          </div>
        )}

        {/* Warning list */}
        {hits.length > 0 && (
          <div className="flex flex-col gap-2">
            {hits.map(({ closure, distanceM }) => (
              <button
                key={closure.id}
                type="button"
                onClick={() => setSelectedClosureId(closure.id)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors"
                style={{
                  background: selectedClosureId === closure.id
                    ? 'rgba(245,158,11,0.1)'
                    : 'var(--bg-card)',
                  border: `1px solid ${selectedClosureId === closure.id
                    ? 'rgba(245,158,11,0.4)'
                    : 'var(--border)'}`,
                }}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: SEVERITY_COLORS[closure.severity] }}
                />
                <span className="flex-1 truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {closure.title}
                </span>
                <span className="shrink-0 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {Math.round(distanceM)} m
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Map ───────────────────────────────────────────────────────── */}
      <div className="flex-1" style={{ minHeight: 400 }}>
        {closuresLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        ) : (
          <TourMap
            routePoints={routePoints}
            closures={mapClosures}
            selectedClosureId={selectedClosureId}
          />
        )}
      </div>

    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/tour-check/TourCheckClient.tsx
git commit -m "feat(tour-check): add GPX upload, collision detection, and warning UI"
```

---

## Task 5: Create `src/app/tour-check/page.tsx`

**Files:**
- Create: `src/app/tour-check/page.tsx`

- [ ] **Step 1: Create the server component shell**

```typescript
import type { Metadata } from 'next'
import { TourCheckClient } from './TourCheckClient'

export const metadata: Metadata = {
  title:       'Tour prüfen – TrailAlert',
  description: 'Prüfe deine GPX-Route auf aktive Wegsperren in Osttirol.',
}

export default function TourCheckPage() {
  return <TourCheckClient />
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/tour-check/page.tsx
git commit -m "feat(tour-check): add /tour-check page"
```

---

## Task 6: Add "Tour prüfen" to `Header.tsx`

**Files:**
- Modify: `src/components/Header.tsx`

The Header currently has no nav links to other pages — just "Sperre melden" and the auth button. Add "Tour prüfen" as a plain `<a>` tag (consistent with the existing `<a href="/">` logo link).

- [ ] **Step 1: Add to the desktop nav**

Find the desktop actions div:
```tsx
{/* Desktop actions */}
<div className="hidden sm:flex items-center gap-3">
  <button
    type="button"
    onClick={handleReport}
    className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-dark transition-colors hover:bg-accent-hover"
  >
    <Plus className="h-4 w-4" strokeWidth={2.5} />
    Sperre melden
  </button>
  <AuthButton />
</div>
```

Add the link **before** the "Sperre melden" button:
```tsx
{/* Desktop actions */}
<div className="hidden sm:flex items-center gap-3">
  <a
    href="/tour-check"
    className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
    style={{ color: 'var(--text-secondary)' }}
    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
  >
    Tour prüfen
  </a>
  <button
    type="button"
    onClick={handleReport}
    className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-dark transition-colors hover:bg-accent-hover"
  >
    <Plus className="h-4 w-4" strokeWidth={2.5} />
    Sperre melden
  </button>
  <AuthButton />
</div>
```

- [ ] **Step 2: Add to the mobile menu**

Find the mobile menu div. It currently starts with the region badge, then the "Sperre melden" button. Add the "Tour prüfen" link **after** the "Sperre melden" button:
```tsx
<button
  type="button"
  onClick={handleReport}
  className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg-dark"
>
  <Plus className="h-4 w-4" strokeWidth={2.5} />
  Sperre melden
</button>

<a
  href="/tour-check"
  onClick={() => setMenuOpen(false)}
  className="flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors"
  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
>
  Tour prüfen
</a>

<AuthButtonMobile onClose={() => setMenuOpen(false)} />
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat(nav): add Tour prüfen link to header navigation"
```

---

## Final Verification

- [ ] Run `npm run dev` and open `http://localhost:3000/tour-check`
- [ ] Verify the page loads with the upload area and a map centred on Osttirol
- [ ] Upload a GPX file with a route — confirm the polyline appears on the map
- [ ] If the route is near an existing active closure, confirm the amber warning banner and list appear
- [ ] Click a closure in the list — confirm the map flies to it and opens the popup
- [ ] Click "×" to clear the route — confirm the page resets to the upload state
- [ ] Check the "Tour prüfen" link appears in the desktop nav and the mobile hamburger menu
