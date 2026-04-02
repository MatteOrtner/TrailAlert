'use client'

import { createPortal } from 'react-dom'
import { AlertTriangle, MapPin, Bell, Plus } from 'lucide-react'

interface Props {
  onDismiss: () => void
}

const STEPS = [
  {
    icon: MapPin,
    color: '#3b82f6',
    bg:    'rgba(59,130,246,0.12)',
    title: 'Sperren entdecken',
    desc:  'Marker auf der Karte zeigen aktive Sperren. Tippe drauf für Details, Fotos und Abstimmung.',
  },
  {
    icon: Plus,
    color: '#f59e0b',
    bg:    'rgba(245,158,11,0.12)',
    title: 'Sperre melden',
    desc:  'Kennst du eine gesperrte Strecke? Melde sie in 3 Schritten — anonym oder mit Konto.',
  },
  {
    icon: Bell,
    color: '#22c55e',
    bg:    'rgba(34,197,94,0.12)',
    title: 'Gebiet beobachten',
    desc:  'Leg Watch Areas fest und erhalte eine E-Mail sobald in deinem Revier eine neue Sperre gemeldet wird.',
  },
]

export function WelcomeSheet({ onDismiss }: Props) {
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1010] bg-black/70 backdrop-blur-sm"
        onClick={onDismiss}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed bottom-0 left-0 right-0 z-[1010] rounded-t-2xl shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3 px-6 pt-7 pb-5"
             style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: 'rgba(245,158,11,0.15)' }}>
            <AlertTriangle className="h-6 w-6" style={{ color: 'var(--accent)' }} strokeWidth={2.5} />
          </span>
          <div className="text-center">
            <h2 className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
              Willkommen bei TrailAlert
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Aktuelle Forstwege-Sperren für Mountainbiker in Osttirol &amp; Tirol
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-3 px-6 py-5">
          {STEPS.map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: bg }}
              >
                <Icon className="h-5 w-5" style={{ color }} strokeWidth={2} />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {title}
                </span>
                <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {desc}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] sm:pb-6">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full rounded-xl py-3 text-sm font-bold transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--bg-dark)' }}
          >
            Los geht&apos;s
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
