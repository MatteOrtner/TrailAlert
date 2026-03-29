'use client'

import { useMemo, useRef, useEffect } from 'react'
import L from 'leaflet'
import { Marker } from 'react-leaflet'
import type { Marker as LeafletMarker } from 'leaflet'
import type { Closure, SeverityLevel } from '@/lib/types'
import { ClosurePopup } from './ClosurePopup'

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  full_closure: '#ef4444',
  partial:      '#f59e0b',
  warning:      '#eab308',
}

function isNew(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000
}

function createIcon(color: string, pulse: boolean): L.DivIcon {
  const ring = pulse
    ? `<div class="ta-marker-ring" style="--marker-color:${color}"></div>`
    : ''

  return L.divIcon({
    className: '',
    html: `
      <div class="ta-marker">
        ${ring}
        <div class="ta-marker-dot" style="--marker-color:${color}"></div>
      </div>
    `,
    iconSize:    [26, 26],
    iconAnchor:  [13, 13],
    popupAnchor: [0, -17],
  })
}

interface Props {
  closure:  Closure
  autoOpen?: boolean
}

export function ClosureMarker({ closure, autoOpen }: Props) {
  const color     = SEVERITY_COLORS[closure.severity]
  const pulse     = isNew(closure.created_at)
  const icon      = useMemo(() => createIcon(color, pulse), [color, pulse])
  const markerRef = useRef<LeafletMarker | null>(null)

  useEffect(() => {
    if (autoOpen && markerRef.current) {
      // Small delay lets the map finish panning before opening the popup
      const t = setTimeout(() => markerRef.current?.openPopup(), 400)
      return () => clearTimeout(t)
    }
  }, [autoOpen])

  return (
    <Marker
      position={[closure.latitude, closure.longitude]}
      icon={icon}
      ref={markerRef}
    >
      <ClosurePopup closure={closure} />
    </Marker>
  )
}
