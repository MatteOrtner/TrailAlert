/**
 * @jest-environment node
 */

jest.mock('@/lib/constants', () => ({
  ADMIN_EMAILS: ['admin@example.com'],
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PATCH, DELETE } from '../route'

function mockAuthUser(email: string | null) {
  ;(createClient as jest.Mock).mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: email ? { email } : null },
      }),
    },
  })
}

describe('/api/admin/closures/[id]', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('PATCH returns 403 for non-admin', async () => {
    mockAuthUser('user@example.com')

    const req = new Request('http://localhost/api/admin/closures/abc', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: 'abc' }) })
    expect(res.status).toBe(403)
  })

  it('PATCH returns 400 for invalid status', async () => {
    mockAuthUser('admin@example.com')

    const req = new Request('http://localhost/api/admin/closures/abc', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'not-a-status' }),
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: 'abc' }) })
    expect(res.status).toBe(400)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('PATCH updates closure status for admin', async () => {
    mockAuthUser('admin@example.com')

    const eq = jest.fn().mockResolvedValue({ error: null })
    const update = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ update }))
    ;(createAdminClient as jest.Mock).mockReturnValue({ from })

    const req = new Request('http://localhost/api/admin/closures/abc', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: 'abc' }) })
    expect(res.status).toBe(200)
    expect(from).toHaveBeenCalledWith('closures')
    expect(update).toHaveBeenCalledWith({ status: 'resolved' })
    expect(eq).toHaveBeenCalledWith('id', 'abc')
  })

  it('PATCH returns 502 when admin update fails', async () => {
    mockAuthUser('admin@example.com')

    const eq = jest.fn().mockResolvedValue({ error: { message: 'db fail' } })
    const update = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ update }))
    ;(createAdminClient as jest.Mock).mockReturnValue({ from })

    const req = new Request('http://localhost/api/admin/closures/abc', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: 'abc' }) })
    expect(res.status).toBe(502)
  })

  it('DELETE removes closure for admin', async () => {
    mockAuthUser('admin@example.com')

    const eq = jest.fn().mockResolvedValue({ error: null })
    const del = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ delete: del }))
    ;(createAdminClient as jest.Mock).mockReturnValue({ from })

    const req = new Request('http://localhost/api/admin/closures/abc', {
      method: 'DELETE',
    })

    const res = await DELETE(req, { params: Promise.resolve({ id: 'abc' }) })
    expect(res.status).toBe(200)
    expect(from).toHaveBeenCalledWith('closures')
    expect(del).toHaveBeenCalledTimes(1)
    expect(eq).toHaveBeenCalledWith('id', 'abc')
  })
})
