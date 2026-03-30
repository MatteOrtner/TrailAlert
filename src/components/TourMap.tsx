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
