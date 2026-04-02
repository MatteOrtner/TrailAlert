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

interface RouteProvider {
  buildUrl: (start: LatLng, end: LatLng) => string
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

const ROUTE_PROVIDERS: RouteProvider[] = [
  {
    // This server runs a bike-optimized graph and returns much better local
    // trail/forest-road routes than the generic public OSRM endpoint.
    buildUrl: (start, end) =>
      `https://routing.openstreetmap.de/routed-bike/route/v1/driving/` +
      `${start.lng},${start.lat};${end.lng},${end.lat}` +
      `?overview=full&geometries=geojson`,
  },
  {
    buildUrl: (start, end) =>
      `https://routing.openstreetmap.de/routed-foot/route/v1/driving/` +
      `${start.lng},${start.lat};${end.lng},${end.lat}` +
      `?overview=full&geometries=geojson`,
  },
  {
    buildUrl: (start, end) =>
      `https://router.project-osrm.org/route/v1/cycling/` +
      `${start.lng},${start.lat};${end.lng},${end.lat}` +
      `?overview=full&geometries=geojson`,
  },
]

async function fetchRouteFromProvider(
  provider: RouteProvider,
  start: LatLng,
  end: LatLng,
): Promise<RouteComputationResult | null> {
  const endpoint = provider.buildUrl(start, end)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 7000)

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!response.ok) return null

    const data = (await response.json()) as OsrmRouteResponse
    const route = data.routes?.[0]
    if (!route?.geometry) return null
    if (route.geometry.type !== 'LineString') return null
    if (!Array.isArray(route.geometry.coordinates) || route.geometry.coordinates.length < 2) {
      return null
    }

    const roundedDistance = Math.max(1, Math.round(route.distance))

    return {
      path: {
        type: 'LineString',
        coordinates: route.geometry.coordinates,
      },
      distanceM: roundedDistance,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function fetchRoadRoutePath(
  start: LatLng,
  end: LatLng,
): Promise<RouteComputationResult | null> {
  if (!isValidLatLng(start) || !isValidLatLng(end)) return null

  const results = await Promise.all(
    ROUTE_PROVIDERS.map((provider) => fetchRouteFromProvider(provider, start, end)),
  )

  const validResults = results.filter((r): r is RouteComputationResult => r !== null)
  if (validResults.length === 0) return null

  // Keep the shortest available route across providers.
  validResults.sort((a, b) => a.distanceM - b.distanceM)
  return validResults[0]
}
