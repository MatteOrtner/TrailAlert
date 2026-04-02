/**
 * @jest-environment node
 */

import { POST } from '../route'

describe('POST /api/telemetry/client-error', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns 400 for invalid json', async () => {
    const req = new Request('http://localhost/api/telemetry/client-error', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{invalid-json',
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when message is missing', async () => {
    const req = new Request('http://localhost/api/telemetry/client-error', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'error' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 202 and logs when payload is valid', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const req = new Request('http://localhost/api/telemetry/client-error', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.10',
      },
      body: JSON.stringify({
        type: 'error',
        message: 'UI crash',
        stack: 'Error: UI crash',
        url: 'https://trailalert.vercel.app',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(202)
    expect(errSpy).toHaveBeenCalledTimes(1)
  })
})
