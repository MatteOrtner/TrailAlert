# TrailAlert Incident Runbook

This runbook is for production incidents after launch (app outage, DB issue, notification failure).

## 1. Triage (first 5-10 minutes)

1. Confirm scope: is the issue affecting all users or only specific actions?
2. Check recent deployments on Vercel and Supabase.
3. Check logs:
   - Vercel function/runtime logs
   - Supabase Edge Function logs (`notify-new-closure`)
   - Supabase Database and Auth logs
4. Classify severity:
   - `SEV1`: app unusable or data integrity risk
   - `SEV2`: major feature broken (for example, notifications)
   - `SEV3`: degraded but usable

## 2. Immediate Mitigation

### A) Notification spam or failing webhook

Disable closure webhook trigger immediately:

```sql
DROP TRIGGER IF EXISTS notify_new_closure_webhook ON public.closures;
```

### B) Broken deployment on Vercel

Rollback to previous successful deployment in Vercel dashboard.

### C) Edge function secret/config issue

Rotate and re-set the following Supabase secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `APP_URL`
- `WEBHOOK_SECRET`

Then redeploy function:

```bash
supabase functions deploy notify-new-closure
```

## 3. Data Safety Checks

Run these SQL checks in Supabase SQL editor:

```sql
-- Check closure trigger status
SELECT t.tgname
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'closures' AND NOT t.tgisinternal;
```

```sql
-- Verify vote security policies
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'votes'
ORDER BY policyname;
```

```sql
-- Verify shared route cleanup job
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname = 'delete-expired-shared-routes';
```

## 4. Recovery and Verification

1. Re-enable/repair the failed component.
2. Run smoke checks:
   - Create closure
   - Cast vote
   - Open admin page
   - Trigger and receive test notification email
3. Watch logs for at least 15 minutes.

## 5. Post-Incident Follow-up (same day)

1. Document root cause and timeline.
2. Add preventive action:
   - test coverage
   - monitoring alert
   - configuration guard
3. Link this runbook entry to the fix PR/commit.
