# Notification E2E Check

Use this before launch and after any notification-related change.

## Preconditions

1. `notify-new-closure` edge function is deployed.
2. Supabase secrets exist:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `APP_URL`
   - `WEBHOOK_SECRET`
3. DB trigger `notify_new_closure_webhook` exists on `public.closures`.
4. A test user has a watch area around the chosen coordinates and email notifications enabled.

## 1. Insert a test closure

Run in Supabase SQL editor:

```sql
INSERT INTO public.closures (
  latitude,
  longitude,
  title,
  description,
  closure_type,
  status,
  severity
)
VALUES (
  46.8276,
  12.7680,
  'E2E test closure',
  'Temporary test for notification pipeline',
  'other',
  'active',
  'warning'
)
RETURNING id, created_at;
```

## 2. Verify function execution

1. Open Supabase Dashboard -> Edge Functions -> `notify-new-closure` -> Logs.
2. Confirm the invocation happened shortly after insert.
3. Confirm there is no `500` log entry.

## 3. Verify email delivery

1. Check recipient inbox (and spam folder).
2. Check Resend logs for delivery status.

## 4. Cleanup test data

```sql
DELETE FROM public.closures
WHERE title = 'E2E test closure';
```

## 5. Pass/Fail criteria

- Pass: function invoked, no runtime error, email delivered.
- Fail: missing invocation, 5xx in logs, or missing delivery in Resend.
