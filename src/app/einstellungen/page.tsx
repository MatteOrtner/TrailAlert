'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useWatchAreaPanel } from '@/contexts/WatchAreaContext'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, Bell, LogOut, Loader2, User } from 'lucide-react'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EinstellungenPage() {
  const { user, loading } = useAuth()
  const { open: openWatchAreas } = useWatchAreaPanel()

  async function handleSignOut() {
    await createClient().auth.signOut()
    window.location.href = '/'
  }

  const displayName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split('@')[0] ??
    'Account'

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined

  return (
    <div
      className="mx-auto w-full max-w-2xl px-4 py-8"
      style={{ height: '100dvh', overflowY: 'auto', paddingTop: 'calc(4rem + 1.5rem)' }}
    >
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Einstellungen
      </h1>

      {/* Auth loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      )}

      {/* Not logged in */}
      {!loading && !user && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: 'var(--bg-card)' }}
          >
            <AlertTriangle className="h-8 w-8" style={{ color: 'var(--accent)' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Anmeldung erforderlich
          </p>
          <a
            href="/"
            className="rounded-lg px-5 py-2.5 text-sm font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--bg-dark)' }}
          >
            Zur Karte
          </a>
        </div>
      )}

      {/* Settings content */}
      {!loading && user && (
        <div className="flex flex-col gap-6">

          {/* Account section */}
          <section
            className="rounded-xl p-5 flex flex-col gap-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Account
            </h2>
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-14 w-14 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold"
                  style={{ background: 'var(--accent)', color: 'var(--bg-dark)' }}
                >
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {displayName}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {user.email}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Angemeldet via{' '}
                  {user.app_metadata?.provider === 'google' ? 'Google' : 'Magic Link'}
                </p>
              </div>
            </div>
          </section>

          {/* Notifications section */}
          <section
            className="rounded-xl p-5 flex flex-col gap-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Benachrichtigungen
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Watch Areas benachrichtigen dich per E-Mail wenn neue Sperren in deinen Gebieten gemeldet werden.
            </p>
            <button
              type="button"
              onClick={openWatchAreas}
              className="flex items-center justify-between rounded-lg px-4 py-3 transition-colors"
              style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Watch Areas verwalten
                </span>
              </div>
              <span className="text-xs" style={{ color: 'var(--accent)' }}>Öffnen →</span>
            </button>
          </section>

          {/* My reports link */}
          <section
            className="rounded-xl p-5 flex flex-col gap-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Meine Aktivität
            </h2>
            <a
              href="/meine-meldungen"
              className="flex items-center justify-between rounded-lg px-4 py-3 transition-colors"
              style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <User className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Meine Meldungen
                </span>
              </div>
              <span className="text-xs" style={{ color: 'var(--accent)' }}>Öffnen →</span>
            </a>
          </section>

          {/* Sign out */}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
            style={{ background: 'var(--danger)/10', color: 'var(--danger)', border: '1px solid var(--danger)/20' }}
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </button>

        </div>
      )}
    </div>
  )
}
