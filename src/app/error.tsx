'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: 'rgba(239,68,68,0.12)' }}
      >
        <AlertTriangle className="h-8 w-8" style={{ color: 'var(--danger)' }} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Etwas ist schiefgelaufen
        </h2>
        <p className="max-w-sm text-sm" style={{ color: 'var(--text-secondary)' }}>
          Die App konnte nicht geladen werden. Bitte prüfe deine Internetverbindung und versuche es erneut.
        </p>
      </div>

      <button
        type="button"
        onClick={reset}
        className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
        style={{ background: 'var(--accent)', color: 'var(--bg-dark)' }}
      >
        <RefreshCw className="h-4 w-4" />
        Erneut versuchen
      </button>
    </div>
  )
}
