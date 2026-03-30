export interface LatLng {
  lat: number
  lng: number
}

/**
 * Great-circle distance in metres between two lat/lng points (Haversine formula).
 */
export function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R    = 6_371_000
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Minimum distance in metres from point P to line segment A→B.
 * Projects P onto the segment; clamps the parameter t to [0, 1]
 * so the result never falls outside the segment.
 */
export function pointToSegmentMeters(p: LatLng, a: LatLng, b: LatLng): number {
  const dx    = b.lng - a.lng
  const dy    = b.lat - a.lat
  const lenSq = dx * dx + dy * dy

  if (lenSq === 0) return haversineMeters(p.lat, p.lng, a.lat, a.lng)

  const t = Math.max(0, Math.min(1,
    ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / lenSq,
  ))

  return haversineMeters(p.lat, p.lng, a.lat + t * dy, a.lng + t * dx)
}
