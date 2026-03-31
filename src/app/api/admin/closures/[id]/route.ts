import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ADMIN_EMAILS } from '@/lib/constants'

type Params = { params: Promise<{ id: string }> }

// Verify the caller is an authenticated admin
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email || !ADMIN_EMAILS.includes(user.email)) {
    return null
  }
  return user
}

// PATCH /api/admin/closures/[id]  — update status
export async function PATCH(request: Request, { params }: Params) {
  const user = await requireAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 })
  }

  const { id } = await params
  const { status } = await request.json()

  const admin = createAdminClient()
  const { error } = await admin.from('closures').update({ status }).eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/closures/[id]
export async function DELETE(_request: Request, { params }: Params) {
  const user = await requireAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 })
  }

  const { id } = await params

  const admin = createAdminClient()
  const { error } = await admin.from('closures').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
