import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const { routePoints, fileName } = body as { routePoints: unknown; fileName: unknown }

  if (
    !Array.isArray(routePoints) ||
    routePoints.length === 0 ||
    routePoints.length > 10_000
  ) {
    return NextResponse.json(
      { error: 'routePoints muss ein Array mit 1–10.000 Punkten sein.' },
      { status: 400 },
    )
  }

  if (typeof fileName !== 'string' || fileName.trim().length === 0) {
    return NextResponse.json(
      { error: 'fileName darf nicht leer sein.' },
      { status: 400 },
    )
  }

  const id = crypto.randomBytes(6).toString('base64url').slice(0, 8)

  const supabase = await createClient()
  const { error } = await supabase.from('shared_routes').insert({
    id,
    route_points: routePoints,
    file_name:    fileName.trim().slice(0, 255),
  })

  if (error) {
    return NextResponse.json(
      { error: 'Route konnte nicht gespeichert werden.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ id }, { status: 201 })
}
