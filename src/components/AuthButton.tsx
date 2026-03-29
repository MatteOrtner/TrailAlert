'use client'

import { useEffect, useRef, useState } from 'react'
import { LogIn, LogOut, Map, Bell, Settings, ChevronDown, Loader2, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useWatchAreaPanel } from '@/contexts/WatchAreaContext'
import { useAuthModal } from '@/contexts/AuthModalContext'
import { ADMIN_EMAILS } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Avatar — shows first letter of email or display name
// ---------------------------------------------------------------------------

function Avatar({ user }: { user: NonNullable<ReturnType<typeof useAuth>['user']> }) {
  const initial = (
    user.user_metadata?.full_name?.[0] ??
    user.user_metadata?.name?.[0] ??
    user.email?.[0] ??
    '?'
  ).toUpperCase()

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={initial}
        className="h-7 w-7 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <span
      className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
      style={{ background: 'var(--accent)', color: 'var(--bg-dark)' }}
    >
      {initial}
    </span>
  )
}

// ---------------------------------------------------------------------------
// AuthButton
// ---------------------------------------------------------------------------

// Items with href navigate; items with action call a function
const NAV_ITEMS = [
  { icon: Map,      label: 'Meine Meldungen', href: '/meine-meldungen', action: null },
  { icon: Settings, label: 'Einstellungen',   href: '/einstellungen',   action: null },
] as const

export function AuthButton() {
  const { user, loading }         = useAuth()
  const { open: openWatchAreas }  = useWatchAreaPanel()
  const { open: openAuthModal }   = useAuthModal()
  const [dropdownOpen, setDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    function handler(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  async function handleSignOut() {
    setDropdown(false)
    await createClient().auth.signOut()
  }

  // Loading skeleton
  if (loading) {
    return (
      <div
        className="h-8 w-8 animate-pulse rounded-full"
        style={{ background: 'var(--border)' }}
      />
    )
  }

  // Not logged in
  if (!user) {
    return (
      <button
        type="button"
        onClick={openAuthModal}
        className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:border-text-secondary hover:text-text-primary"
        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        <LogIn className="h-4 w-4" />
        Anmelden
      </button>
    )
  }

  // Logged in
  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split('@')[0] ??
    'Account'

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setDropdown((o) => !o)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-card"
        style={{ border: '1px solid var(--border)' }}
      >
        <Avatar user={user} />
        <span className="hidden text-sm font-medium sm:block" style={{ color: 'var(--text-primary)' }}>
          {displayName}
        </span>
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform"
          style={{
            color:     'var(--text-secondary)',
            transform: dropdownOpen ? 'rotate(180deg)' : 'none',
          }}
        />
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div
          className="absolute right-0 top-full z-[1020] mt-1.5 w-52 rounded-xl py-1 shadow-2xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {/* User info row */}
          <div className="flex items-center gap-2.5 px-3 py-2.5"
               style={{ borderBottom: '1px solid var(--border)' }}>
            <Avatar user={user} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {displayName}
              </span>
              <span className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>
                {user.email}
              </span>
            </div>
          </div>

          {/* Watch Areas panel trigger */}
          <button
            type="button"
            onClick={() => { setDropdown(false); openWatchAreas() }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-bg-card-hover"
            style={{ color: 'var(--text-primary)' }}
          >
            <Bell className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            Watch Areas
          </button>

          {/* Nav items */}
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => (
            <a
              key={href}
              href={href}
              onClick={() => setDropdown(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-bg-card-hover"
              style={{ color: 'var(--text-primary)' }}
            >
              <Icon className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
              {label}
            </a>
          ))}

          {/* Admin link */}
          {user.email && ADMIN_EMAILS.includes(user.email) && (
            <a
              href="/admin"
              onClick={() => setDropdown(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors hover:bg-bg-card-hover"
              style={{ color: 'var(--accent)' }}
            >
              <ShieldAlert className="h-4 w-4" />
              Admin-Bereich
            </a>
          )}

          {/* Sign out */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-bg-card-hover"
              style={{ color: 'var(--danger)' }}
            >
              <LogOut className="h-4 w-4" />
              Abmelden
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mobile variant — for the hamburger menu (no dropdown, opens modal directly)
// ---------------------------------------------------------------------------

export function AuthButtonMobile({ onClose }: { onClose: () => void }) {
  const { user, loading } = useAuth()
  const { open: openAuthModal } = useAuthModal()
  const { open: openWatchAreas }  = useWatchAreaPanel()

  async function handleSignOut() {
    onClose()
    await createClient().auth.signOut()
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border px-4 py-2.5"
           style={{ borderColor: 'var(--border)' }}>
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--text-secondary)' }} />
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Laden…</span>
      </div>
    )
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => { openAuthModal(); onClose() }}
        className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium"
        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        <LogIn className="h-4 w-4" />
        Anmelden
      </button>
    )
  }

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split('@')[0] ??
    'Account'

  return (
    <div className="flex flex-col gap-1 pt-3 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
      {/* User Info */}
      <div className="flex items-center gap-3 px-2 pb-3 pt-1">
        <Avatar user={user} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {displayName}
          </span>
          <span className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>
            {user.email}
          </span>
        </div>
      </div>

      {/* Watch Areas */}
      <button
        type="button"
        onClick={() => { onClose(); openWatchAreas() }}
        className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors hover:bg-bg-dark"
        style={{ color: 'var(--text-primary)' }}
      >
        <Bell className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
        Watch Areas
      </button>

      {/* Nav Items (Meine Meldungen, etc) */}
      {NAV_ITEMS.map(({ icon: Icon, label, href }) => (
        <a
          key={href}
          href={href}
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors hover:bg-bg-dark"
          style={{ color: 'var(--text-primary)' }}
        >
          <Icon className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
          {label}
        </a>
      ))}

      {/* Admin Link Mobile */}
      {user.email && ADMIN_EMAILS.includes(user.email) && (
        <a
          href="/admin"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors hover:bg-bg-dark"
          style={{ color: 'var(--accent)' }}
        >
          <ShieldAlert className="h-4 w-4" />
          Admin-Bereich
        </a>
      )}

      {/* Sign Out */}
      <button
        type="button"
        onClick={handleSignOut}
        className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium mt-1 transition-colors hover:bg-bg-dark"
        style={{ color: 'var(--danger)' }}
      >
        <LogOut className="h-4 w-4" />
        Abmelden
      </button>
    </div>
  )
}
