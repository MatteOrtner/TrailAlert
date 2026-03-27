'use client'

import { useMemo } from 'react'
import L from 'leaflet'
import { Marker } from 'react-leaflet'
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
  closure: Closure
}

export function ClosureMarker({ closure }: Props) {
  const color = SEVERITY_COLORS[closure.severity]
  const pulse = isNew(closure.created_at)

  const icon = useMemo(() => createIcon(color, pulse), [color, pulse])

  return (
    <Marker
      position={[closure.latitude, closure.longitude]}
      icon={icon}
    >
      <ClosurePopup closure={closure} />
    </Marker>
  )
}
