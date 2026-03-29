'use client'

import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface Props {
  onSignIn: () => void
  onAnonymous: () => void
  onDismiss: () => void
}

export function OnboardingSheet({ onSignIn, onAnonymous, onDismiss }: Props) {
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1005] bg-black/60 backdrop-blur-sm"
        onClick={onDismiss}
      />

      {/* Sheet panel */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed bottom-0 left-0 right-0 z-[1005] rounded-t-2xl shadow-2xl"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header row */}
        <div
          className="flex items-center justify-between px-6 pt-5 pb-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2
            className="text-lg font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Hilf der Community
          </h2>
          <button
            type="button"
            aria-label="schließen"
            onClick={onDismiss}
            className="rounded-lg p-1 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Mit einem Konto kannst du deine Meldungen verwalten, bearbeiten und Benachrichtigungen für deine Lieblingsrouten einrichten.
          </p>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={onSignIn}
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition-colors"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg-dark)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Jetzt anmelden
          </button>

          {/* Secondary CTA */}
          <button
            type="button"
            onClick={onAnonymous}
            className="w-full rounded-lg py-2.5 text-sm font-medium transition-colors"
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            Anonym melden
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
