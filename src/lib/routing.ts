import type { ClosureRoutePath } from './types'

interface LatLng {
  lat: number
  lng: number
}

interface OsrmRouteResponse {
  code: string
  routes?: Array<{
    distance: number
    geometry?: {
      type: string
      coordinates: [number, number][]
    }
  }>
}

export interface RouteComputationResult {
  path: ClosureRoutePath
  distanceM: number
}

function isFiniteCoord(value: number): boolean {
  return Number.isFinite(value)
}

function isValidLatLng(p: LatLng): boolean {
  return (
    isFiniteCoord(p.lat) &&
    isFiniteCoord(p.lng) &&
    p.lat >= -90 &&
    p.lat <= 90 &&
    p.lng >= -180 &&
    p.lng <= 180
  )
}

export function buildStraightLinePath(start: LatLng, end: LatLng): ClosureRoutePath {
  return {
    type: 'LineString',
    coordinates: [
      [start.lng, start.lat],
      [end.lng, end.lat],
    ],
  }
}

export async function fetchRoadRoutePath(
  start: LatLng,
  end: LatLng,
): Promise<RouteComputationResult | null> {
  if (!isValidLatLng(start) || !isValidLatLng(end)) return null

  const endpoint =
    `https://router.project-osrm.org/route/v1/bicycle/` +
    `${start.lng},${start.lat};${end.lng},${end.lat}` +
    `?overview=full&geometries=geojson`

  try {
    const response = await fetch(endpoint, { method: 'GET' })
    if (!response.ok) return null

    const data = (await response.json()) as OsrmRouteResponse
    const route = data.routes?.[0]
    if (!route?.geometry) return null

    if (route.geometry.type !== 'LineString') return null
    if (!Array.isArray(route.geometry.coordinates) || route.geometry.coordinates.length < 2) {
      return null
    }

    return {
      path: {
        type: 'LineString',
        coordinates: route.geometry.coordinates,
      },
      distanceM: Math.round(route.distance),
    }
  } catch {
    return null
  }
}
