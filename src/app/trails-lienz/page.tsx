import type { Metadata } from 'next'
import Link from 'next/link'
import { SEO_KEYWORDS } from '@/lib/seo'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://trailalert.at').replace(/\/+$/, '')

const FAQ_DATA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Wie finde ich aktuelle Trails in Lienz ohne Sperren?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Mit TrailAlert siehst du gemeldete Forstwege-Sperren rund um Lienz, Osttirol und Tirol direkt auf der Karte und kannst aktive Meldungen schnell prüfen.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kann ich eine MTB-Route gegen aktuelle Sperren prüfen?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ja. Im Tour-Check kannst du eine GPX-Route laden und prüfen, ob entlang deiner Strecke aktive Sperren gemeldet sind.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kann ich selbst eine Trail-Sperre melden?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ja. Über "Sperre melden" kannst du einen Punkt oder einen Straßenverlauf markieren und die Community informieren.',
      },
    },
  ],
}

export const metadata: Metadata = {
  title: 'Trails Lienz: aktuelle Forstwege-Sperren & MTB-Tour-Check | TrailAlert',
  description:
    'Trails Lienz, Osttirol und Tirol: Prüfe aktuelle Wegsperren für Mountainbike-Touren und melde neue Sperren direkt in TrailAlert.',
  keywords: [...SEO_KEYWORDS, 'trails lienz aktuell', 'forstwege sperren lienz heute', 'mtb trails osttirol'],
  alternates: { canonical: '/trails-lienz' },
  openGraph: {
    title: 'Trails Lienz: aktuelle Forstwege-Sperren | TrailAlert',
    description:
      'Live-Überblick für Trails in Lienz und Osttirol: Sperren sehen, Tour prüfen, Sperren melden.',
    type: 'article',
    url: `${APP_URL}/trails-lienz`,
  },
}

export default function TrailsLienzPage() {
  return (
    <div
      className="mx-auto w-full max-w-3xl px-4 pb-20 sm:px-6"
      style={{
        height: '100dvh',
        overflowY: 'auto',
        paddingTop: 'calc(4rem + env(safe-area-inset-top) + 1.5rem)',
      }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_DATA) }} />

      <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
        Trails Lienz: aktuelle Sperren für MTB-Touren
      </h1>
      <p className="mt-4 text-sm leading-7 text-text-secondary sm:text-base">
        Wenn du nach <strong>Trails Lienz</strong>, <strong>MTB Lienz</strong> oder{' '}
        <strong>Forstwege-Sperren in Osttirol</strong> suchst, bekommst du bei TrailAlert einen schnellen Überblick
        über gemeldete Sperren. So kannst du Touren rund um Lienz, Hochstein, Zettersfeld und in Tirol besser planen.
      </p>

      <section className="mt-8 space-y-3 text-sm leading-7 text-text-secondary sm:text-base">
        <h2 className="text-lg font-semibold text-text-primary">Was du mit TrailAlert prüfen kannst</h2>
        <p>Aktive Wegsperren auf der Karte in Osttirol und Tirol.</p>
        <p>GPX-Touren mit dem Tour-Check gegen gemeldete Sperren.</p>
        <p>Community-Meldungen mit Punkt oder Straßenverlauf.</p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-text-secondary sm:text-base">
        <h2 className="text-lg font-semibold text-text-primary">Häufige Suchanfragen</h2>
        <p>trails lienz, mountainbike lienz, forstweg sperre lienz, trails osttirol, trail status tirol.</p>
        <p>Damit du schneller starten kannst, findest du alles zentral auf einer Karte statt verteilt auf mehrere Quellen.</p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-dark transition-colors hover:bg-accent-hover"
        >
          Karte öffnen
        </Link>
        <Link
          href="/tour-check"
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-card"
        >
          Tour prüfen
        </Link>
      </div>
    </div>
  )
}
