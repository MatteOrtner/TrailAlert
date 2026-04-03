'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Plus, Menu, X } from 'lucide-react'
import { useReportForm } from '@/contexts/ReportFormContext'
import { AuthButton, AuthButtonMobile } from './AuthButton'
import { useAuth } from '@/contexts/AuthContext'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useAuthModal } from '@/contexts/AuthModalContext'
import { OnboardingSheet } from './OnboardingSheet'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { open: openReport } = useReportForm()
  const { user } = useAuth()
  const { hasSeen, markSeen } = useOnboarding()
  const { open: openAuthModal } = useAuthModal()
  const [showOnboarding, setShowOnboarding] = useState(false)

  function handleReport() {
    setMenuOpen(false)
    if (!hasSeen && !user) {
      setShowOnboarding(true)
      return
    }
    openReport()
  }

  function handleOnboardingSignIn() {
    markSeen()
    setShowOnboarding(false)
    openAuthModal()
  }

  function handleOnboardingAnonymous() {
    markSeen()
    setShowOnboarding(false)
    openReport()
  }

  function handleOnboardingDismiss() {
    // Do NOT call markSeen — sheet reappears on next Melden tap
    setShowOnboarding(false)
  }

  return (
    <header className="fixed inset-x-0 top-0 z-[1000] h-16 border-b border-border bg-bg-dark/95" style={{ paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="mx-auto h-full max-w-7xl px-4 sm:px-6">

        {/* Mobile bar */}
        <div className="flex h-full items-center justify-between sm:hidden">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/branding/trailalert-brand.png"
              alt="TrailAlert Logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-cover"
              priority
            />
            <span className="text-lg font-bold tracking-tight">
              <span className="text-text-primary">Trail</span>
              <span className="text-accent">Alert</span>
            </span>
          </Link>

          <button
            type="button"
            className="flex items-center justify-center rounded-lg border border-border p-2 text-text-secondary"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Desktop bar: left | center | right */}
        <div className="hidden h-full items-center sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
          {/* Left */}
          <div className="justify-self-start">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image
                src="/branding/trailalert-brand.png"
                alt="TrailAlert Logo"
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg object-cover"
                priority
              />
              <span className="text-lg font-bold tracking-tight">
                <span className="text-text-primary">Trail</span>
                <span className="text-accent">Alert</span>
              </span>
            </Link>
          </div>

          {/* Center */}
          <div className="justify-self-center">
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-bg-card px-3 py-1.5">
              <MapPin className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-medium text-text-secondary">
                Osttirol / Tirol
              </span>
            </div>
          </div>

          {/* Right */}
          <div className="justify-self-end">
            <div className="flex items-center gap-3">
              <Link
                href="/tour-check"
                className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                Tour prüfen
              </Link>
              <button
                type="button"
                onClick={handleReport}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-dark transition-colors hover:bg-accent-hover"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Sperre melden
              </button>
              <AuthButton />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-border bg-bg-card px-4 py-4 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 self-start rounded-full border border-border px-3 py-1.5">
            <MapPin className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-medium text-text-secondary">
              Osttirol / Tirol
            </span>
          </div>

          <button
            type="button"
            onClick={handleReport}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg-dark"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Sperre melden
          </button>

          <Link
            href="/tour-check"
            onClick={() => setMenuOpen(false)}
            className="flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            Tour prüfen
          </Link>

          <AuthButtonMobile onClose={() => setMenuOpen(false)} />
        </div>
      )}

      {showOnboarding && (
        <OnboardingSheet
          onSignIn={handleOnboardingSignIn}
          onAnonymous={handleOnboardingAnonymous}
          onDismiss={handleOnboardingDismiss}
        />
      )}
    </header>
  )
}
