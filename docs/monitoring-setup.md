# Monitoring Setup

This setup gives TrailAlert a practical launch baseline for uptime, errors and performance.

## 1. Health check endpoint

TrailAlert now exposes:

- `GET /api/health`

Use this endpoint for uptime checks and deploy smoke checks.

## 2. Uptime monitoring

Recommended: UptimeRobot, Better Stack, or similar.

1. Add monitor URL: `https://<your-domain>/api/health`
2. Interval: every 5 minutes
3. Alert channels: e-mail + mobile push
4. Alert if response is non-200 for 2 consecutive checks

## 3. Client error telemetry

Client runtime errors are forwarded to:

- `POST /api/telemetry/client-error`

The route logs normalized error events to server logs (for Vercel log search + alerting).

Disable if needed:

```env
NEXT_PUBLIC_CLIENT_ERROR_REPORTING=false
```

## 4. Vercel observability

1. Enable Vercel Analytics and Speed Insights in the project dashboard.
2. Create alerts for:
   - Function errors > 0 in 5 minutes
   - 5xx rate spikes
   - p95 latency regression

## 5. Supabase observability

1. Monitor:
   - Edge Function failures (`notify-new-closure`)
   - Database errors
   - Auth anomalies
2. Keep these checks in your runbook cadence:
   - `npx supabase db advisors --linked`
   - `npx supabase migration list --linked`

## 6. Security note

Supabase advisor may still show `auth_leaked_password_protection` on Free plan.
This specific control can only be enabled on Pro plan and above.
