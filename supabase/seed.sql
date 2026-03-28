-- =============================================================================
-- TrailAlert — Seed Data — Osttirol / Lienz Region
-- Echte Forstweg-Koordinaten rund um Lienz, Tirol
-- =============================================================================
-- Uses fixed UUIDs so vote rows can reference closure IDs.
-- upvotes/downvotes are NOT set directly — the DB trigger calculates
-- them automatically from the votes table after the votes are inserted.
-- =============================================================================

-- Clear existing data first
DELETE FROM votes;
DELETE FROM closures;

-- ---------------------------------------------------------------------------
-- Closures (no upvotes/downvotes columns — trigger handles those)
-- ---------------------------------------------------------------------------

INSERT INTO closures
  (id, latitude, longitude, title, description, closure_type, status, severity, expected_end, created_at)
VALUES

-- 1. Hochstein
(
  '00000000-0000-0000-0000-000000000001',
  46.8412, 12.7801,
  'Forststraße Hochstein — Vollsperrung',
  'Forstarbeiten im gesamten Abschnitt. Holzschlägerung aktiv, Fahrzeuge kreuzen ständig die Strecke.',
  'forestwork', 'active', 'full_closure',
  '2026-04-30',
  now() - interval '2 hours'
),

-- 2. Zettersfeld
(
  '00000000-0000-0000-0000-000000000002',
  46.8601, 12.7694,
  'Zettersfeld Forstweg — Bauarbeiten Teilsperrung',
  'Wegbau in der oberen Hälfte. Unterer Abschnitt passierbar, Vorsicht geboten.',
  'construction', 'active', 'partial',
  '2026-05-15',
  now() - interval '1 day'
),

-- 3. Leisach
(
  '00000000-0000-0000-0000-000000000003',
  46.8273, 12.8152,
  'Forstweg Leisach — Hangrutschung',
  'Kleines Erdrutsch nach den Regenfällen. Weg einspurig passierbar aber Vorsicht wegen lockerem Material.',
  'damage', 'active', 'warning',
  NULL,
  now() - interval '3 hours'
),

-- 4. Galitzenklamm
(
  '00000000-0000-0000-0000-000000000004',
  46.8089, 12.7423,
  'Galitzenklamm — Forstarbeiten gesperrt',
  'Vollsperrung wegen laufender Schlägerungsarbeiten. Motorräder und Fahrräder bis auf Weiteres verboten.',
  'forestwork', 'active', 'full_closure',
  '2026-04-20',
  now() - interval '2 days'
),

-- 5. Karlsbader Hütte
(
  '00000000-0000-0000-0000-000000000005',
  46.7812, 12.7156,
  'Zufahrt Karlsbader Hütte — Forstarbeiten',
  'Oberer Abschnitt der Forststraße gesperrt. Alternativroute über den Wanderweg möglich.',
  'forestwork', 'active', 'partial',
  '2026-05-01',
  now() - interval '5 hours'
),

-- 6. Pustertaler Höhenstraße
(
  '00000000-0000-0000-0000-000000000006',
  46.8734, 12.8367,
  'Pustertaler Höhenstraße — Schranken-Sperrung',
  'Gemeindeschranken geschlossen, Durchfahrt für Mountainbikes derzeit nicht möglich.',
  'other', 'active', 'warning',
  NULL,
  now() - interval '12 hours'
),

-- 7. Iseltal
(
  '00000000-0000-0000-0000-000000000007',
  46.9123, 12.7089,
  'Iseltal Forstweg — Vollsperrung Holzbringung',
  'Großflächige Holzbringungsmaßnahmen. Sicherheitsabstand nötig. Sperrung gilt täglich 07:00-17:00 Uhr.',
  'forestwork', 'active', 'full_closure',
  '2026-04-25',
  now() - interval '6 hours'
),

-- 8. Debanttal
(
  '00000000-0000-0000-0000-000000000008',
  46.7634, 12.8523,
  'Debanttal — Forststraße einspurig',
  'Forstarbeiten im mittleren Abschnitt. Einspurige Durchfahrt möglich, aber Holztransporter haben Vorrang.',
  'forestwork', 'active', 'partial',
  '2026-04-28',
  now() - interval '1 day'
),

-- 9. Thurn-Pass
(
  '00000000-0000-0000-0000-000000000009',
  47.2891, 12.4812,
  'Forstweg Thurn — Windwurf gesperrt',
  'Nach dem Sturm vom vergangenen Wochenende liegen mehrere Bäume auf dem Weg. Räumungsarbeiten geplant.',
  'damage', 'active', 'full_closure',
  NULL,
  now() - interval '20 hours'
),

-- 10. Kals am Großglockner
(
  '00000000-0000-0000-0000-000000000010',
  47.0234, 12.6345,
  'Kals — Forstweg Kalser Tal gesperrt',
  'Wegschäden nach Schneeschmelze. Tiefe Fahrspuren, Weg für Mountainbikes nicht empfehlenswert.',
  'damage', 'active', 'warning',
  '2026-05-10',
  now() - interval '4 hours'
);

-- ---------------------------------------------------------------------------
-- Votes — trigger updates closures.upvotes/downvotes automatically
-- Seed fingerprints prefixed with "seed_" to not collide with real users
-- ---------------------------------------------------------------------------

INSERT INTO votes (closure_id, vote_type, anon_fingerprint) VALUES

-- 1. Hochstein: 5 upvotes
('00000000-0000-0000-0000-000000000001', 'confirm', 'seed_1_a'),
('00000000-0000-0000-0000-000000000001', 'confirm', 'seed_1_b'),
('00000000-0000-0000-0000-000000000001', 'confirm', 'seed_1_c'),
('00000000-0000-0000-0000-000000000001', 'confirm', 'seed_1_d'),
('00000000-0000-0000-0000-000000000001', 'confirm', 'seed_1_e'),

-- 2. Zettersfeld: 3 upvotes, 1 downvote
('00000000-0000-0000-0000-000000000002', 'confirm', 'seed_2_a'),
('00000000-0000-0000-0000-000000000002', 'confirm', 'seed_2_b'),
('00000000-0000-0000-0000-000000000002', 'confirm', 'seed_2_c'),
('00000000-0000-0000-0000-000000000002', 'deny',    'seed_2_d'),

-- 3. Leisach: 2 upvotes
('00000000-0000-0000-0000-000000000003', 'confirm', 'seed_3_a'),
('00000000-0000-0000-0000-000000000003', 'confirm', 'seed_3_b'),

-- 4. Galitzenklamm: 8 upvotes
('00000000-0000-0000-0000-000000000004', 'confirm', 'seed_4_a'),
('00000000-0000-0000-0000-000000000004', 'confirm', 'seed_4_b'),
('00000000-0000-0000-0000-000000000004', 'confirm', 'seed_4_c'),
('00000000-0000-0000-0000-000000000004', 'confirm', 'seed_4_d'),
('00000000-0000-0000-0000-000000000004', 'confirm', 'seed_4_e'),
('00000000-0000-0000-0000-000000000004', 'confirm', 'seed_4_f'),
('00000000-0000-0000-0000-000000000004', 'confirm', 'seed_4_g'),
('00000000-0000-0000-0000-000000000004', 'confirm', 'seed_4_h'),

-- 5. Karlsbader Hütte: 4 upvotes, 2 downvotes
('00000000-0000-0000-0000-000000000005', 'confirm', 'seed_5_a'),
('00000000-0000-0000-0000-000000000005', 'confirm', 'seed_5_b'),
('00000000-0000-0000-0000-000000000005', 'confirm', 'seed_5_c'),
('00000000-0000-0000-0000-000000000005', 'confirm', 'seed_5_d'),
('00000000-0000-0000-0000-000000000005', 'deny',    'seed_5_e'),
('00000000-0000-0000-0000-000000000005', 'deny',    'seed_5_f'),

-- 6. Pustertaler Höhenstraße: 1 upvote, 3 downvotes
('00000000-0000-0000-0000-000000000006', 'confirm', 'seed_6_a'),
('00000000-0000-0000-0000-000000000006', 'deny',    'seed_6_b'),
('00000000-0000-0000-0000-000000000006', 'deny',    'seed_6_c'),
('00000000-0000-0000-0000-000000000006', 'deny',    'seed_6_d'),

-- 7. Iseltal: 6 upvotes
('00000000-0000-0000-0000-000000000007', 'confirm', 'seed_7_a'),
('00000000-0000-0000-0000-000000000007', 'confirm', 'seed_7_b'),
('00000000-0000-0000-0000-000000000007', 'confirm', 'seed_7_c'),
('00000000-0000-0000-0000-000000000007', 'confirm', 'seed_7_d'),
('00000000-0000-0000-0000-000000000007', 'confirm', 'seed_7_e'),
('00000000-0000-0000-0000-000000000007', 'confirm', 'seed_7_f'),

-- 8. Debanttal: 2 upvotes, 1 downvote
('00000000-0000-0000-0000-000000000008', 'confirm', 'seed_8_a'),
('00000000-0000-0000-0000-000000000008', 'confirm', 'seed_8_b'),
('00000000-0000-0000-0000-000000000008', 'deny',    'seed_8_c'),

-- 9. Thurn-Pass: 7 upvotes
('00000000-0000-0000-0000-000000000009', 'confirm', 'seed_9_a'),
('00000000-0000-0000-0000-000000000009', 'confirm', 'seed_9_b'),
('00000000-0000-0000-0000-000000000009', 'confirm', 'seed_9_c'),
('00000000-0000-0000-0000-000000000009', 'confirm', 'seed_9_d'),
('00000000-0000-0000-0000-000000000009', 'confirm', 'seed_9_e'),
('00000000-0000-0000-0000-000000000009', 'confirm', 'seed_9_f'),
('00000000-0000-0000-0000-000000000009', 'confirm', 'seed_9_g'),

-- 10. Kals: 3 upvotes
('00000000-0000-0000-0000-000000000010', 'confirm', 'seed_10_a'),
('00000000-0000-0000-0000-000000000010', 'confirm', 'seed_10_b'),
('00000000-0000-0000-0000-000000000010', 'confirm', 'seed_10_c');
