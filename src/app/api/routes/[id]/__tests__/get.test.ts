/**
 * @jest-environment node
 */
import { GET } from '../route'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

function makeRequest(id: string) {
  return new Request(`http://localhost/api/routes/${id}`)
}

function makeParams(id: string) {
  return Promise.resolve({ id })
}

describe('GET /api/routes/[id]', () => {
  afterEach(() => jest.resetAllMocks())

  it('returns 400 for invalid id format', async () => {
    const res = await GET(makeRequest('bad!id'), { params: makeParams('bad!id') })
    expect(res.status).toBe(400)
  })

  it('returns 404 when route not found', async () => {
    const mockSelect = jest.fn().mockResolvedValue({ data: null, error: null })
    ;(createClient as jest.Mock).mockResolvedValue({
      from: () => ({
        select: () => ({ eq: () => ({ gt: () => ({ single: mockSelect }) }) }),
      }),
    })

    const res = await GET(makeRequest('abc12345'), { params: makeParams('abc12345') })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Dieser Link ist abgelaufen oder ungültig.')
  })

  it('returns 200 with routePoints and fileName on success', async () => {
    const fakeRoute = {
      route_points: [{ lat: 46.0, lng: 12.5 }, { lat: 46.1, lng: 12.6 }],
      file_name: 'my-tour.gpx',
    }
    const mockSelect = jest.fn().mockResolvedValue({ data: fakeRoute, error: null })
    ;(createClient as jest.Mock).mockResolvedValue({
      from: () => ({
        select: () => ({ eq: () => ({ gt: () => ({ single: mockSelect }) }) }),
      }),
    })

    const res = await GET(makeRequest('abc12345'), { params: makeParams('abc12345') })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.routePoints).toEqual(fakeRoute.route_points)
    expect(json.fileName).toBe(fakeRoute.file_name)
  })

  it('returns 502 when Supabase returns an error', async () => {
    const mockSelect = jest.fn().mockResolvedValue({ data: null, error: { message: 'db error' } })
    ;(createClient as jest.Mock).mockResolvedValue({
      from: () => ({
        select: () => ({ eq: () => ({ gt: () => ({ single: mockSelect }) }) }),
      }),
    })

    const res = await GET(makeRequest('abc12345'), { params: makeParams('abc12345') })
    expect(res.status).toBe(502)
  })
})
