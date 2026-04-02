'use client'

import 'leaflet/dist/leaflet.css'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Circle, Polyline, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import { Locate, Loader2 } from 'lucide-react'
import { useClosures, isDefaultFilters, DEFAULT_FILTERS } from '@/hooks/useClosures'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useReportForm } from '@/contexts/ReportFormContext'
import { useWatchAreas } from '@/hooks/useWatchAreas'
import { useAuth } from '@/contexts/AuthContext'
import { useWelcome } from '@/hooks/useWelcome'
import type { Closure, SeverityLevel } from '@/lib/types'
import { ClosureMarker } from './ClosureMarker'
import { FilterSidebar, FilterToggleButton } from './FilterSidebar'
import { ReportForm } from './ReportForm'
import { WelcomeSheet } from './WelcomeSheet'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// OpenTopoMap — topographic tiles with elevation contours, forest roads,
// hiking & MTB trails. Subdomains a/b/c only (d does not exist).
const TILE_URL =
  'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION =
  'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  full_closure: '#ef4444',
  partial: '#f59e0b',
  warning: '#eab308',
}

function getClosureRoutePositions(closure: Closure): [number, number][] | null {
  const coords = closure.route_path?.coordinates
  if (Array.isArray(coords) && coords.length >= 2) {
    const mapped = coords
      .filter((c): c is [number, number] => Array.isArray(c) && c.length === 2)
      .map(([lng, lat]) => [lat, lng] as [number, number])

    if (mapped.length >= 2) return mapped
  }

  if (
    closure.route_start_lat != null &&
    closure.route_start_lng != null &&
    closure.route_end_lat != null &&
    closure.route_end_lng != null
  ) {
    return [
      [closure.route_start_lat, closure.route_start_lng],
      [closure.route_end_lat, closure.route_end_lng],
    ]
  }

  return null
}

// ---------------------------------------------------------------------------
// GPS button — inside MapContainer (needs useMap)
// ---------------------------------------------------------------------------

function LocationControl() {
  const map = useMap()
  const { position, loading, error, requestLocation } = useGeolocation()

  useEffect(() => {
    if (position) {
      map.setView([position.latitude, position.longitude], 14, { animate: true })
    }
  }, [position, map])

  return (
    <div className="leaflet-bottom leaflet-left" style={{ zIndex: 1000 }}>
      <div className="leaflet-control mb-3 ml-3">
        <button
          type="button"
          onClick={requestLocation}
          title={error ?? 'Meinen Standort zeigen'}
          className="flex h-10 w-10 items-center justify-center rounded-lg shadow-lg transition-colors"
          style={{
            background: 'var(--bg-card)',
            border:     `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
          }}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-secondary)' }} />
          ) : (
            <Locate
              className="h-5 w-5"
              style={{ color: error ? 'var(--danger)' : position ? 'var(--accent)' : 'var(--text-secondary)' }}
            />
          )}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Lets the user tap the main map to pick a position (for the report form)
// ---------------------------------------------------------------------------

function MapPositionPicker() {
  const { onPositionPickedRef, setIsPickingLocation } = useReportForm()

  useMapEvents({
    click(e) {
      if (onPositionPickedRef.current) {
        onPositionPickedRef.current(e.latlng.lat, e.latlng.lng)
        setIsPickingLocation(false)
      }
    },
  })

  return null
}

// ---------------------------------------------------------------------------
// Re-renders Leaflet after sidebar resize transition (310ms > 300ms CSS)
// ---------------------------------------------------------------------------

function MapResizeHandler({ trigger }: { trigger: boolean }) {
  const map = useMap()
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 310)
    return () => clearTimeout(id)
  }, [trigger, map])
  return null
}

// ---------------------------------------------------------------------------
// Zooms to new closure after successful report — inside MapContainer
// ---------------------------------------------------------------------------

function ZoomToNewClosureHandler({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.setView(target, 15, { animate: true })
  }, [target, map])
  return null
}

// ---------------------------------------------------------------------------
// Pauses marker pulse animations during map movement.
// Each animated .ta-marker-ring element forces the browser to maintain a
// separate GPU compositor layer. At high zoom with several markers on screen
// this causes GPU memory pressure and frame-rate drops on mobile.
// Pausing the animation removes those extra layers while the map is moving.
// ---------------------------------------------------------------------------

function MapMovementTracker() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const start = () => container.classList.add('leaflet-map-moving')
    const end   = () => container.classList.remove('leaflet-map-moving')
    map.on('movestart', start)
    map.on('zoomstart', start)
    map.on('moveend',   end)
    map.on('zoomend',   end)
    return () => {
      map.off('movestart', start)
      map.off('zoomstart', start)
      map.off('moveend',   end)
      map.off('zoomend',   end)
    }
  }, [map])
  return null
}

// ---------------------------------------------------------------------------
// Main Map export
// ---------------------------------------------------------------------------

export default function Map({ targetClosureId }: { targetClosureId?: string | null }) {
  const { closures, total, loading, error, filters, setFilters } = useClosures()
  const { onSuccessRef, isPickingLocation, setAllClosures } = useReportForm()
  const { user }                          = useAuth()
  const { showWelcome, dismiss: dismissWelcome } = useWelcome()

  useEffect(() => {
    setAllClosures(closures)
  }, [closures]) // eslint-disable-line react-hooks/exhaustive-deps
  const { areas }                         = useWatchAreas()
  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const [zoomTarget, setZoomTarget]       = useState<[number, number] | null>(null)
  const [openPopupFor, setOpenPopupFor]   = useState<string | null>(null)
  const isDirty = !isDefaultFilters(filters)

  // Register zoom callback in context so ReportForm can trigger it.
  useEffect(() => {
    onSuccessRef.current = (lat, lng) => setZoomTarget([lat, lng])
    return () => {
      onSuccessRef.current = null
    }
  }, [onSuccessRef])

  // Pan to and open popup for a linked closure (e.g. from email notification)
  useEffect(() => {
    if (!targetClosureId || loading) return
    const target = closures.find((c) => c.id === targetClosureId)
    if (!target) return

    const timeoutId = window.setTimeout(() => {
      setZoomTarget([target.latitude, target.longitude])
      setOpenPopupFor(target.id)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [targetClosureId, closures, loading])

  return (
    <div className="flex h-full w-full overflow-hidden">

      {/* Filter sidebar */}
      <FilterSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        filters={filters}
        setFilters={setFilters}
        count={closures.length}
        total={total}
      />

      {/* Map area */}
      <div className="relative flex-1 min-w-0">
        <MapContainer
          center={[46.83, 12.76]}
          zoom={11}
          minZoom={6}
          maxZoom={18}
          className="h-full w-full outline-none"
          zoomControl={false}
          attributionControl={false}
          preferCanvas={true}
        >
          <TileLayer
            url={TILE_URL}
            attribution={TILE_ATTRIBUTION}
            subdomains="abc"
            maxNativeZoom={17}
            maxZoom={20}
            keepBuffer={2}
            updateWhenZooming={false}
          />

          {closures.map((closure) => {
            const positions = getClosureRoutePositions(closure)
            if (!positions) return null

            const midpoint = positions[Math.floor(positions.length / 2)] ?? positions[0]

            return (
              <Polyline
                key={`route-${closure.id}`}
                positions={positions}
                pathOptions={{
                  color: SEVERITY_COLORS[closure.severity],
                  weight: 6,
                  opacity: 0.9,
                  lineCap: 'round',
                }}
                eventHandlers={{
                  click: () => {
                    setOpenPopupFor(closure.id)
                    setZoomTarget(midpoint)
                  },
                }}
              />
            )
          })}

          {closures.map((closure) => (
            <ClosureMarker
              key={closure.id}
              closure={closure}
              autoOpen={closure.id === openPopupFor}
            />
          ))}

          {/* Watch area circles — visible for logged-in users */}
          {user && areas.map((area) => (
            <Circle
              key={area.id}
              center={[area.center_lat, area.center_lng]}
              radius={area.radius_km * 1000}
              pathOptions={{
                color:       '#f59e0b',
                fillColor:   '#f59e0b',
                fillOpacity: 0.06,
                weight:      1.5,
                opacity:     0.4,
                dashArray:   '6 4',
              }}
            />
          ))}

          <ZoomControl position="bottomright" />
          <MapMovementTracker />
          <LocationControl />
          <MapResizeHandler trigger={sidebarOpen} />
          <ZoomToNewClosureHandler target={zoomTarget} />
          {isPickingLocation && <MapPositionPicker />}
        </MapContainer>

        {/* Crosshair overlay shown while the user picks a location for a new report */}
        {isPickingLocation && (
          <div
            className="pointer-events-none absolute inset-0 z-[999] flex items-center justify-center"
            style={{ paddingBottom: 100 }}
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="10" stroke="#f59e0b" strokeWidth="2.5" fill="none" opacity="0.9"/>
              <line x1="18" y1="0" x2="18" y2="10" stroke="#f59e0b" strokeWidth="2" opacity="0.9"/>
              <line x1="18" y1="26" x2="18" y2="36" stroke="#f59e0b" strokeWidth="2" opacity="0.9"/>
              <line x1="0" y1="18" x2="10" y2="18" stroke="#f59e0b" strokeWidth="2" opacity="0.9"/>
              <line x1="26" y1="18" x2="36" y2="18" stroke="#f59e0b" strokeWidth="2" opacity="0.9"/>
              <circle cx="18" cy="18" r="2.5" fill="#f59e0b" opacity="0.9"/>
            </svg>
          </div>
        )}

        {/* Filter toggle button — offset below fixed header */}
        <div className="absolute left-3 z-[1000]" style={{ top: 'calc(4rem + 0.75rem)' }}>
          <FilterToggleButton
            open={sidebarOpen}
            onClick={() => setSidebarOpen((o) => !o)}
            isDirty={isDirty}
            count={closures.length}
          />
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-[999] flex items-center justify-center bg-[#0f1115]/60 backdrop-blur-sm">
            <div
              className="flex items-center gap-2 rounded-lg px-4 py-2 shadow-xl"
              style={{ background: 'var(--bg-card)' }}
            >
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent)' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Sperren werden geladen…
              </span>
            </div>
          </div>
        )}

        {/* Error toast */}
        {error && (
          <div
            className="absolute bottom-6 left-1/2 z-[999] -translate-x-1/2 rounded-lg px-4 py-2 text-sm shadow-xl"
            style={{ background: 'var(--bg-card)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
          >
            Fehler beim Laden: {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && closures.length === 0 && (
          <div className="absolute inset-0 z-[998] flex items-center justify-center pointer-events-none">
            <div
              className="pointer-events-auto flex flex-col items-center gap-3 rounded-2xl px-6 py-5 shadow-2xl text-center mx-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxWidth: 280 }}
            >
              {isDirty ? (
                <>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Keine Sperren gefunden
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Für diese Filter-Kombination gibt es keine aktiven Sperren.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors"
                    style={{ background: 'var(--accent)', color: 'var(--bg-dark)' }}
                  >
                    Filter zurücksetzen
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Keine aktiven Sperren
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    In dieser Region gibt es aktuell keine gemeldeten Sperren.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Report form slide-over */}
      <ReportForm />

      {/* First-visit welcome onboarding — shown once, after initial load */}
      {!loading && showWelcome && <WelcomeSheet onDismiss={dismissWelcome} />}

    </div>
  )
}
