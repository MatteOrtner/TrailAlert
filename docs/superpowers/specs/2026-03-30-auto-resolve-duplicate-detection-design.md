# Design: Auto-Resolve & Duplicate Detection

**Date:** 2026-03-30

---

## Overview

Two features to improve closure data quality:

1. **Auto-resolve** — automatically resolve a closure when community deny votes signal it is no longer blocked, with a `pending_review` fallback for ambiguous cases
2. **Duplicate detection** — warn a reporter before they submit if an active closure already exists within 100m of their chosen location

---

## Feature 1: Auto-Resolve via Vote Pattern

### Logic

After every INSERT/UPDATE/DELETE on the `votes` table, the trigger inspects the target closure:

- If total deny votes < 5 → no status change
- If total deny votes ≥ 5:
  - Fetch the last 5 votes on this closure ordered by `created_at DESC`
  - If all 5 are `deny` → set `status = 'resolved'`
  - If mixed → set `status = 'pending_review'`

This captures the key scenario: a road was blocked (many confirms), then cleared (5 consecutive denies = auto-resolve). If the signal is ambiguous (mixed recent votes), it escalates to admin review instead of resolving automatically.

### Database Changes

**Migration 1** — extend the enum:
```sql
ALTER TYPE closure_status ADD VALUE 'pending_review';
```

**Migration 2** — replace `sync_closure_vote_counts()` trigger body with updated logic that checks the last-5-votes pattern after updating vote counts.

### Admin Dashboard

- Add `pending_review` as a filterable status alongside `active`, `unconfirmed`, `resolved`
- Admin can: confirm resolve (→ `resolved`) or revert (→ `active`)

---

## Feature 2: Duplicate Detection

### Logic

Client-side, in `ReportForm`, after the user picks a location (transition from step 0 → step 1):

1. Run Haversine distance from picked coordinates against all currently loaded active closures
2. If any closure is within 100m, display a warning banner at the top of step 1
3. Banner shows: closure title, severity badge, distance (e.g. "32m away")
4. User can still submit — this is a warning, not a blocker

### Data Flow

`MapLoader` already holds all active closures. It passes them as a new `closures` prop to `ReportForm`. No extra network calls needed.

### UI

Warning banner (amber, non-blocking) between the step header and the first field in step 1. If multiple closures are nearby, list all of them. Each entry links to the existing closure on the map.

---

## Out of Scope

- Server-side duplicate enforcement (not needed for MVP)
- Notifying the original reporter when their closure is auto-resolved
- Configurable thresholds (5 votes, 100m are hardcoded for now)
