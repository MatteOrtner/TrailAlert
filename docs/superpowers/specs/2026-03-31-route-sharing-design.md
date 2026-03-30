# Design: Route Sharing

**Date:** 2026-03-31

---

## Overview

After uploading a GPX file on `/tour-check`, users can share their checked route with others via a short link (e.g. `https://trailalert.vercel.app/tour-check?route=a3kx9mPq`). The link opens the route on the map with all active closure warnings visible — no upload required for the recipient.

Routes are stored anonymously in Supabase for 30 days, then automatically deleted.

**Scope:** GPX upload only (no Komoot). No login required. No editing or deleting shared routes.

---

## Database

### Table: `shared_routes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` PRIMARY KEY | 8-character random alphanumeric ID (e.g. `a3kx9mPq`) |
| `route_points` | `jsonb` | Array of `{ lat: number, lng: number }` |
| `file_name` | `text` | Original filename for display |
| `created_at` | `timestamptz` | Default `now()` |

**RLS policies:**
- `SELECT`: everyone (needed to load shared links)
- `INSERT`: everyone (no login required)
- `UPDATE`: nobody
- `DELETE`: nobody (deletion handled by pg_cron)

**Auto-expiry:** Supabase pg_cron job runs daily and deletes rows where `created_at < now() - interval '30 days'`.

**Migration file:** `supabase/migrations/006_shared_routes.sql`

---

## API Routes

### `POST /api/routes`

**Request body:** `{ routePoints: { lat: number; lng: number }[], fileName: string }`

**Validation:**
- `routePoints` must be a non-empty array with at most 10,000 points
- Each point must have finite `lat` and `lng`
- `fileName` must be a non-empty string (trimmed, max 255 chars)

**Flow:**
1. Validate input → 400 on failure
2. Generate 8-character random ID using `crypto.randomBytes(6).toString('base64url').slice(0, 8)`
3. Insert into `shared_routes`
4. Return `{ id: string }` with status 201

### `GET /api/routes/[id]`

**Validation:** `id` must match `/^[A-Za-z0-9_-]{8}$/`

**Flow:**
1. Validate id format → 400 on failure
2. Query Supabase: `SELECT * FROM shared_routes WHERE id = ? AND created_at > now() - interval '30 days'`
3. Not found or expired → 404 with `{ error: "Dieser Link ist abgelaufen oder ungültig." }`
4. Found → 200 with `{ routePoints, fileName }`

---

## Client Changes: `TourCheckClient.tsx`

### New state
- `shareLoading: boolean` — shows spinner on share button while saving
- `shareCopied: boolean` — shows checkmark briefly after copy (resets after 2s)

### Share button placement
Inside the status banner (after the text), right-aligned:

```
[ ✓ Alles klar — keine Sperren auf deiner Route        [share icon] ]
[ ⚠ 2 Sperren auf deiner Route                         [share icon] ]
```

The share icon button is shown whenever `fileName` is set and `fileError` is null.

### Share flow
1. User clicks share icon
2. `setShareLoading(true)`, POST to `/api/routes` with `{ routePoints, fileName }`
3. On success: construct full URL `${window.location.origin}/tour-check?route=${id}`, copy to clipboard via `navigator.clipboard.writeText()`
4. `setShareLoading(false)`, `setShareCopied(true)`, reset to false after 2000ms
5. On error: `setFileError('Route konnte nicht geteilt werden. Bitte versuche es erneut.')`

### Shared link loading
On mount, `TourCheckClient` checks `new URLSearchParams(window.location.search).get('route')`.

If present:
1. Show a loading state (spinner, no upload area)
2. `GET /api/routes/[id]`
3. On success: call existing `applyPoints(routePoints, fileName)` — identical to file upload flow
4. On 404: show error "Dieser Link ist abgelaufen oder ungültig." with upload area visible
5. On network error: show "Netzwerkfehler. Bitte versuche es erneut." with upload area visible

The upload area and export instructions are hidden while a shared route is displayed. User can click × (existing clear button) to dismiss and return to upload view.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/006_shared_routes.sql` | Table + RLS + pg_cron job |
| Create | `src/app/api/routes/route.ts` | POST handler |
| Create | `src/app/api/routes/[id]/route.ts` | GET handler |
| Modify | `src/app/tour-check/TourCheckClient.tsx` | Share button + shared link loading |

---

## Error Cases

| Situation | Message |
|-----------|---------|
| POST fails (network) | `Route konnte nicht geteilt werden. Bitte versuche es erneut.` |
| Shared route not found / expired | `Dieser Link ist abgelaufen oder ungültig.` |
| GET network error | `Netzwerkfehler. Bitte versuche es erneut.` |
| Invalid id format in URL | Treated as "not found" — show expired message |

---

## Out of Scope

- Login required to share
- Editing or deleting shared routes
- Viewing a list of your own shared routes
- Route expiry notifications
- Sharing with custom expiry duration
