'use client'

import 'leaflet/dist/leaflet.css'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Circle, ZoomControl, useMap } from 'react-leaflet'
import { Locate, Loader2 } from 'lucide-react'
import { useClosures, isDefaultFilters } from '@/hooks/useClosures'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useReportForm } from '@/contexts/ReportFormContext'
import { useWatchAreaPanel } from '@/contexts/WatchAreaContext'
import { useWatchAreas } from '@/hooks/useWatchAreas'
import { useAuth } from '@/contexts/AuthContext'
import { ClosureMarker } from './ClosureMarker'
import { FilterSidebar, FilterToggleButton } from './FilterSidebar'
import { ReportForm } from './ReportForm'
import { WatchAreaManager } from './WatchAreaManager'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// OpenTopoMap — topographic, shows elevation contours, forest roads,
// hiking & MTB trails explicitly. Perfect for an alpine trail-closure app.
const TILE_URL =
  'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION =
  'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'

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
// Main Map export
// ---------------------------------------------------------------------------

export default function Map() {
  const { closures, total, loading, error, filters, setFilters } = useClosures()
  const { onSuccessRef }                  = useReportForm()
  const { user }                          = useAuth()
  const { areas }                         = useWatchAreas()
  const { isOpen: watchPanelOpen }        = useWatchAreaPanel()
  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const [zoomTarget, setZoomTarget]       = useState<[number, number] | null>(null)
  const isDirty = !isDefaultFilters(filters)

  // Register zoom callback in context so ReportForm can trigger it
  onSuccessRef.current = (lat, lng) => setZoomTarget([lat, lng])

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
          className="h-full w-full"
          zoomControl={false}
          zoomSnap={0.5}
          zoomDelta={0.5}
          wheelDebounceTime={0}
          inertiaDeceleration={2500}
          easeLinearity={0.35}
        >
          <TileLayer
            url={TILE_URL}
            attribution={TILE_ATTRIBUTION}
            subdomains="abc"
            maxNativeZoom={17}
            maxZoom={20}
            // Pre-load 6 extra tile rows/columns beyond the visible viewport
            keepBuffer={6}
            // Don't swap tiles mid-animation — old tiles stay (scaled) until zoom finishes
            updateWhenZooming={false}
          />

          {closures.map((closure) => (
            <ClosureMarker key={closure.id} closure={closure} />
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
          <LocationControl />
          <MapResizeHandler trigger={sidebarOpen} />
          <ZoomToNewClosureHandler target={zoomTarget} />
        </MapContainer>

        {/* Filter toggle button — offset below fixed header */}
        <div className="absolute left-3 z-[1000]" style={{ top: 'calc(4rem + 0.75rem)' }}>
          <FilterToggleButton
            open={sidebarOpen}
            onClick={() => setSidebarOpen((o) => !o)}
            isDirty={isDirty}
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
          <div
            className="pointer-events-none absolute bottom-6 left-1/2 z-[999] -translate-x-1/2 rounded-lg px-4 py-2 text-sm shadow-xl"
            style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            {isDirty
              ? 'Keine Sperren für diese Filter-Kombination'
              : 'Keine aktiven Sperren in dieser Region'}
          </div>
        )}
      </div>

      {/* Report form slide-over */}
      <ReportForm />

      {/* Watch area manager slide-over */}
      <WatchAreaManager />
    </div>
  )
}
