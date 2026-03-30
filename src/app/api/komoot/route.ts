import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tourId = searchParams.get('tourId') ?? ''

  if (!tourId || !/^\d+$/.test(tourId)) {
    return NextResponse.json({ error: 'Ungültige Tour-ID.' }, { status: 400 })
  }

  let komootRes: Response
  try {
    komootRes = await fetch(
      `https://www.komoot.com/api/v007/tours/${tourId}.gpx`,
      { headers: { 'User-Agent': 'TrailAlert/1.0' } },
    )
  } catch {
    return NextResponse.json(
      { error: 'Netzwerkfehler. Bitte versuche es erneut.' },
      { status: 502 },
    )
  }

  if (!komootRes.ok) {
    if (komootRes.status >= 500) {
      return NextResponse.json(
        { error: 'Netzwerkfehler. Bitte versuche es erneut.' },
        { status: 502 },
      )
    }
    return NextResponse.json(
      { error: 'Tour nicht gefunden oder privat.' },
      { status: 404 },
    )
  }

  let gpxText: string
  try {
    gpxText = await komootRes.text()
  } catch {
    return NextResponse.json(
      { error: 'Netzwerkfehler. Bitte versuche es erneut.' },
      { status: 502 },
    )
  }

  return new Response(gpxText, {
    status: 200,
    headers: { 'content-type': 'text/xml' },
  })
}
