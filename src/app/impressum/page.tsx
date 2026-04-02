import Link from 'next/link'

const LEGAL_NAME = process.env.NEXT_PUBLIC_LEGAL_OWNER ?? 'Bitte Namen ergänzen'
const LEGAL_ADDRESS = process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? 'Bitte Adresse ergänzen'
const LEGAL_EMAIL = process.env.NEXT_PUBLIC_LEGAL_EMAIL ?? 'Bitte E-Mail ergänzen'

export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-24 sm:px-6">
      <h1 className="text-2xl font-bold text-text-primary">Impressum</h1>

      <section className="mt-8 space-y-3 text-sm leading-7 text-text-secondary">
        <h2 className="text-lg font-semibold text-text-primary">Angaben gemäß § 5 ECG / § 25 MedienG</h2>
        <p>{LEGAL_NAME}</p>
        <p>{LEGAL_ADDRESS}</p>
        <p>E-Mail: {LEGAL_EMAIL}</p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-text-secondary">
        <h2 className="text-lg font-semibold text-text-primary">Haftungshinweis</h2>
        <p>
          Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Vollständigkeit, Aktualität
          und Richtigkeit der bereitgestellten Informationen. Für Inhalte externer Links sind ausschließlich deren
          Betreiber verantwortlich.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-text-secondary">
        <h2 className="text-lg font-semibold text-text-primary">Urheberrecht</h2>
        <p>
          Inhalte und Werke auf dieser Plattform unterliegen dem geltenden Urheberrecht. Nutzung, Bearbeitung oder
          Verbreitung außerhalb der Grenzen des Urheberrechts bedürfen der Zustimmung des jeweiligen Rechteinhabers.
        </p>
      </section>

      <div className="mt-10 text-sm">
        <Link className="text-accent hover:underline" href="/datenschutz">
          Zur Datenschutzerklärung
        </Link>
      </div>
    </div>
  )
}
