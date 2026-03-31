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

      // Use Web Share API on mobile (avoids clipboard gesture-context issues),
      // fall back to clipboard, then a prompt if both are unavailable.
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: 'TrailAlert Tour-Check', url })
        } catch {
          // User dismissed the share sheet — still counts as success
        }
      } else {
        try {
          await navigator.clipboard.writeText(url)
        } catch {
          // Clipboard blocked (e.g. iOS Safari after async gap) — show manual fallback
          window.prompt('Link zum Teilen:', url)
        }
      }

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
