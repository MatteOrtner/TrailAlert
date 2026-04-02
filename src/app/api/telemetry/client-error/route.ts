import { NextResponse } from 'next/server'

interface ClientErrorBody {
  type?: 'error' | 'unhandledrejection'
  message?: string
  stack?: string | null
  source?: string | null
  line?: number | null
  column?: number | null
  url?: string
  userAgent?: string
  timestamp?: string
}

function clamp(input: string | null | undefined, max = 4000): string | null {
  if (!input) return null
  return input.length > max ? input.slice(0, max) : input
}

export async function POST(request: Request) {
  let body: ClientErrorBody
  try {
    body = (await request.json()) as ClientErrorBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const message = clamp(body.message)
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim() ?? null

  const entry = {
    kind: 'client_error',
    type: body.type ?? 'error',
    message,
    stack: clamp(body.stack),
    source: clamp(body.source, 1024),
    line: body.line ?? null,
    column: body.column ?? null,
    url: clamp(body.url, 2048),
    userAgent: clamp(body.userAgent, 2048),
    timestamp: body.timestamp ?? new Date().toISOString(),
    ip,
    receivedAt: new Date().toISOString(),
  }

  // Emitted to Vercel/server logs for alerting + debugging.
  console.error('[telemetry:client-error]', JSON.stringify(entry))

  return NextResponse.json({ ok: true }, { status: 202 })
}
