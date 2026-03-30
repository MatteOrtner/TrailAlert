import { haversineMeters, pointToSegmentMeters } from '../geo'

describe('haversineMeters', () => {
  it('returns 0 for identical points', () => {
    expect(haversineMeters(46.8, 12.7, 46.8, 12.7)).toBe(0)
  })

  it('returns ~111 195 m for 1 degree latitude at the equator', () => {
    expect(haversineMeters(0, 0, 1, 0)).toBeCloseTo(111_195, -3)
  })

  it('is symmetric', () => {
    const d1 = haversineMeters(46.8, 12.7, 46.85, 12.75)
    const d2 = haversineMeters(46.85, 12.75, 46.8, 12.7)
    expect(d1).toBeCloseTo(d2, 5)
  })
})

describe('pointToSegmentMeters', () => {
  it('returns 0 when point lies on the segment midpoint', () => {
    const a = { lat: 0, lng: 0 }
    const b = { lat: 0, lng: 0.002 }
    const p = { lat: 0, lng: 0.001 }
    expect(pointToSegmentMeters(p, a, b)).toBeCloseTo(0, 0)
  })

  it('snaps to endpoint A when projection falls before the segment', () => {
    const a = { lat: 0, lng: 0 }
    const b = { lat: 0, lng: 0.001 }
    const p = { lat: 0, lng: -0.001 }
    const expected = haversineMeters(p.lat, p.lng, a.lat, a.lng)
    expect(pointToSegmentMeters(p, a, b)).toBeCloseTo(expected, 1)
  })

  it('returns perpendicular distance when projection is within the segment', () => {
    const a = { lat: 0, lng: 0 }
    const b = { lat: 0, lng: 0.002 }
    const p = { lat: 0.0009, lng: 0.001 }
    const d = pointToSegmentMeters(p, a, b)
    expect(d).toBeGreaterThan(50)
    expect(d).toBeLessThan(150)
  })

  it('handles zero-length segment by returning distance to the point', () => {
    const a = { lat: 46.8, lng: 12.7 }
    const b = { lat: 46.8, lng: 12.7 }
    const p = { lat: 46.81, lng: 12.7 }
    expect(pointToSegmentMeters(p, a, b)).toBeCloseTo(
      haversineMeters(p.lat, p.lng, a.lat, a.lng), 1,
    )
  })
})
