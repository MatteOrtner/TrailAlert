/**
 * @jest-environment node
 */

import { GET } from '../route'

describe('GET /api/health', () => {
  it('returns ok payload', async () => {
    const res = await GET()
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.status).toBe('ok')
    expect(json.service).toBe('trailalert-web')
    expect(typeof json.timestamp).toBe('string')
    expect(typeof json.checks.env.hasSupabaseUrl).toBe('boolean')
    expect(typeof json.checks.env.hasSupabaseAnonKey).toBe('boolean')
  })
})
