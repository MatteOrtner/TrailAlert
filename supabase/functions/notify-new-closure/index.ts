// Supabase Edge Function — notify-new-closure
// Triggered via database webhook on INSERT into closures WHERE status = 'active'.
// Finds matching watch areas, sends e-mail via Resend API.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Closure {
  id:           string
  latitude:     number
  longitude:    number
  title:        string
  closure_type: string
  severity:     string
  status:       string
}

interface WatchAreaRow {
  id:           string
  user_id:      string
  center_lat:   number
  center_lng:   number
  radius_km:    number
  name:         string
  notify_email: boolean
}

// ---------------------------------------------------------------------------
// Haversine distance in km
// ---------------------------------------------------------------------------

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ---------------------------------------------------------------------------
// German labels
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  forestwork:   'Forstarbeiten',
  construction: 'Bauarbeiten',
  damage:       'Wegschaden',
  other:        'Sonstiges',
}

const SEVERITY_LABELS: Record<string, string> = {
  full_closure: 'Vollsperrung',
  partial:      'Teilsperrung',
  warning:      'Warnung',
}

// ---------------------------------------------------------------------------
// Email HTML template
// ---------------------------------------------------------------------------

function buildEmail(closure: Closure, areaName: string, appUrl: string): string {
  const mapLink   = `${appUrl}/?closure=${closure.id}`
  const typeLabel = TYPE_LABELS[closure.closure_type] ?? closure.closure_type
  const sevLabel  = SEVERITY_LABELS[closure.severity]  ?? closure.severity

  return `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1115;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1115;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#1a1d24;border-radius:12px;border:1px solid #2a2e38;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:#1a1d24;padding:24px 28px 16px;border-bottom:1px solid #2a2e38;">
          <span style="font-size:20px;font-weight:800;color:#f1f3f7;">Trail<span style="color:#f59e0b;">Alert</span></span>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 8px;font-size:13px;color:#8b92a5;text-transform:uppercase;letter-spacing:.05em;">
            Neue Sperre in deinem Gebiet
          </p>
          <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#f1f3f7;line-height:1.3;">
            ${areaName}
          </h1>

          <!-- Closure card -->
          <div style="background:#0f1115;border:1px solid #2a2e38;border-radius:8px;padding:16px;margin-bottom:24px;">
            <div style="margin-bottom:8px;">
              <span style="display:inline-block;background:#ef444426;color:#ef4444;font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;">
                ${sevLabel}
              </span>
              <span style="display:inline-block;background:#2a2e38;color:#8b92a5;font-size:11px;font-weight:500;padding:2px 8px;border-radius:4px;margin-left:6px;">
                ${typeLabel}
              </span>
            </div>
            <p style="margin:0;font-size:16px;font-weight:600;color:#f1f3f7;">${closure.title}</p>
          </div>

          <a href="${mapLink}"
             style="display:block;text-align:center;background:#f59e0b;color:#0f1115;font-size:14px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">
            Auf der Karte ansehen →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 28px;border-top:1px solid #2a2e38;">
          <p style="margin:0;font-size:11px;color:#8b92a5;">
            Du erhältst diese E-Mail weil du Watch Areas in TrailAlert aktiviert hast.
            Benachrichtigungen kannst du in der App unter Watch Areas deaktivieren.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  // Validate shared secret to prevent unauthorized calls
  const secret   = Deno.env.get('WEBHOOK_SECRET')
  const authHeader = req.headers.get('x-webhook-secret')
  if (secret && authHeader !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  let closure: Closure
  try {
    const body = await req.json()
    // Supabase DB webhooks send { type, table, record, ... }
    closure = body.record ?? body
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Only process active closures
  if (closure.status !== 'active') {
    return new Response('Not active — skipped', { status: 200 })
  }

  // --- Supabase admin client ---
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // --- Find matching watch areas ---
  const { data: allAreas, error: areasErr } = await supabase
    .from('watch_areas')
    .select('*')
    .eq('notify_email', true)

  if (areasErr || !allAreas) {
    console.error('Failed to fetch watch areas:', areasErr?.message)
    return new Response('DB error', { status: 500 })
  }

  const matching: WatchAreaRow[] = allAreas.filter((area: WatchAreaRow) => {
    const distKm = haversineKm(
      area.center_lat, area.center_lng,
      closure.latitude, closure.longitude
    )
    return distKm <= area.radius_km
  })

  if (matching.length === 0) {
    return new Response('No matching watch areas', { status: 200 })
  }

  // --- Resolve user emails ---
  const userIds = [...new Set(matching.map((a) => a.user_id))]

  // admin.listUsers doesn't paginate easily; use a direct auth query instead
  const emailMap = new Map<string, string>()
  for (const uid of userIds) {
    const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(uid)
    if (!userErr && user?.email) emailMap.set(uid, user.email)
  }

  // --- Send emails via Resend ---
  const resendKey = Deno.env.get('RESEND_API_KEY')!
  const appUrl    = Deno.env.get('APP_URL') ?? 'https://trailalert.vercel.app'
  const fromAddr  = Deno.env.get('EMAIL_FROM') ?? 'TrailAlert <onboarding@resend.dev>'

  const sends = matching.map(async (area) => {
    const email = emailMap.get(area.user_id)
    if (!email) return

    const areaName = area.name
      || `${area.center_lat.toFixed(3)}, ${area.center_lng.toFixed(3)}`

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    fromAddr,
        to:      [email],
        subject: `Neue Sperre in deinem Gebiet „${areaName}": ${closure.title}`,
        html:    buildEmail(closure, areaName, appUrl),
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`Resend failed for ${email}:`, text)
    }
  })

  await Promise.all(sends)

  return new Response(
    JSON.stringify({ sent: matching.length }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
