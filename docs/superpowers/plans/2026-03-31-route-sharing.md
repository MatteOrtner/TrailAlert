# Route Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users share a checked GPX route via a short link (`/tour-check?route=a3kx9mPq`) that opens the route on the map with all closure warnings visible.

**Architecture:** Route points are stored anonymously in Supabase (`shared_routes` table) with an 8-character random ID. Two API routes handle saving (POST) and loading (GET). The client adds a share button to the status banner and auto-loads routes from URL params on mount. Routes expire after 30 days via pg_cron.

**Tech Stack:** Next.js 16 App Router (Route Handlers), Supabase (server client from `@supabase/ssr`), Node.js `crypto`, lucide-react (`Share2`, `Check`), React state.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/006_shared_routes.sql` | Table + RLS + pg_cron expiry job |
| Create | `src/app/api/routes/route.ts` | POST: save route, return short ID |
| Create | `src/app/api/routes/__tests__/post.test.ts` | Tests for POST handler |
| Create | `src/app/api/routes/[id]/route.ts` | GET: load route by ID |
| Create | `src/app/api/routes/[id]/__tests__/get.test.ts` | Tests for GET handler |
| Modify | `src/app/tour-check/TourCheckClient.tsx` | Share button + shared link loading on mount |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/006_shared_routes.sql`

This migration must be applied manually in the Supabase SQL Editor after the file is written (no automated test possible).

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/006_shared_routes.sql`:

```sql
-- Create shared_routes table
CREATE TABLE IF NOT EXISTS shared_routes (
  id          text        PRIMARY KEY,
  route_points jsonb      NOT NULL,
  file_name   text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: enable row-level security
ALTER TABLE shared_routes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (needed for shared links)
CREATE POLICY "shared_routes_select"
  ON shared_routes FOR SELECT
  USING (true);

-- Allow anyone to insert (no login required)
CREATE POLICY "shared_routes_insert"
  ON shared_routes FOR INSERT
  WITH CHECK (true);

-- Auto-expiry: delete rows older than 30 days daily at 03:00 UTC
SELECT cron.schedule(
  'delete-expired-shared-routes',
  '0 3 * * *',
  $$DELETE FROM shared_routes WHERE created_at < now() - interval '30 days'$$
);
```

- [ ] **Step 2: Apply the migration manually**

Go to Supabase Dashboard → SQL Editor → paste and run the contents of `supabase/migrations/006_shared_routes.sql`.

Verify: the `shared_routes` table appears in the Table Editor with columns `id`, `route_points`, `file_name`, `created_at`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_shared_routes.sql
git commit -m "feat(db): add shared_routes table with RLS and pg_cron expiry"
```

---

### Task 2: POST API Route — Save Shared Route

**Files:**
- Create: `src/app/api/routes/route.ts`
- Create: `src/app/api/routes/__tests__/post.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/routes/__tests__/post.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { POST } from '../route'

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/routes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

describe('POST /api/routes', () => {
  afterEach(() => jest.resetAllMocks())

  it('returns 400 when routePoints is missing', async () => {
    const res = await POST(makeRequest({ fileName: 'test.gpx' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('returns 400 when routePoints is empty array', async () => {
    const res = await POST(makeRequest({ routePoints: [], fileName: 'test.gpx' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when routePoints exceeds 10000 points', async () => {
    const points = Array.from({ length: 10001 }, (_, i) => ({ lat: i, lng: i }))
    const res = await POST(makeRequest({ routePoints: points, fileName: 'test.gpx' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when fileName is missing', async () => {
    const res = await POST(makeRequest({ routePoints: [{ lat: 46.0, lng: 12.5 }, { lat: 46.1, lng: 12.6 }] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when fileName is empty string', async () => {
    const res = await POST(makeRequest({ routePoints: [{ lat: 46.0, lng: 12.5 }, { lat: 46.1, lng: 12.6 }], fileName: '  ' }))
    expect(res.status).toBe(400)
  })

  it('returns 201 with id on success', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null })
    ;(createClient as jest.Mock).mockResolvedValue({
      from: () => ({ insert: mockInsert }),
    })

    const res = await POST(makeRequest({
      routePoints: [{ lat: 46.0, lng: 12.5 }, { lat: 46.1, lng: 12.6 }],
      fileName: 'my-tour.gpx',
    }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(typeof json.id).toBe('string')
    expect(json.id).toHaveLength(8)
  })

  it('returns 502 when Supabase insert fails', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: { message: 'db error' } })
    ;(createClient as jest.Mock).mockResolvedValue({
      from: () => ({ insert: mockInsert }),
    })

    const res = await POST(makeRequest({
      routePoints: [{ lat: 46.0, lng: 12.5 }, { lat: 46.1, lng: 12.6 }],
      fileName: 'my-tour.gpx',
    }))
    expect(res.status).toBe(502)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/app/api/routes/__tests__/post.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../route'`

- [ ] **Step 3: Implement the POST route**

Create `src/app/api/routes/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const { routePoints, fileName } = body as { routePoints: unknown; fileName: unknown }

  if (
    !Array.isArray(routePoints) ||
    routePoints.length === 0 ||
    routePoints.length > 10_000
  ) {
    return NextResponse.json(
      { error: 'routePoints muss ein Array mit 1–10.000 Punkten sein.' },
      { status: 400 },
    )
  }

  if (typeof fileName !== 'string' || fileName.trim().length === 0) {
    return NextResponse.json(
      { error: 'fileName darf nicht leer sein.' },
      { status: 400 },
    )
  }

  const id = crypto.randomBytes(6).toString('base64url').slice(0, 8)

  const supabase = await createClient()
  const { error } = await supabase.from('shared_routes').insert({
    id,
    route_points: routePoints,
    file_name:    fileName.trim().slice(0, 255),
  })

  if (error) {
    return NextResponse.json(
      { error: 'Route konnte nicht gespeichert werden.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ id }, { status: 201 })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/app/api/routes/__tests__/post.test.ts --no-coverage
```

Expected: 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/routes/route.ts src/app/api/routes/__tests__/post.test.ts
git commit -m "feat(api): add POST /api/routes to save shared route"
```

---

### Task 3: GET API Route — Load Shared Route

**Files:**
- Create: `src/app/api/routes/[id]/route.ts`
- Create: `src/app/api/routes/[id]/__tests__/get.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/routes/[id]/__tests__/get.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { GET } from '../route'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

function makeRequest(id: string) {
  return new Request(`http://localhost/api/routes/${id}`)
}

function makeParams(id: string) {
  return Promise.resolve({ id })
}

describe('GET /api/routes/[id]', () => {
  afterEach(() => jest.resetAllMocks())

  it('returns 400 for invalid id format', async () => {
    const res = await GET(makeRequest('bad!id'), { params: makeParams('bad!id') })
    expect(res.status).toBe(400)
  })

  it('returns 404 when route not found', async () => {
    const mockSelect = jest.fn().mockResolvedValue({ data: null, error: null })
    ;(createClient as jest.Mock).mockResolvedValue({
      from: () => ({
        select: () => ({ eq: () => ({ gt: () => ({ single: mockSelect }) }) }),
      }),
    })

    const res = await GET(makeRequest('abc12345'), { params: makeParams('abc12345') })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Dieser Link ist abgelaufen oder ungültig.')
  })

  it('returns 200 with routePoints and fileName on success', async () => {
    const fakeRoute = {
      route_points: [{ lat: 46.0, lng: 12.5 }, { lat: 46.1, lng: 12.6 }],
      file_name: 'my-tour.gpx',
    }
    const mockSelect = jest.fn().mockResolvedValue({ data: fakeRoute, error: null })
    ;(createClient as jest.Mock).mockResolvedValue({
      from: () => ({
        select: () => ({ eq: () => ({ gt: () => ({ single: mockSelect }) }) }),
      }),
    })

    const res = await GET(makeRequest('abc12345'), { params: makeParams('abc12345') })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.routePoints).toEqual(fakeRoute.route_points)
    expect(json.fileName).toBe(fakeRoute.file_name)
  })

  it('returns 502 when Supabase returns an error', async () => {
    const mockSelect = jest.fn().mockResolvedValue({ data: null, error: { message: 'db error' } })
    ;(createClient as jest.Mock).mockResolvedValue({
      from: () => ({
        select: () => ({ eq: () => ({ gt: () => ({ single: mockSelect }) }) }),
      }),
    })

    const res = await GET(makeRequest('abc12345'), { params: makeParams('abc12345') })
    expect(res.status).toBe(502)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest "src/app/api/routes/\[id\]/__tests__/get.test.ts" --no-coverage
```

Expected: FAIL — `Cannot find module '../route'`

- [ ] **Step 3: Implement the GET route**

Create `src/app/api/routes/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ID_PATTERN = /^[A-Za-z0-9_-]{8}$/

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (!ID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: 'Dieser Link ist abgelaufen oder ungültig.' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('shared_routes')
    .select('route_points, file_name')
    .eq('id', id)
    .gt('created_at', thirtyDaysAgo)
    .single()

  if (error) {
    return NextResponse.json(
      { error: 'Netzwerkfehler. Bitte versuche es erneut.' },
      { status: 502 },
    )
  }

  if (!data) {
    return NextResponse.json(
      { error: 'Dieser Link ist abgelaufen oder ungültig.' },
      { status: 404 },
    )
  }

  return NextResponse.json({
    routePoints: data.route_points,
    fileName:    data.file_name,
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest "src/app/api/routes/\[id\]/__tests__/get.test.ts" --no-coverage
```

Expected: 4 tests PASS

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v OnboardingSheet
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/routes/[id]/route.ts" "src/app/api/routes/[id]/__tests__/get.test.ts"
git commit -m "feat(api): add GET /api/routes/[id] to load shared route"
```

---

### Task 4: TourCheckClient — Share Button + Shared Link Loading

**Files:**
- Modify: `src/app/tour-check/TourCheckClient.tsx`

Replace the entire file contents with the version below. Key changes:
- Add `useEffect` to check for `?route=` URL param on mount and load route
- Add `shareLoading`, `shareCopied`, `routeLoadingFromUrl` state
- Add `handleShare` async function
- Add share button inside the status banner
- Hide upload area and export instructions when loading from URL

- [ ] **Step 1: Replace TourCheckClient.tsx**

Replace entire contents of `src/app/tour-check/TourCheckClient.tsx`:

```tsx
'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { Upload, X, AlertTriangle, CheckCircle2, Loader2, ArrowLeft, Share2, Check } from 'lucide-react'
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

const ACTIVE_STATUSES = new Set(['active', 'unconfirmed', 'pending_review'])

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

  const [routePoints,        setRoutePoints]        = useState<LatLng[]>([])
  const [fileName,           setFileName]           = useState<string | null>(null)
  const [hits,               setHits]               = useState<{ closure: Closure; distanceM: number }[]>([])
  const [fileError,          setFileError]          = useState<string | null>(null)
  const [dragOver,           setDragOver]           = useState(false)
  const [shareLoading,       setShareLoading]       = useState(false)
  const [shareCopied,        setShareCopied]        = useState(false)
  const [routeLoadingFromUrl, setRouteLoadingFromUrl] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---------------------------------------------------------------------------
  // On mount: load route from ?route= URL param if present
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('route')
    if (!id) return

    setRouteLoadingFromUrl(true)
    setFileError(null)

    fetch(`/api/routes/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          setFileError(json.error ?? 'Dieser Link ist abgelaufen oder ungültig.')
          return
        }
        const { routePoints: pts, fileName: name } = await res.json()
        applyPoints(pts, name)
      })
      .catch(() => {
        setFileError('Netzwerkfehler. Bitte versuche es erneut.')
      })
      .finally(() => {
        setRouteLoadingFromUrl(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // Shared: process parsed GPX points
  // ---------------------------------------------------------------------------
  function applyPoints(points: LatLng[], label: string) {
    if (points.length < 2) {
      setFileError('Keine Route in dieser Datei gefunden.')
      return
    }

    const candidates = closures.filter((c) => ACTIVE_STATUSES.has(c.status))

    const newHits = candidates
      .map((c) => ({ closure: c, distanceM: minDistanceToRoute(c, points) }))
      .filter(({ distanceM }) => distanceM <= COLLISION_RADIUS_M)
      .sort((a, b) => a.distanceM - b.distanceM)

    setRoutePoints(points)
    setFileName(label)
    setHits(newHits)
  }

  // ---------------------------------------------------------------------------
  // GPX file upload
  // ---------------------------------------------------------------------------
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
      applyPoints(points, file.name)
    }
    reader.readAsText(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  // ---------------------------------------------------------------------------
  // Share
  // ---------------------------------------------------------------------------
  async function handleShare() {
    setShareLoading(true)
    try {
      const res = await fetch('/api/routes', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ routePoints, fileName }),
      })
      if (!res.ok) {
        setFileError('Route konnte nicht geteilt werden. Bitte versuche es erneut.')
        return
      }
      const { id } = await res.json()
      const url = `${window.location.origin}/tour-check?route=${id}`
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      setFileError('Route konnte nicht geteilt werden. Bitte versuche es erneut.')
    } finally {
      setShareLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Clear
  // ---------------------------------------------------------------------------
  function handleClear() {
    setRoutePoints([])
    setFileName(null)
    setHits([])
    setFileError(null)
  }

  const mapClosures = closures.filter((c) => ACTIVE_STATUSES.has(c.status))

  return (
    <div className="flex flex-col" style={{ minHeight: '100svh', background: 'var(--bg-dark)' }}>

      {/* ── Top panel ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 px-4 pb-4 pt-20">

        {/* Header text */}
        <div>
          <a
            href="/"
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Zurück zur Karte
          </a>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
            Tour prüfen
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Lade deine GPX-Route hoch und sieh sofort, ob aktive Sperren auf deinem Weg liegen.
          </p>
        </div>

        {/* Loading from shared URL */}
        {routeLoadingFromUrl && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Loader2 className="h-5 w-5 animate-spin shrink-0" style={{ color: 'var(--accent)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Route wird geladen…</span>
          </div>
        )}

        {/* Upload area or file info — hidden while loading from URL */}
        {!routeLoadingFromUrl && (
          !fileName ? (
            <>
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
              <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  So exportierst du deine Route:
                </p>
                <ol className="mt-2 ml-4 text-xs space-y-1" style={{ color: 'var(--text-secondary)', listStyleType: 'decimal' }}>
                  <li><strong style={{ color: 'var(--text-primary)' }}>Komoot:</strong> Tour öffnen → <span style={{ color: 'var(--text-primary)' }}>···</span> (Menü) → GPX-Datei herunterladen</li>
                  <li><strong style={{ color: 'var(--text-primary)' }}>Strava:</strong> Route öffnen → <span style={{ color: 'var(--text-primary)' }}>···</span> → Als GPX exportieren</li>
                  <li><strong style={{ color: 'var(--text-primary)' }}>AllTrails:</strong> Route öffnen → Download → GPX format</li>
                </ol>
                <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Die heruntergeladene .gpx-Datei kannst du dann hier hochladen.
                </p>
              </div>
            </>
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
          )
        )}

        {/* Error */}
        {fileError && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>{fileError}</p>
        )}

        {/* Status banner */}
        {fileName && !fileError && (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{
              background: hits.length === 0 ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${hits.length === 0 ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
            }}
          >
            {hits.length === 0 ? (
              <>
                <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: '#22c55e' }} />
                <span className="flex-1 text-sm font-semibold" style={{ color: '#22c55e' }}>
                  Alles klar — keine Sperren auf deiner Route
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: '#f59e0b' }} />
                <span className="flex-1 text-sm font-semibold" style={{ color: '#f59e0b' }}>
                  {hits.length} {hits.length === 1 ? 'Sperre' : 'Sperren'} auf deiner Route
                </span>
              </>
            )}
            {/* Share button */}
            <button
              type="button"
              onClick={handleShare}
              disabled={shareLoading}
              className="shrink-0 rounded-md p-1 transition-colors disabled:opacity-50"
              style={{ color: hits.length === 0 ? '#22c55e' : '#f59e0b' }}
              title="Route teilen"
            >
              {shareLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : shareCopied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
            </button>
          </div>
        )}

        {/* Warning list */}
        {hits.length > 0 && (
          <div className="flex flex-col gap-2">
            {hits.map(({ closure, distanceM }) => (
              <a
                key={closure.id}
                href={`/?closure=${closure.id}`}
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
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
              </a>
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
            selectedClosureId={null}
          />
        )}
      </div>

    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v OnboardingSheet
```

Expected: no output (no errors)

- [ ] **Step 3: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/app/tour-check/TourCheckClient.tsx
git commit -m "feat(tour-check): add share button and shared link loading"
```

- [ ] **Step 5: Push**

```bash
git push
```
