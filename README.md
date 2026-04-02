<div align="center">

# ⚠ TrailAlert

**Aktuelle Forstwege-Sperren für Mountainbiker in Osttirol und Tirol**

Crowdsourcing-Plattform: Sperren melden · bestätigen · beobachten

---

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=nextdotjs)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E?logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b.svg)](LICENSE)

</div>

---

## Was ist TrailAlert?

TrailAlert zeigt Mountainbikern in Osttirol und Tirol auf einer interaktiven Karte, welche Forstwege aktuell **gesperrt oder eingeschränkt** sind. Die Community meldet Sperren, stimmt über deren Richtigkeit ab und wird bei neuen Sperren in beobachteten Gebieten per **E-Mail benachrichtigt**.

> **Demo:** [trailalert.vercel.app](https://trailalert.vercel.app) *(Live-URL nach Deployment eintragen)*

---

## Features

| Feature | Beschreibung |
|---|---|
| 🗺 **Interaktive Karte** | OpenStreetMap mit farbcodierten Sperr-Markern (rot / orange / gelb je Schweregrad) |
| 📍 **Sperre melden** | 3-Schritte-Formular: Ort (GPS oder Karte) → Details → optional Foto |
| 👍 **Voting-System** | Community bestätigt oder widerlegt Sperren; automatische Auflösung bei negativem Saldo |
| 🔔 **Watch Areas** | Gebiete auf der Karte definieren und bei neuen Sperren per E-Mail informiert werden |
| 🔍 **Filter** | Nach Typ, Schweregrad, Zeitraum und bestätigten Sperren filtern |
| 📡 **Realtime** | Neue Sperren erscheinen sofort auf der Karte ohne Seitenreload |
| 🔐 **Auth** | Google OAuth oder Magic Link (Passwortlos) — anonym melden ebenfalls möglich |
| 📱 **Mobile-first** | Bottom Sheet auf Mobile, Swipe-Gesten, Safe-Area-Unterstützung (iOS-Notch) |
| 🌐 **PWA-ready** | Installierbar als App (manifest.json, Standalone-Modus, Theme Color) |

---

## Screenshots

> *Screenshots nach dem ersten Deployment hier eintragen*

| Kartenansicht | Sperre melden | Filter |
|:---:|:---:|:---:|
| *(Screenshot)* | *(Screenshot)* | *(Screenshot)* |

---

## Tech Stack

| Layer | Technologie |
|---|---|
| **Framework** | [Next.js 16.2](https://nextjs.org) (App Router, React 19, React Compiler) |
| **Sprache** | TypeScript 5 (strict mode) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) (CSS-first, kein tailwind.config.js) |
| **Karte** | [Leaflet](https://leafletjs.com) + [React-Leaflet v5](https://react-leaflet.js.org) (OpenStreetMap) |
| **Backend** | [Supabase](https://supabase.com) — Postgres, Auth, Realtime, Storage, Edge Functions |
| **E-Mail** | [Resend](https://resend.com) via Supabase Edge Functions (Deno) |
| **Deployment** | [Vercel](https://vercel.com) (Region: `fra1` Frankfurt) |
| **Icons** | [Lucide React](https://lucide.dev) |
| **Datumsformatierung** | [date-fns](https://date-fns.org) mit deutschem Locale |

---

## Getting Started

### Voraussetzungen

- **Node.js** ≥ 18
- **npm** ≥ 9
- Ein [Supabase](https://supabase.com) Account (Free Tier reicht)
- Optional: [Supabase CLI](https://supabase.com/docs/guides/cli) für lokale Entwicklung

---

### 1. Repository klonen

```bash
git clone https://github.com/<dein-username>/trailalert.git
cd trailalert
```

### 2. Abhängigkeiten installieren

```bash
npm install
```

### 3. Supabase Projekt erstellen

1. Gehe zu [supabase.com](https://supabase.com) → **New Project**
2. Region: **eu-central-1** (Frankfurt) empfohlen
3. Notiere dir **Project URL** und **anon key** (Settings → API)

### 4. Umgebungsvariablen konfigurieren

Bearbeite `.env.local` im Projektroot:

```env
# Supabase (erforderlich)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dein-anon-key>

# App URL (für OG-Tags und E-Mail-Links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Rechtliches (Impressum / Datenschutz)
NEXT_PUBLIC_LEGAL_OWNER=Max Mustermann
NEXT_PUBLIC_LEGAL_ADDRESS=Musterstraße 1, 9900 Lienz, Österreich
NEXT_PUBLIC_LEGAL_EMAIL=hello@example.com

# Optional: Client Error Telemetry
NEXT_PUBLIC_CLIENT_ERROR_REPORTING=true
```

### 5. SQL-Migrationen ausführen

Empfohlen (Supabase CLI):

```bash
supabase db push
```

Falls du ohne CLI arbeitest, öffne den **SQL Editor** im Supabase Dashboard (Database → SQL Editor → New Query) und führe **alle** Dateien aus `supabase/migrations/` in Dateinamen-Reihenfolge aus:

```
001_initial_schema.sql
002_notify_webhook.sql
003_vote_count_trigger.sql
004_add_pending_review_status.sql
005_auto_resolve_vote_trigger.sql
006_fix_vote_user_constraint.sql
007_pg_net_webhook.sql
008_closure_comments.sql
009_shared_routes.sql
010_security_hardening.sql
011_shared_routes_cleanup_cron.sql
012_ops_hardening_and_rls_cleanup.sql
```

Optional — Testdaten für die Region Lienz/Osttirol laden:

```
supabase/seed.sql   # 10 realistische Sperren rund um Lienz
```

### 6. Authentifizierung einrichten

Im Supabase Dashboard unter **Authentication → Providers**:

- **Email**: aktivieren (für Magic Link / Passwortlos-Login)
- **Google** *(optional)*: Client ID + Secret aus der [Google Cloud Console](https://console.cloud.google.com) eintragen

Redirect URL eintragen: `https://<project-ref>.supabase.co/auth/v1/callback`

Empfohlen für Launch-Sicherheit: **Authentication → Settings → Password Security → Leaked Password Protection** aktivieren.
Hinweis: Bei Supabase Free kann diese Option je nach Plan-Limit nicht verfügbar sein.

### 7. Entwicklungsserver starten

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) — die Karte erscheint mit den Seed-Daten.

---

### E-Mail-Benachrichtigungen einrichten (optional)

Watch Areas senden E-Mails über [Resend](https://resend.com):

1. Resend Account erstellen → API Key holen
2. Edge Function deployen:
   ```bash
   supabase functions deploy notify-new-closure
   ```
3. Secrets setzen (Supabase Dashboard → Edge Functions → Secrets):
   ```
   SUPABASE_URL              https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY <service-role-key>
   RESEND_API_KEY            re_...
   EMAIL_FROM                TrailAlert <noreply@trailalert.at>
   APP_URL                   https://trailalert.vercel.app
   WEBHOOK_SECRET            <zufälliger-geheimer-string>
   ```
4. Webhook anlegen: Supabase → **Database → Webhooks → Create a new hook**
   - Table: `closures`, Event: `INSERT`
   - URL: `https://<project-ref>.supabase.co/functions/v1/notify-new-closure`
   - Header: `x-webhook-secret: <WEBHOOK_SECRET>`
   - Wichtig: `WEBHOOK_SECRET` ist verpflichtend. Ohne Secret antwortet die Funktion mit `500`.
5. Optional empfohlen: `pg_cron` Extension aktivieren (Database → Extensions), damit `011_shared_routes_cleanup_cron.sql` den 30-Tage-Cleanup von `shared_routes` automatisch planen kann.

### Betrieb / Ops

- E2E-Notification-Check: `docs/notification-e2e-check.md`
- Incident-Runbook (Rollback + Recovery): `docs/incident-runbook.md`
- Monitoring Setup (Healthchecks, Alerts, Logs): `docs/monitoring-setup.md`
- Health Endpoint: `GET /api/health`

---

## Projektstruktur

```
trailalert/
├── src/
│   ├── app/
│   │   ├── auth/callback/route.ts   # OAuth + Magic Link Callback
│   │   ├── globals.css              # Tailwind v4 + Design Tokens
│   │   ├── layout.tsx               # Root Layout, Metadata, Provider-Wrapping
│   │   ├── page.tsx                 # Startseite → MapLoader
│   │   ├── error.tsx                # Next.js Error Boundary
│   │   ├── loading.tsx              # Lade-Skeleton
│   │   └── icon.tsx                 # Dynamisches Favicon (next/og)
│   │
│   ├── components/
│   │   ├── Map.tsx                  # Leaflet-Karte (Client, SSR:false via MapLoader)
│   │   ├── MapLoader.tsx            # dynamic()-Wrapper für SSR:false
│   │   ├── ClosureMarker.tsx        # DivIcon-Marker mit Puls-Animation
│   │   ├── ClosurePopup.tsx         # Popup mit Voting + Details
│   │   ├── FilterSidebar.tsx        # Filter (Bottom Sheet Mobile / Sidebar Desktop)
│   │   ├── ReportForm.tsx           # 3-Step-Formular: Sperre melden
│   │   ├── WatchAreaManager.tsx     # Watch-Area CRUD-Panel
│   │   ├── PositionPicker.tsx       # Mini-Karte für Positionsauswahl
│   │   ├── Header.tsx               # Navigation + Hamburger-Menü
│   │   ├── AuthModal.tsx            # Login/Register Modal
│   │   └── AuthButton.tsx           # Desktop Dropdown + Mobile Variant
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx          # Supabase Auth State
│   │   ├── ReportFormContext.tsx    # Formular-Open-State + onSuccess-Ref
│   │   └── WatchAreaContext.tsx     # Panel-Open-State
│   │
│   ├── hooks/
│   │   ├── useClosures.ts           # Sperren laden + Realtime + Filter
│   │   ├── useGeolocation.ts        # GPS-Hook
│   │   └── useWatchAreas.ts         # Watch-Area CRUD
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            # Browser-Client
│   │   │   └── server.ts            # Server-Client (async cookies)
│   │   └── types.ts                 # Closure, Vote, WatchArea Interfaces
│   │
│   ├── proxy.ts                     # Next.js 16 Proxy (ehem. middleware.ts)
│   ├── app/datenschutz/page.tsx     # Datenschutz-Seite
│   ├── app/impressum/page.tsx       # Impressum
│   └── app/api/health/route.ts      # Healthcheck für Monitoring
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql   # Basis-Schema + RLS
│   │   ├── ...                      # Weitere Migrations (003-011)
│   │   └── 012_ops_hardening_and_rls_cleanup.sql # RLS + Trigger Cleanup
│   ├── functions/
│   │   └── notify-new-closure/
│   │       └── index.ts             # Deno Edge Function: Haversine + Resend
│   └── seed.sql                     # 10 Testdaten rund um Lienz/Osttirol
│
├── public/
│   └── manifest.json                # PWA Manifest
│
├── next.config.ts                   # Next.js Config (React Compiler, remotePatterns)
├── vercel.json                      # Vercel Region fra1 + Security Headers
├── tsconfig.json                    # TypeScript (Deno-Functions excluded)
└── .env.local                       # Lokale Umgebungsvariablen (nicht committen!)
```

---

## Deployment auf Vercel

1. Repository auf GitHub pushen
2. [vercel.com](https://vercel.com) → **Import Project** → GitHub Repo auswählen
3. Environment Variables eintragen (Settings → Environment Variables):
   ```
   NEXT_PUBLIC_SUPABASE_URL      https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY <anon-key>
   NEXT_PUBLIC_APP_URL           https://trailalert.vercel.app
   ADMIN_EMAILS                  admin1@example.com,admin2@example.com
   ```
4. **Deploy** — Vercel erkennt Next.js automatisch

`vercel.json` konfiguriert bereits Region `fra1` (Frankfurt) und Security-Header.

---

## Contributing

Beiträge sind willkommen!

1. Fork erstellen
2. Feature-Branch anlegen: `git checkout -b feature/mein-feature`
3. Änderungen committen: `git commit -m "feat: mein Feature"`
4. Branch pushen: `git push origin feature/mein-feature`
5. Pull Request öffnen

**Code-Richtlinien:**
- TypeScript strict — kein `any`
- Deutsche UI-Texte, englische Kommentare und Variablen
- Server Components bevorzugen, `'use client'` nur wenn nötig
- Supabase RLS für alle Datenbankoperationen

---

## Lizenz

MIT © 2025 — Details in [LICENSE](LICENSE)

---

<div align="center">

Made with ☕ in Osttirol

*Für alle, die lieber Trails fahren als Schilder lesen.*

</div>
