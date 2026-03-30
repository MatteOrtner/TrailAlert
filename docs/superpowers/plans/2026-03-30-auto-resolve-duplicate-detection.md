# Auto-Resolve & Duplicate Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-resolve closures when community deny votes signal they are clear (last-5-votes pattern), flag ambiguous cases for admin review, and warn reporters about nearby active closures before they submit a duplicate.

**Architecture:** A new DB migration adds `pending_review` to the `closure_status` enum and replaces the vote-count trigger with logic that inspects the last 5 votes after every vote change. Duplicate detection runs entirely client-side in `ReportForm` using a Haversine check against closures passed through `ReportFormContext`. The admin dashboard gains a status filter and actions for `pending_review` closures.

**Tech Stack:** PostgreSQL trigger (PL/pgSQL), Supabase migrations, TypeScript, React context, Tailwind CSS, Next.js App Router.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/004_add_pending_review_status.sql` | Add `pending_review` value to `closure_status` enum |
| Create | `supabase/migrations/005_auto_resolve_vote_trigger.sql` | Replace vote trigger with last-5-votes auto-resolve logic |
| Modify | `src/lib/types.ts` | Add `'pending_review'` to `ClosureStatus` union type |
| Modify | `src/contexts/ReportFormContext.tsx` | Add `allClosures` + `setAllClosures` to context |
| Modify | `src/components/Map.tsx` | Sync loaded closures into context via `setAllClosures` |
| Modify | `src/components/ReportForm.tsx` | Haversine check on position pick + warning banner UI |
| Modify | `src/app/admin/AdminDashboardClient.tsx` | `pending_review` stats card, status filter tabs, resolve/reactivate actions |

---

## Task 1: Update TypeScript types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add `pending_review` to `ClosureStatus`**

In `src/lib/types.ts`, change line:
```typescript
export type ClosureStatus = 'active' | 'resolved' | 'unconfirmed'
```
to:
```typescript
export type ClosureStatus = 'active' | 'resolved' | 'unconfirmed' | 'pending_review'
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors (existing casts in `AdminDashboardClient` will need updating in Task 7 — the compiler will tell you).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add pending_review to ClosureStatus"
```

---

## Task 2: DB Migration — add `pending_review` enum value

**Files:**
- Create: `supabase/migrations/004_add_pending_review_status.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/004_add_pending_review_status.sql`:
```sql
-- Add pending_review status for closures flagged for admin review
-- (triggered when deny votes >= 5 but recent vote pattern is mixed)
ALTER TYPE closure_status ADD VALUE IF NOT EXISTS 'pending_review';
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```
Expected output includes: `Applying migration 004_add_pending_review_status.sql`

If you don't have the Supabase CLI linked, run the SQL directly in the Supabase dashboard SQL editor.

- [ ] **Step 3: Verify**

In Supabase dashboard → Table Editor → `closures` → try manually setting a row's `status` to `pending_review`. It should be accepted.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/004_add_pending_review_status.sql
git commit -m "feat(db): add pending_review to closure_status enum"
```

---

## Task 3: DB Migration — auto-resolve vote trigger

**Files:**
- Create: `supabase/migrations/005_auto_resolve_vote_trigger.sql`

The trigger fires after every INSERT/UPDATE/DELETE on `votes`. It:
1. Syncs `upvotes`/`downvotes` counts on the closure (existing behaviour)
2. If `downvotes >= 5`, fetches the last 5 votes by `created_at DESC`
3. All 5 are `deny` → `status = 'resolved'`
4. Mixed → `status = 'pending_review'` (only if not already resolved)

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/005_auto_resolve_vote_trigger.sql`:
```sql
-- Replace the vote-count trigger to also auto-resolve or flag for review
-- based on the last-5-votes pattern.
--
-- Rules:
--   downvotes < 5              → no status change (just sync counts)
--   downvotes >= 5, last 5 all deny  → status = 'resolved'
--   downvotes >= 5, last 5 mixed     → status = 'pending_review'

CREATE OR REPLACE FUNCTION sync_closure_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
  target_id    uuid;
  v_downvotes  int;
  v_last5_deny int;
BEGIN
  target_id := COALESCE(NEW.closure_id, OLD.closure_id);

  -- 1. Sync vote counts
  UPDATE closures
  SET
    upvotes   = (SELECT COUNT(*) FROM votes WHERE closure_id = target_id AND vote_type = 'confirm'),
    downvotes = (SELECT COUNT(*) FROM votes WHERE closure_id = target_id AND vote_type = 'deny')
  WHERE id = target_id;

  -- 2. Read fresh downvote count
  SELECT downvotes INTO v_downvotes FROM closures WHERE id = target_id;

  -- 3. Auto-resolve check
  IF v_downvotes >= 5 THEN
    SELECT COUNT(*) INTO v_last5_deny
    FROM (
      SELECT vote_type FROM votes
      WHERE  closure_id = target_id
      ORDER  BY created_at DESC
      LIMIT  5
    ) recent
    WHERE vote_type = 'deny';

    IF v_last5_deny = 5 THEN
      -- All last 5 votes are deny → clear signal, auto-resolve
      UPDATE closures
      SET    status = 'resolved'
      WHERE  id = target_id
        AND  status <> 'resolved';
    ELSE
      -- Mixed signal → flag for admin review
      UPDATE closures
      SET    status = 'pending_review'
      WHERE  id = target_id
        AND  status NOT IN ('resolved', 'pending_review');
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger itself already exists from migration 003; no need to recreate it.
-- Just replacing the function body is enough.
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```
Expected: `Applying migration 005_auto_resolve_vote_trigger.sql`

- [ ] **Step 3: Smoke-test manually**

In Supabase dashboard SQL editor, run:
```sql
-- Create a test closure
INSERT INTO closures (latitude, longitude, title, closure_type, severity, status)
VALUES (46.8, 12.7, 'Test Trigger', 'other', 'warning', 'active')
RETURNING id;
-- Copy the returned id, then insert 5 deny votes:
INSERT INTO votes (closure_id, vote_type, anon_fingerprint)
VALUES
  ('<id>', 'deny', 'test-fp-1'),
  ('<id>', 'deny', 'test-fp-2'),
  ('<id>', 'deny', 'test-fp-3'),
  ('<id>', 'deny', 'test-fp-4'),
  ('<id>', 'deny', 'test-fp-5');
-- Verify:
SELECT status, downvotes FROM closures WHERE id = '<id>';
-- Expected: status = 'resolved', downvotes = 5

-- Clean up:
DELETE FROM closures WHERE id = '<id>';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/005_auto_resolve_vote_trigger.sql
git commit -m "feat(db): auto-resolve closure after 5 consecutive deny votes"
```

---

## Task 4: Add `allClosures` to `ReportFormContext`

**Files:**
- Modify: `src/contexts/ReportFormContext.tsx`

- [ ] **Step 1: Add `Closure` import and extend the interface**

At the top of `src/contexts/ReportFormContext.tsx`, add the import:
```typescript
import type { Closure } from '@/lib/types'
```

Extend `ReportFormContextType` with:
```typescript
  // Active closures from the map — used for duplicate detection
  allClosures:    Closure[]
  setAllClosures: (closures: Closure[]) => void
```

- [ ] **Step 2: Add state and wire it into the provider**

Inside `ReportFormProvider`, add:
```typescript
const [allClosures, setAllClosures] = useState<Closure[]>([])
```

Add to the `value` object:
```typescript
allClosures,
setAllClosures,
```

The full updated provider value should be:
```typescript
value={{
  isOpen,
  open:  () => setIsOpen(true),
  close: () => setIsOpen(false),
  onSuccessRef,
  reportCount,
  notifyReported: () => setReportCount((n) => n + 1),
  isPickingLocation,
  setIsPickingLocation,
  onPositionPickedRef,
  allClosures,
  setAllClosures,
}}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/contexts/ReportFormContext.tsx
git commit -m "feat(context): expose allClosures to ReportFormContext for duplicate detection"
```

---

## Task 5: Sync closures from Map into context

**Files:**
- Modify: `src/components/Map.tsx`

- [ ] **Step 1: Pull `setAllClosures` from context**

In `Map.tsx`, find the line (around line 148):
```typescript
const { onSuccessRef, isPickingLocation } = useReportForm()
```
Change it to:
```typescript
const { onSuccessRef, isPickingLocation, setAllClosures } = useReportForm()
```

- [ ] **Step 2: Sync closures into context whenever they change**

Directly after the `useClosures` and `useReportForm` calls (around line 148), add:
```typescript
useEffect(() => {
  setAllClosures(closures)
}, [closures]) // eslint-disable-line react-hooks/exhaustive-deps
```

(`setAllClosures` is a stable setter from `useState` — safe to omit from deps.)

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Map.tsx
git commit -m "feat(map): sync loaded closures into ReportFormContext"
```

---

## Task 6: Duplicate detection in `ReportForm`

**Files:**
- Modify: `src/components/ReportForm.tsx`

- [ ] **Step 1: Add `Closure` import and context access**

Near the top of `ReportForm.tsx`, the existing import from `@/lib/types` is:
```typescript
import type { ClosureType, SeverityLevel } from '@/lib/types'
```
Add `Closure`:
```typescript
import type { Closure, ClosureType, SeverityLevel } from '@/lib/types'
```

In the component body, add `allClosures` to the existing `useReportForm()` destructure:
```typescript
const { ..., allClosures } = useReportForm()
```

- [ ] **Step 2: Add the Haversine utility and nearby state**

Just before the component's `return`, add this helper function (inside the component file, outside the component):
```typescript
// ---------------------------------------------------------------------------
// Haversine distance in metres between two lat/lng points
// ---------------------------------------------------------------------------
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6_371_000
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
```

Inside the component, add state for nearby closures (near the other `useState` calls):
```typescript
const [nearbyClosures, setNearbyClosures] = useState<{ closure: Closure; distanceM: number }[]>([])
```

- [ ] **Step 3: Compute nearby closures when position is picked**

Find where `form.position` is set and the form advances to step 1. Look for the `set('position', ...)` call — it appears in two places: the GPS handler and `onPositionPickedRef`. Add the check as a `useEffect` that fires when `form.position` and `step` change:

```typescript
// Compute nearby open closures when the user picks a location
useEffect(() => {
  if (!form.position || step !== 1) {
    setNearbyClosures([])
    return
  }
  const RADIUS_M = 100
  const nearby = allClosures
    .filter(c => c.status === 'active' || c.status === 'unconfirmed')
    .map(c => ({
      closure:   c,
      distanceM: haversineMeters(form.position!.lat, form.position!.lng, c.latitude, c.longitude),
    }))
    .filter(({ distanceM }) => distanceM <= RADIUS_M)
    .sort((a, b) => a.distanceM - b.distanceM)
  setNearbyClosures(nearby)
}, [form.position, step, allClosures])
```

- [ ] **Step 4: Add the warning banner in step 1 UI**

In the JSX for step 1 (the `{step === 1 && (...)}` block), add the banner as the **first child**, before the `<Field label="Titel" ...>`:

```tsx
{nearbyClosures.length > 0 && (
  <div
    className="rounded-lg p-3"
    style={{ border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.08)' }}
  >
    <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
      Mögliche Duplikate in der Nähe
    </p>
    <div className="mt-2 flex flex-col gap-2">
      {nearbyClosures.map(({ closure, distanceM }) => (
        <button
          key={closure.id}
          type="button"
          onClick={() => {
            close()
            router.push(`/?closure=${closure.id}`)
          }}
          className="flex items-center justify-between gap-2 text-left text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span className="truncate">{closure.title}</span>
          <span className="shrink-0 text-xs font-medium" style={{ color: '#f59e0b' }}>
            {Math.round(distanceM)} m
          </span>
        </button>
      ))}
    </div>
    <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
      Du kannst trotzdem eine neue Meldung erstellen.
    </p>
  </div>
)}
```

Make sure `close` is available — it comes from `useReportForm()`. Add it to the destructure if not already present.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ReportForm.tsx
git commit -m "feat(form): warn reporter when active closure exists within 100m"
```

---

## Task 7: Update `AdminDashboardClient` for `pending_review`

**Files:**
- Modify: `src/app/admin/AdminDashboardClient.tsx`

- [ ] **Step 1: Add `pending_review` count and stats card**

Find the stats section. After the existing `resolvedCount` variable, add:
```typescript
const pendingReviewCount = closures.filter(c => c.status === 'pending_review').length
```

In the stats grid (currently `grid-cols-2 sm:grid-cols-4`), add a fourth card after the "Behoben" card:
```tsx
<div className="flex flex-col rounded-2xl border border-border bg-bg-card p-5">
  <span className="text-2xl font-black" style={{ color: 'var(--warning)' }}>{pendingReviewCount}</span>
  <span className="text-sm font-medium text-text-secondary">Zu prüfen</span>
</div>
```

- [ ] **Step 2: Add status filter tabs**

Add a `filterStatus` state after the existing state declarations:
```typescript
const [filterStatus, setFilterStatus] = useState<string>('all')
```

After the stats grid and before the `{/* List */}` comment, add filter tabs:
```tsx
{/* Status filter */}
<div className="flex flex-wrap gap-2">
  {[
    { key: 'all',            label: 'Alle' },
    { key: 'active',         label: 'Aktiv' },
    { key: 'pending_review', label: 'Zu prüfen' },
    { key: 'unconfirmed',    label: 'Unbestätigt' },
    { key: 'resolved',       label: 'Behoben' },
  ].map(tab => (
    <button
      key={tab.key}
      type="button"
      onClick={() => setFilterStatus(tab.key)}
      className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
      style={{
        background: filterStatus === tab.key ? 'var(--accent)' : 'var(--bg-card)',
        color:      filterStatus === tab.key ? 'var(--bg-dark)' : 'var(--text-secondary)',
        border:     '1px solid var(--border)',
      }}
    >
      {tab.label}
    </button>
  ))}
</div>
```

Apply the filter in the list — replace `{closures.map(closure => (` with:
```tsx
{closures
  .filter(c => filterStatus === 'all' || c.status === filterStatus)
  .map(closure => (
```

- [ ] **Step 3: Add `pending_review` badge and dedicated actions**

Inside the closure card, find the existing resolved badge:
```tsx
{closure.status === 'resolved' && (
  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--success)]/20 text-[var(--success)]">
    Gelöst
  </span>
)}
```
Add a `pending_review` badge right after it:
```tsx
{closure.status === 'pending_review' && (
  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
    Zu prüfen
  </span>
)}
```

- [ ] **Step 4: Fix `handleToggleStatus` and add dedicated pending_review actions**

Replace the existing `handleToggleStatus` function:
```typescript
async function handleToggleStatus(id: string, currentStatus: string) {
  const newStatus = currentStatus === 'active' ? 'resolved' : 'active'
  setLoadingId(id)

  const { error } = await supabase
    .from('closures')
    .update({ status: newStatus })
    .eq('id', id)

  if (!error) {
    setClosures(prev =>
      prev.map(c => c.id === id ? { ...c, status: newStatus as ClosureStatus } : c)
    )
  } else {
    alert(`Fehler beim Status-Update: ${error.message}`)
  }
  setLoadingId(null)
}
```

(The only change is `as ClosureStatus` instead of `as 'active'|'resolved'` — TypeScript now accepts all statuses.)

Replace the action buttons section in each closure card. Find:
```tsx
<div className="flex w-full min-w-40 flex-row gap-2 sm:w-auto sm:flex-col">
  <button
    onClick={() => handleToggleStatus(closure.id, closure.status)}
    ...
```

Replace the entire `<div className="flex w-full min-w-40 ...">` with:
```tsx
<div className="flex w-full min-w-40 flex-row gap-2 sm:w-auto sm:flex-col">
  {closure.status === 'pending_review' ? (
    <>
      <button
        onClick={() => handleToggleStatus(closure.id, 'resolved')}
        disabled={loadingId === closure.id}
        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--bg-dark)] px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-white/5 disabled:opacity-50"
      >
        <CheckCircle2 className="h-4 w-4 text-[var(--success)]" /> Auflösen
      </button>
      <button
        onClick={() => handleToggleStatus(closure.id, 'unconfirmed')}
        disabled={loadingId === closure.id}
        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--bg-dark)] px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-white/5 disabled:opacity-50"
      >
        <AlertTriangle className="h-4 w-4 text-[var(--warning)]" /> Reaktivieren
      </button>
    </>
  ) : (
    <button
      onClick={() => handleToggleStatus(closure.id, closure.status)}
      disabled={loadingId === closure.id}
      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--bg-dark)] px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-white/5 disabled:opacity-50"
    >
      {closure.status === 'active' ? (
        <><CheckCircle2 className="h-4 w-4 text-[var(--success)]" /> Als gelöst markieren</>
      ) : (
        <><AlertTriangle className="h-4 w-4 text-[var(--warning)]" /> Als aktiv markieren</>
      )}
    </button>
  )}

  <button
    onClick={() => handleDelete(closure.id)}
    disabled={loadingId === closure.id}
    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--danger)]/50 bg-[var(--danger)]/10 px-4 py-2 text-sm font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)]/20 disabled:opacity-50"
  >
    <Trash2 className="h-4 w-4" /> Löschen
  </button>
</div>
```

Also add `ClosureStatus` to the import from `@/lib/types`:
```typescript
import type { Closure, ClosureStatus } from '@/lib/types'
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/AdminDashboardClient.tsx
git commit -m "feat(admin): add pending_review filter, stats card, and resolve/reactivate actions"
```

---

## Final verification

- [ ] Run the dev server: `npm run dev`
- [ ] Open the report form, pick a location near an existing active closure — confirm the warning banner appears in step 1
- [ ] In Supabase dashboard, manually cast a closure to `pending_review` and verify the admin dashboard shows it in the "Zu prüfen" tab with the correct action buttons
- [ ] Trigger the DB test from Task 3, Step 3 to verify the trigger resolves correctly
