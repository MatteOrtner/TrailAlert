/**
 * @jest-environment node
 */
import { GET } from '../route'

// Helper to build a NextRequest-like object
function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/komoot')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new Request(url.toString())
}

describe('GET /api/komoot', () => {
  afterEach(() => jest.restoreAllMocks())

  it('returns 400 when tourId is missing', async () => {
    const res = await GET(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('returns 400 when tourId is not numeric', async () => {
    const res = await GET(makeRequest({ tourId: 'abc' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when Komoot returns non-2xx', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('Not Found', { status: 404 })
    )
    const res = await GET(makeRequest({ tourId: '123456789' }))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Tour nicht gefunden oder privat.')
  })

  it('returns GPX text with correct content-type on success', async () => {
    const fakeGpx = '<gpx><trk><trkseg><trkpt lat="46.0" lon="12.5"/></trkseg></trk></gpx>'
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(fakeGpx, { status: 200 })
    )
    const res = await GET(makeRequest({ tourId: '123456789' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/xml')
    const text = await res.text()
    expect(text).toBe(fakeGpx)
  })

  it('returns 502 when fetch throws a network error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))
    const res = await GET(makeRequest({ tourId: '123456789' }))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.error).toBe('Netzwerkfehler. Bitte versuche es erneut.')
  })
})
