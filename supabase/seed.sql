-- =============================================================================
-- TrailAlert — Seed Data — Osttirol / Lienz Region
-- Echte Forstweg-Koordinaten rund um Lienz, Tirol
-- =============================================================================

INSERT INTO closures
  (latitude, longitude, title, description, closure_type, status, severity, expected_end, upvotes, downvotes, created_at)
VALUES

-- 1. Hochstein (Forststraße Zufahrt)
(
  46.8412, 12.7801,
  'Forststraße Hochstein — Vollsperrung',
  'Forstarbeiten im gesamten Abschnitt. Holzschlägerung aktiv, Fahrzeuge kreuzen ständig die Strecke.',
  'forestwork', 'active', 'full_closure',
  '2026-04-30',
  5, 0,
  now() - interval '2 hours'
),

-- 2. Zettersfeld Zufahrt
(
  46.8601, 12.7694,
  'Zettersfeld Forstweg — Bauarbeiten Teilsperrung',
  'Wegbau in der oberen Hälfte. Unterer Abschnitt passierbar, Vorsicht geboten.',
  'construction', 'active', 'partial',
  '2026-05-15',
  3, 1,
  now() - interval '1 day'
),

-- 3. Drauradweg Abschnitt Leisach
(
  46.8273, 12.8152,
  'Forstweg Leisach — Hangrutschung',
  'Kleines Erdrutsch nach den Regenfällen. Weg einspurig passierbar aber Vorsicht wegen lockerem Material.',
  'damage', 'active', 'warning',
  NULL,
  2, 0,
  now() - interval '3 hours'
),

-- 4. Galitzenklamm Forstweg
(
  46.8089, 12.7423,
  'Galitzenklamm — Forstarbeiten gesperrt',
  'Vollsperrung wegen laufender Schlägerungsarbeiten. Motorräder und Fahrräder bis auf Weiteres verboten.',
  'forestwork', 'active', 'full_closure',
  '2026-04-20',
  8, 0,
  now() - interval '2 days'
),

-- 5. Lienzer Dolomiten — Karlsbader Hütte Zufahrt
(
  46.7812, 12.7156,
  'Zufahrt Karlsbader Hütte — Forstarbeiten',
  'Oberer Abschnitt der Forststraße gesperrt. Alternativroute über den Wanderweg möglich.',
  'forestwork', 'active', 'partial',
  '2026-05-01',
  4, 2,
  now() - interval '5 hours'
),

-- 6. Pustertaler Höhenstraße Abzweig
(
  46.8734, 12.8367,
  'Pustertaler Höhenstraße — Schranken-Sperrung',
  'Gemeindeschranken geschlossen, Durchfahrt für Mountainbikes derzeit nicht möglich.',
  'other', 'active', 'warning',
  NULL,
  1, 3,
  now() - interval '12 hours'
),

-- 7. Iseltal Forstweg Richtung Matrei
(
  46.9123, 12.7089,
  'Iseltal Forstweg — Vollsperrung Holzbringung',
  'Großflächige Holzbringungsmaßnahmen. Sicherheitsabstand nötig. Sperrung gilt täglich 07:00-17:00 Uhr.',
  'forestwork', 'active', 'full_closure',
  '2026-04-25',
  6, 0,
  now() - interval '6 hours'
),

-- 8. Debanttal Forststraße
(
  46.7634, 12.8523,
  'Debanttal — Forststraße einspurig',
  'Forstarbeiten im mittleren Abschnitt. Einspurige Durchfahrt möglich, aber Holztransporter haben Vorrang.',
  'forestwork', 'active', 'partial',
  '2026-04-28',
  2, 1,
  now() - interval '1 day'
),

-- 9. Thurn-Pass Forstweg (nahe Mittersill)
(
  47.2891, 12.4812,
  'Forstweg Thurn — Windwurf gesperrt',
  'Nach dem Sturm vom vergangenen Wochenende liegen mehrere Bäume auf dem Weg. Räumungsarbeiten geplant.',
  'damage', 'active', 'full_closure',
  NULL,
  7, 0,
  now() - interval '20 hours'
),

-- 10. Kals am Großglockner Zufahrtsweg
(
  47.0234, 12.6345,
  'Kals — Forstweg Kalser Tal gesperrt',
  'Wegschäden nach Schneeschmelze. Tiefe Fahrspuren, Weg für Mountainbikes nicht empfehlenswert.',
  'damage', 'active', 'warning',
  '2026-05-10',
  3, 0,
  now() - interval '4 hours'
);
