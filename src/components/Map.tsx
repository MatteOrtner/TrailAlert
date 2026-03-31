'use client'

import 'leaflet/dist/leaflet.css'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Circle, Polyline, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import { Locate, Loader2 } from 'lucide-react'
import { useClosures, isDefaultFilters, DEFAULT_FILTERS } from '@/hooks/useClosures'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useReportForm } from '@/contexts/ReportFormContext'
import { useWatchAreaPanel } from '@/contexts/WatchAreaContext'
import { useWatchAreas } from '@/hooks/useWatchAreas'
import { useAuth } from '@/contexts/AuthContext'
import { useHeaderMenu } from '@/contexts/HeaderMenuContext'
import type { SeverityLevel } from '@/lib/types'
import { ClosureMarker } from './ClosureMarker'
import { FilterSidebar, FilterToggleButton } from './FilterSidebar'
import { ReportForm } from './ReportForm'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  full_closure: '#ef4444',
  partial:      '#f59e0b',
  warning:      '#eab308',
}

// OpenTopoMap — topographic tiles with elevation contours, forest roads,
// hiking & MTB trails. Subdomains a/b/c only (d does not exist).
const TILE_URL =
  'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION =
  'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'

// ---------------------------------------------------------------------------
// GPS button — inside MapContainer (needs useMap)
// ---------------------------------------------------------------------------

interface LocationControlProps {
  position:        GeolocationCoordinates | null
  loading:         boolean
  error:           string | null
  requestLocation: () => void
  hidden?:         boolean
}

function LocationControl({ position, loading, error, requestLocation, hidden }: LocationControlProps) {
  const map = useMap()

  useEffect(() => {
    if (position) {
      map.setView([position.latitude, position.longitude], 14, { animate: true })
    }
  }, [position, map])

  if (hidden) return null

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
  const { onPositionPickedRef } = useReportForm()

  useMapEvents({
    click(e) {
      onPositionPickedRef.current?.(e.latlng.lat, e.latlng.lng)
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
  const { position, loading: geoLoading, error: geoError, requestLocation } = useGeolocation()
  const userPosition = position ? { lat: position.latitude, lng: position.longitude } : null
  const { closures, total, loading, error, filters, setFilters } = useClosures(userPosition)
  const { onSuccessRef, isPickingLocation, setAllClosures, draftPath, isDrawingPath, hasDraftPosition } = useReportForm()
  const { user }                          = useAuth()
  const { menuOpen }                      = useHeaderMenu()

  useEffect(() => {
    setAllClosures(closures)
  }, [closures]) // eslint-disable-line react-hooks/exhaustive-deps
  const { areas }                         = useWatchAreas()
  const { isOpen: watchPanelOpen }        = useWatchAreaPanel()
  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const [zoomTarget, setZoomTarget]       = useState<[number, number] | null>(null)
  const [openPopupFor, setOpenPopupFor]   = useState<string | null>(null)
  const isDirty = !isDefaultFilters(filters)

  // Register zoom callback in context so ReportForm can trigger it
  onSuccessRef.current = (lat, lng) => setZoomTarget([lat, lng])

  // Pan to and open popup for a linked closure (e.g. from email notification)
  useEffect(() => {
    if (!targetClosureId || loading) return
    const target = closures.find((c) => c.id === targetClosureId)
    if (!target) return
    setZoomTarget([target.latitude, target.longitude])
    setOpenPopupFor(target.id)
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
        userPosition={userPosition}
        onRequestLocation={requestLocation}
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

          {closures.map((closure) => (
            <ClosureMarker
              key={closure.id}
              closure={closure}
              autoOpen={closure.id === openPopupFor}
            />
          ))}

          {/* Closure path polylines */}
          {closures.map((closure) =>
            closure.path_points && closure.path_points.length >= 2 ? (
              <Polyline
                key={`path-${closure.id}`}
                positions={closure.path_points.map((p) => [p.lat, p.lng] as [number, number])}
                color={SEVERITY_COLORS[closure.severity]}
                weight={5}
                opacity={0.85}
              />
            ) : null
          )}

          {/* Live draft path while reporting */}
          {draftPath.length >= 2 && (
            <Polyline
              positions={draftPath.map((p) => [p.lat, p.lng] as [number, number])}
              color="#ef4444"
              weight={5}
              opacity={0.9}
            />
          )}

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

          {!sidebarOpen && <ZoomControl position="bottomright" />}
          <MapMovementTracker />
          <LocationControl
            position={position}
            loading={geoLoading}
            error={geoError}
            requestLocation={requestLocation}
            hidden={sidebarOpen}
          />
          <MapResizeHandler trigger={sidebarOpen} />
          <ZoomToNewClosureHandler target={zoomTarget} />
          {isPickingLocation && <MapPositionPicker />}
        </MapContainer>

        {/* Crosshair overlay: visible in State A (no position yet) and State C (drawing).
            Hidden in State B (position placed, user deciding whether to draw path). */}
        {isPickingLocation && (!hasDraftPosition || isDrawingPath) && (
          <div
            className="pointer-events-none absolute inset-0 z-[999] flex items-center justify-center"
            style={{ paddingBottom: 100 }}
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="10" stroke="#ef4444" strokeWidth="2.5" fill="none" opacity="0.9"/>
              <line x1="18" y1="0" x2="18" y2="10" stroke="#ef4444" strokeWidth="2" opacity="0.9"/>
              <line x1="18" y1="26" x2="18" y2="36" stroke="#ef4444" strokeWidth="2" opacity="0.9"/>
              <line x1="0" y1="18" x2="10" y2="18" stroke="#ef4444" strokeWidth="2" opacity="0.9"/>
              <line x1="26" y1="18" x2="36" y2="18" stroke="#ef4444" strokeWidth="2" opacity="0.9"/>
              <circle cx="18" cy="18" r="2.5" fill="#ef4444" opacity="0.9"/>
            </svg>
          </div>
        )}

        {/* Filter toggle button — offset below fixed header */}
        <div
          className="absolute left-3 z-[1000] transition-opacity duration-150"
          style={{
            top: 'calc(4rem + 0.75rem)',
            opacity: menuOpen ? 0 : 1,
            pointerEvents: menuOpen ? 'none' : 'auto',
          }}
        >
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

    </div>
  )
}
