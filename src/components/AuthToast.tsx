'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, X } from 'lucide-react'

interface Props {
  authOk:    boolean
  authError: string | null
}

export function AuthToast({ authOk, authError }: Props) {
  const [visible, setVisible] = useState(authOk || !!authError)

  useEffect(() => {
    if (!visible) return

    // Strip auth params from URL so reload / share doesn't re-show the toast
    const url = new URL(window.location.href)
    url.searchParams.delete('auth')
    url.searchParams.delete('auth_error')
    window.history.replaceState({}, '', url.toString())

    // Auto-dismiss after 5 s
    const id = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(id)
  }, [visible])

  if (!visible) return null

  const isError = !!authError

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[2000] flex -translate-x-1/2 items-center gap-3 rounded-xl px-4 py-3 shadow-2xl"
      style={{
        background:  'var(--bg-card)',
        border:      `1px solid ${isError ? 'var(--danger)' : 'var(--success)'}`,
        minWidth:    280,
        maxWidth:    'calc(100vw - 2rem)',
      }}
    >
      {isError ? (
        <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: 'var(--danger)' }} />
      ) : (
        <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: 'var(--success)' }} />
      )}

      <p className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {isError
          ? `Anmeldung fehlgeschlagen: ${authError}`
          : 'Erfolgreich angemeldet!'}
      </p>

      <button
        type="button"
        onClick={() => setVisible(false)}
        className="shrink-0 rounded-md p-1 transition-colors hover:bg-bg-card-hover"
        style={{ color: 'var(--text-secondary)' }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
