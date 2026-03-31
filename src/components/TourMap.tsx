import 'leaflet/dist/leaflet.css'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet'
import { ClosureMarker } from './ClosureMarker'
import type { LatLng } from '@/lib/geo'
import type { Closure, SeverityLevel } from '@/lib/types'

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  full_closure: '#ef4444',
  partial:      '#f59e0b',
  warning:      '#eab308',
}

const TILE_URL         = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'

// Osttirol centre — shown before any GPX is loaded
const DEFAULT_CENTER: [number, number] = [46.8489, 12.7672]
const DEFAULT_ZOOM = 11

// ---------------------------------------------------------------------------
// Fits the map to the route bounds whenever the route changes
// ---------------------------------------------------------------------------
function FitBoundsController({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  const prevLen = useRef(0)

  useEffect(() => {
    if (positions.length < 2) return
    if (positions.length === prevLen.current) return
    prevLen.current = positions.length

    const lats = positions.map((p) => p[0])
    const lngs = positions.map((p) => p[1])
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      { padding: [32, 32], animate: true, duration: 0.8 },
    )
  }, [positions, map])

  return null
}

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
      attributionControl={false}
    >
      <TileLayer
        url={TILE_URL}
        attribution={TILE_ATTRIBUTION}
        subdomains={['a', 'b', 'c']}
        maxZoom={17}
      />

      {positions.length > 1 && (
        <Polyline positions={positions} color="#3b82f6" weight={5} opacity={0.9} />
      )}

      {closures.map((c) => (
        <ClosureMarker
          key={c.id}
          closure={c}
          autoOpen={c.id === selectedClosureId}
        />
      ))}

      {closures.map((c) =>
        c.path_points && c.path_points.length >= 2 ? (
          <Polyline
            key={`path-${c.id}`}
            positions={c.path_points.map((p) => [p.lat, p.lng] as [number, number])}
            color={SEVERITY_COLORS[c.severity]}
            weight={5}
            opacity={0.85}
          />
        ) : null
      )}

      <FitBoundsController positions={positions} />
      <FlyToController closureId={selectedClosureId} closures={closures} />
    </MapContainer>
  )
}
