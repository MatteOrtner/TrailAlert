import Link from 'next/link'
import { notFound } from 'next/navigation'

const LEGAL_NAME = process.env.NEXT_PUBLIC_LEGAL_OWNER ?? 'Bitte Namen ergänzen'
const LEGAL_ADDRESS = process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? 'Bitte Adresse ergänzen'
const LEGAL_EMAIL = process.env.NEXT_PUBLIC_LEGAL_EMAIL ?? 'Bitte E-Mail ergänzen'
const LEGAL_PAGES_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LEGAL_PAGES === 'true'

export default function DatenschutzPage() {
  if (!LEGAL_PAGES_ENABLED) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-24 sm:px-6">
      <h1 className="text-2xl font-bold text-text-primary">Datenschutzerklärung</h1>
      <p className="mt-3 text-sm text-text-secondary">
        Stand: {new Date().toLocaleDateString('de-AT')}
      </p>

      <section className="mt-8 space-y-3 text-sm leading-7 text-text-secondary">
        <h2 className="text-lg font-semibold text-text-primary">1. Verantwortlicher</h2>
        <p>{LEGAL_NAME}</p>
        <p>{LEGAL_ADDRESS}</p>
        <p>E-Mail: {LEGAL_EMAIL}</p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-text-secondary">
        <h2 className="text-lg font-semibold text-text-primary">2. Verarbeitete Daten</h2>
        <p>
          Bei der Nutzung von TrailAlert verarbeiten wir insbesondere folgende Daten: Account- und Auth-Daten,
          gemeldete Sperren (inklusive Standortdaten), Stimmen (Votes), Watch Areas und technisch notwendige Logdaten.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-text-secondary">
        <h2 className="text-lg font-semibold text-text-primary">3. Zweck der Verarbeitung</h2>
        <p>
          Die Daten werden verarbeitet, um Sperrmeldungen anzuzeigen, Community-Voting zu ermöglichen, Watch-Area-
          Benachrichtigungen zu versenden und die Stabilität der Plattform sicherzustellen.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-text-secondary">
        <h2 className="text-lg font-semibold text-text-primary">4. Empfänger und Dienste</h2>
        <p>
          Für Betrieb und Bereitstellung werden externe Dienstleister eingesetzt, darunter Supabase (Datenbank/Auth),
          Vercel (Hosting) und Resend (E-Mail-Zustellung).
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-text-secondary">
        <h2 className="text-lg font-semibold text-text-primary">5. Deine Rechte</h2>
        <p>
          Du hast grundsätzlich das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit
          und Widerspruch. Für Anfragen nutze bitte die oben angegebene E-Mail-Adresse.
        </p>
      </section>

      <div className="mt-10 text-sm">
        <Link className="text-accent hover:underline" href="/impressum">
          Zum Impressum
        </Link>
      </div>
    </div>
  )
}
