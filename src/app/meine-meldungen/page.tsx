'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { CheckCircle, Trash2, MapPin, Loader2, AlertTriangle, Share2 } from 'lucide-react'
import type { Closure, ClosureType, SeverityLevel } from '@/lib/types'

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<ClosureType, string> = {
  forestwork:   'Forstarbeiten',
  construction: 'Baustelle',
  damage:       'Schaden',
  other:        'Sonstiges',
}

const SEVERITY_LABELS: Record<SeverityLevel, { label: string; color: string }> = {
  full_closure: { label: 'Vollsperrung', color: '#ef4444' },
  partial:      { label: 'Teilsperrung', color: '#f59e0b' },
  warning:      { label: 'Warnung',      color: '#eab308' },
}

// ---------------------------------------------------------------------------
// Closure card
// ---------------------------------------------------------------------------

function ClosureCard({
  closure,
  onResolved,
}: {
  closure:    Closure
  onResolved: (id: string) => void
}) {
  const [resolving, setResolving] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [copied,    setCopied]    = useState(false)

  const severity = SEVERITY_LABELS[closure.severity]

  async function handleResolve() {
    setResolving(true)
    setError(null)
    const { error: err } = await createClient()
      .from('closures')
      .update({ status: 'resolved' })
      .eq('id', closure.id)
    if (err) { setError('Fehler beim Markieren.'); setResolving(false) }
    else     { onResolved(closure.id) }
  }

  async function handleShare() {
    const url = `${window.location.origin}/?closure=${closure.id}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TrailAlert Sperre',
          text: `Schau dir das mal an: ${closure.title}`,
          url,
        })
      } catch (err) {
        // Ignored
      }
    } else {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-xl p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="rounded px-2 py-0.5 text-xs font-semibold"
          style={{ background: severity.color + '22', color: severity.color }}
        >
          {severity.label}
        </span>
        <span
          className="rounded px-2 py-0.5 text-xs font-medium"
          style={{ background: 'var(--bg-dark)', color: 'var(--text-secondary)' }}
        >
          {TYPE_LABELS[closure.closure_type]}
        </span>
      </div>

      {/* Title */}
      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
        {closure.title}
      </p>

      {/* Meta */}
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>
          Gemeldet{' '}
          {formatDistanceToNow(new Date(closure.created_at), { addSuffix: true, locale: de })}
        </span>
        <span>
          {closure.upvotes > 0 && `👍 ${closure.upvotes}`}
          {closure.upvotes > 0 && closure.downvotes > 0 && '  '}
          {closure.downvotes > 0 && `👎 ${closure.downvotes}`}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={resolving}
          onClick={handleResolve}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors disabled:opacity-50"
          style={{ background: '#22c55e22', color: '#22c55e' }}
        >
          {resolving
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <CheckCircle className="h-3.5 w-3.5" />
          }
          {resolving ? 'Wird markiert…' : 'Als gelöst markieren'}
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors hover:brightness-110"
          style={{ background: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <Share2 className="h-3.5 w-3.5" />
          {copied ? 'Kopiert!' : 'Teilen'}
        </button>
      </div>

      {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MeineMeldungenPage() {
  const { user, loading: authLoading } = useAuth()
  const [closures, setClosures]        = useState<Closure[]>([])
  const [loading,  setLoading]         = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    createClient()
      .from('closures')
      .select('*')
      .eq('reported_by', user.id)
      .neq('status', 'resolved')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setClosures(data ?? [])
        setLoading(false)
      })
  }, [user])

  // Page wrapper — body is overflow-hidden so we scroll within this div
  return (
    <div
      className="mx-auto w-full max-w-2xl px-4 py-8"
      style={{ height: '100dvh', overflowY: 'auto', paddingTop: 'calc(4rem + 1.5rem)' }}
    >
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Meine Meldungen
      </h1>

      {/* Auth loading */}
      {authLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      )}

      {/* Not logged in */}
      {!authLoading && !user && (
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
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Melde dich an, um deine Meldungen zu sehen und zu verwalten.
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

      {/* Loading closures */}
      {!authLoading && user && loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      )}

      {/* Empty state */}
      {!authLoading && user && !loading && closures.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: 'var(--bg-card)' }}
          >
            <MapPin className="h-8 w-8" style={{ color: 'var(--border)' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Noch keine Meldungen
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Sperren die du meldest, erscheinen hier und können von dir verwaltet werden.
          </p>
          <a
            href="/"
            className="rounded-lg px-5 py-2.5 text-sm font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--bg-dark)' }}
          >
            Sperre melden
          </a>
        </div>
      )}

      {/* List */}
      {!authLoading && user && !loading && closures.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {closures.length} aktive {closures.length === 1 ? 'Meldung' : 'Meldungen'}
          </p>
          {closures.map((c) => (
            <ClosureCard
              key={c.id}
              closure={c}
              onResolved={(id) => setClosures((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
