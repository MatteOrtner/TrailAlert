@AGENTS.md

# TrailAlert

## Was ist das?
TrailAlert ist eine Web-App die Mountainbikern in Osttirol/Tirol zeigt, welche Forstwege aktuell gesperrt sind. User können Sperren per Crowdsourcing melden und sich über neue Sperren in ihren Lieblings-Gebieten benachrichtigen lassen.

## Tech Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Leaflet + React-Leaflet (OpenStreetMap)
- Supabase (Postgres DB, Auth, Realtime, Storage, Edge Functions)
- Vercel (Deployment)

## Design-Richtung
- Dark Theme (bg: #0f1115, cards: #1a1d24)
- Accent: Amber/Orange (#f59e0b)
- Font: Plus Jakarta Sans (UI) + JetBrains Mono (Daten)
- Outdoor/Trail-Feeling, modern und clean
- Mobile-first responsive

## Kern-Features MVP
1. Interaktive Karte mit Sperr-Markern (farbcodiert nach Schweregrad)
2. Sperren melden (anonym möglich) mit Position, Typ, Foto
3. Voting-System (bestätigen/widerlegen)
4. Login (optional) für E-Mail-Benachrichtigungen bei neuen Sperren
5. Watch Areas: Gebiete auf der Karte definieren die man beobachtet

## Coding-Standards
- TypeScript strict mode
- Server Components wo möglich, Client Components nur wenn nötig
- Supabase RLS (Row Level Security) für alle Tabellen
- Deutsche UI-Texte, englische Code-Kommentare und Variablen
