/**
 * @jest-environment node
 */
import { POST } from '../route'

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/routes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

describe('POST /api/routes', () => {
  afterEach(() => jest.resetAllMocks())

  it('returns 400 when routePoints is missing', async () => {
    const res = await POST(makeRequest({ fileName: 'test.gpx' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('returns 400 when routePoints is empty array', async () => {
    const res = await POST(makeRequest({ routePoints: [], fileName: 'test.gpx' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when routePoints exceeds 10000 points', async () => {
    const points = Array.from({ length: 10001 }, (_, i) => ({ lat: i, lng: i }))
    const res = await POST(makeRequest({ routePoints: points, fileName: 'test.gpx' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when fileName is missing', async () => {
    const res = await POST(makeRequest({ routePoints: [{ lat: 46.0, lng: 12.5 }, { lat: 46.1, lng: 12.6 }] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when fileName is empty string', async () => {
    const res = await POST(makeRequest({ routePoints: [{ lat: 46.0, lng: 12.5 }, { lat: 46.1, lng: 12.6 }], fileName: '  ' }))
    expect(res.status).toBe(400)
  })

  it('returns 201 with id on success', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null })
    ;(createClient as jest.Mock).mockResolvedValue({
      from: () => ({ insert: mockInsert }),
    })

    const res = await POST(makeRequest({
      routePoints: [{ lat: 46.0, lng: 12.5 }, { lat: 46.1, lng: 12.6 }],
      fileName: 'my-tour.gpx',
    }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(typeof json.id).toBe('string')
    expect(json.id).toHaveLength(8)
  })

  it('returns 502 when Supabase insert fails', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: { message: 'db error' } })
    ;(createClient as jest.Mock).mockResolvedValue({
      from: () => ({ insert: mockInsert }),
    })

    const res = await POST(makeRequest({
      routePoints: [{ lat: 46.0, lng: 12.5 }, { lat: 46.1, lng: 12.6 }],
      fileName: 'my-tour.gpx',
    }))
    expect(res.status).toBe(502)
  })
})
