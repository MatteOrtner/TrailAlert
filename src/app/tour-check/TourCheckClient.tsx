'use client'

import dynamic from 'next/dynamic'
import { useRef, useState } from 'react'
import { Upload, X, AlertTriangle, CheckCircle2, Loader2, ArrowLeft, Link } from 'lucide-react'
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
// Extract Komoot tour ID from any Komoot URL variant
// ---------------------------------------------------------------------------
function extractTourId(url: string): string | null {
  const match = url.match(/\/tour\/(\d+)/)
  return match ? match[1] : null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function TourCheckClient() {
  const { closures, loading: closuresLoading } = useClosures()

  const [activeTab,      setActiveTab]      = useState<'gpx' | 'komoot'>('gpx')
  const [routePoints,    setRoutePoints]    = useState<LatLng[]>([])
  const [fileName,       setFileName]       = useState<string | null>(null)
  const [hits,           setHits]           = useState<{ closure: Closure; distanceM: number }[]>([])
  const [fileError,      setFileError]      = useState<string | null>(null)
  const [dragOver,       setDragOver]       = useState(false)
  const [komootUrl,      setKomootUrl]      = useState('')
  const [komootLoading,  setKomootLoading]  = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---------------------------------------------------------------------------
  // Shared: process parsed GPX points
  // ---------------------------------------------------------------------------
  function applyPoints(points: LatLng[], label: string) {
    if (points.length < 2) {
      setFileError('Keine Route in dieser Datei gefunden.')
      return
    }

    const candidates = closures.filter(
      (c) => c.status === 'active' || c.status === 'unconfirmed' || c.status === 'pending_review',
    )

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
    e.target.value = '' // reset so the same file can be re-uploaded
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  // ---------------------------------------------------------------------------
  // Komoot import
  // ---------------------------------------------------------------------------
  async function handleKomootLoad() {
    setFileError(null)

    const tourId = extractTourId(komootUrl)
    if (!tourId) {
      setFileError('Ungültige Komoot-URL.')
      return
    }

    setKomootLoading(true)
    try {
      const res = await fetch(`/api/komoot?tourId=${tourId}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setFileError(json.error ?? 'Tour nicht gefunden oder privat.')
        return
      }
      const text   = await res.text()
      const points = parseGpx(text)
      applyPoints(points, `Komoot-Tour ${tourId}`)
    } catch {
      setFileError('Netzwerkfehler. Bitte versuche es erneut.')
    } finally {
      setKomootLoading(false)
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
    setKomootUrl('')
  }

  function handleTabSwitch(tab: 'gpx' | 'komoot') {
    setActiveTab(tab)
    handleClear()
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
            Lade deine GPX-Route hoch oder gib einen Komoot-Link ein — wir zeigen dir sofort, ob aktive Sperren auf deinem Weg liegen.
          </p>
        </div>

        {/* Tab switch */}
        <div
          className="flex rounded-xl p-1"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {(['gpx', 'komoot'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabSwitch(tab)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors"
              style={{
                background: activeTab === tab ? 'var(--accent)' : 'transparent',
                color:      activeTab === tab ? 'var(--bg-dark)' : 'var(--text-secondary)',
              }}
            >
              {tab === 'gpx' ? (
                <><Upload className="h-3.5 w-3.5" /> GPX hochladen</>
              ) : (
                <><Link className="h-3.5 w-3.5" /> Komoot-Link</>
              )}
            </button>
          ))}
        </div>

        {/* Input area or file info */}
        {!fileName ? (
          activeTab === 'gpx' ? (
            // GPX drag & drop
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
            // Komoot URL input
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://www.komoot.com/tour/123456789"
                  value={komootUrl}
                  onChange={(e) => setKomootUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleKomootLoad() }}
                  className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    background:  'var(--bg-card)',
                    border:      '1px solid var(--border)',
                    color:       'var(--text-primary)',
                    fontSize:    16,
                  }}
                />
                <button
                  type="button"
                  onClick={handleKomootLoad}
                  disabled={komootLoading || !komootUrl.trim()}
                  className="shrink-0 rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: 'var(--bg-dark)' }}
                >
                  {komootLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Laden'}
                </button>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Nur öffentliche Komoot-Touren werden unterstützt.
              </p>
            </div>
          )
        ) : (
          // File info bar (shared for both tabs)
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
