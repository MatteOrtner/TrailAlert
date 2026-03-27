'use client'

// Loaded via dynamic import (ssr:false) from ReportForm — do NOT import directly.

import 'leaflet/dist/leaflet.css'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

const MARKER_ICON = L.divIcon({
  className: '',
  html: `
    <div class="ta-marker">
      <div class="ta-marker-ring" style="--marker-color:#f59e0b"></div>
      <div class="ta-marker-dot" style="--marker-color:#f59e0b"></div>
    </div>
  `,
  iconSize:    [20, 20],
  iconAnchor:  [10, 10],
  popupAnchor: [0, -14],
})

// ---------------------------------------------------------------------------
// Click handler — inner component that must live inside MapContainer
// ---------------------------------------------------------------------------

interface ClickHandlerProps {
  onPick: (lat: number, lng: number) => void
}

function ClickHandler({ onPick }: ClickHandlerProps) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// ---------------------------------------------------------------------------
// PositionPicker
// ---------------------------------------------------------------------------

export interface PositionPickerProps {
  value: { lat: number; lng: number } | null
  onChange: (pos: { lat: number; lng: number }) => void
}

export default function PositionPicker({ value, onChange }: PositionPickerProps) {
  // Track key to force re-center only on first pick
  const [markerPos, setMarkerPos] = useState(value)

  useEffect(() => {
    setMarkerPos(value)
  }, [value])

  function handlePick(lat: number, lng: number) {
    onChange({ lat, lng })
    setMarkerPos({ lat, lng })
  }

  function handleDragEnd(e: L.DragEndEvent) {
    const pos = (e.target as L.Marker).getLatLng()
    onChange({ lat: pos.lat, lng: pos.lng })
    setMarkerPos({ lat: pos.lat, lng: pos.lng })
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className="overflow-hidden rounded-lg"
        style={{ height: 220, border: '1px solid var(--border)', cursor: 'crosshair' }}
      >
        <MapContainer
          center={[46.83, 12.76]}
          zoom={10}
          className="h-full w-full"
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} subdomains="abcd" />
          <ClickHandler onPick={handlePick} />
          {markerPos && (
            <Marker
              position={[markerPos.lat, markerPos.lng]}
              icon={MARKER_ICON}
              draggable
              eventHandlers={{ dragend: handleDragEnd }}
            />
          )}
        </MapContainer>
      </div>

      {markerPos ? (
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--accent)' }}>✓</span>{' '}
          {markerPos.lat.toFixed(5)}, {markerPos.lng.toFixed(5)}
        </p>
      ) : (
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Auf die Karte klicken um die Position zu setzen
        </p>
      )}
    </div>
  )
}
