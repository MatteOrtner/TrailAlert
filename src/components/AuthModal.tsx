'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Mail, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthModal } from '@/contexts/AuthModalContext'

// ---------------------------------------------------------------------------
// Google SVG (no extra dep)
// ---------------------------------------------------------------------------

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Status = 'idle' | 'loading' | 'sent' | 'error'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuthModal() {
  const { isOpen, close: onClose } = useAuthModal()
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errMsg, setErrMsg] = useState('')

  function reset() {
    setStatus('idle')
    setErrMsg('')
    setEmail('')
  }

  function handleClose() {
    onClose()
    setTimeout(reset, 300)
  }

  // --- Google OAuth ---
  async function handleGoogle() {
    setStatus('loading')
    const supabase   = createClient()
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error }  = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo },
    })
    if (error) {
      setErrMsg(error.message)
      setStatus('error')
    }
    // On success the browser redirects — no further action needed
  }

  // --- Magic Link ---
  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrMsg('')

    const supabase   = createClient()
    const redirectTo = `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
        // Creates account on first login — no separate register flow needed
        shouldCreateUser: true,
      },
    })

    if (error) {
      setErrMsg(error.message)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  // Shared input style
  const inputStyle: React.CSSProperties = {
    width:        '100%',
    background:   'var(--bg-dark)',
    border:       '1px solid var(--border)',
    borderRadius: 8,
    color:        'var(--text-primary)',
    padding:      '10px 12px',
    fontSize:     14,
    outline:      'none',
  }

  if (!isOpen) return null

  // Portal renders outside <header> so its stacking context doesn't cap z-index
  return createPortal(
    <>
      {/* Backdrop — flex centering keeps the modal fully in viewport */}
      <div
        className="fixed inset-0 z-[1010] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
      {/* Modal — stop clicks propagating to backdrop */}
      <div
        className="relative w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4"
             style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
            Anmelden oder registrieren
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">

          {/* Success state */}
          {status === 'sent' ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full"
                   style={{ background: 'var(--success)/15' }}>
                <CheckCircle2 className="h-8 w-8" style={{ color: 'var(--success)' }} />
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  E-Mail gesendet!
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Öffne den Link in deiner E-Mail <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> um dich anzumelden.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="text-sm"
                style={{ color: 'var(--accent)' }}
              >
                Andere E-Mail versuchen
              </button>
            </div>
          ) : (
            <>
              {/* Google OAuth */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={status === 'loading'}
                className="flex w-full items-center justify-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
                style={{
                  background: 'var(--bg-dark)',
                  border:     '1px solid var(--border)',
                  color:      'var(--text-primary)',
                  cursor:     status === 'loading' ? 'not-allowed' : 'pointer',
                  opacity:    status === 'loading' ? 0.6 : 1,
                }}
              >
                {status === 'loading' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Mit Google anmelden
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>oder</span>
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
              </div>

              {/* Magic Link form */}
              <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    E-Mail-Adresse
                  </label>
                  <div className="relative flex items-center">
                    <Mail
                      className="pointer-events-none absolute left-3 h-4 w-4"
                      style={{ color: 'var(--text-secondary)' }}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="du@example.com"
                      required
                      style={{ ...inputStyle, paddingLeft: 36 }}
                    />
                  </div>
                </div>

                {errMsg && (
                  <p className="text-xs" style={{ color: 'var(--danger)' }}>{errMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading' || !email.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors"
                  style={{
                    background: 'var(--accent)',
                    color:      'var(--bg-dark)',
                    border:     'none',
                    cursor:     (status === 'loading' || !email.trim()) ? 'not-allowed' : 'pointer',
                    opacity:    (status === 'loading' || !email.trim()) ? 0.6 : 1,
                  }}
                >
                  {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
                  Magic Link senden
                </button>
              </form>

              {/* Info note */}
              <p className="rounded-lg px-3 py-2.5 text-xs leading-relaxed"
                 style={{ background: 'var(--bg-dark)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Login ist optional.</strong>{' '}
                Sperren melden und abstimmen geht auch ohne Account.
                Ein Account wird nur für E-Mail-Benachrichtigungen und Watch Areas benötigt.
              </p>
            </>
          )}
        </div>
      </div>
      </div>
    </>,
    document.body,
  )
}
