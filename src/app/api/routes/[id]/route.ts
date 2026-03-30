import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ID_PATTERN = /^[A-Za-z0-9_-]{8}$/

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (!ID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: 'Dieser Link ist abgelaufen oder ungültig.' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('shared_routes')
    .select('route_points, file_name')
    .eq('id', id)
    .gt('created_at', thirtyDaysAgo)
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: 'Netzwerkfehler. Bitte versuche es erneut.' },
      { status: 502 },
    )
  }

  if (!data) {
    return NextResponse.json(
      { error: 'Dieser Link ist abgelaufen oder ungültig.' },
      { status: 404 },
    )
  }

  return NextResponse.json({
    routePoints: data.route_points,
    fileName:    data.file_name,
  })
}
