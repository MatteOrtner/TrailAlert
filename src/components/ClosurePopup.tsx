'use client'

import { useState, useEffect, useRef } from 'react'
import { Popup } from 'react-leaflet'
import { formatDistanceToNow, format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ThumbsUp, ThumbsDown, Clock, CalendarX, CheckCircle, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { Closure, ClosureType, SeverityLevel, VoteType } from '@/lib/types'

// ---------------------------------------------------------------------------
// Label maps (German UI)
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<ClosureType, string> = {
  forestwork:   'Forstarbeiten',
  construction: 'Baustelle',
  damage:       'Schaden',
  other:        'Sonstiges',
}

const SEVERITY_LABELS: Record<SeverityLevel, { label: string; className: string }> = {
  full_closure: { label: 'Vollsperrung', className: 'bg-danger/15 text-danger' },
  partial:      { label: 'Teilsperrung', className: 'bg-accent/15 text-accent' },
  warning:      { label: 'Warnung',      className: 'bg-yellow-500/15 text-yellow-400' },
}

// ---------------------------------------------------------------------------
// Fingerprint helpers
// ---------------------------------------------------------------------------

const FP_KEY = 'ta_fingerprint'
const VOTE_KEY = (id: string) => `ta_vote_${id}`

function getFingerprint(): string {
  let fp = localStorage.getItem(FP_KEY)
  if (!fp) {
    fp = crypto.randomUUID()
    localStorage.setItem(FP_KEY, fp)
  }
  return fp
}

function getSavedVote(closureId: string): VoteType | null {
  return localStorage.getItem(VOTE_KEY(closureId)) as VoteType | null
}

function saveVote(closureId: string, vote: VoteType) {
  localStorage.setItem(VOTE_KEY(closureId), vote)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  closure: Closure
}

export function ClosurePopup({ closure }: Props) {
  const { user } = useAuth()
  const [voted, setVoted]           = useState<VoteType | null>(() => getSavedVote(closure.id))
  const [submitting, setSubmitting] = useState(false)
  const [voteError, setVoteError]   = useState<string | null>(null)
  const [resolving, setResolving]   = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [ownerError, setOwnerError] = useState<string | null>(null)

  const isOwner = !!user && user.id === closure.reported_by

  async function handleResolve() {
    if (resolving) return
    setResolving(true)
    setOwnerError(null)
    const supabase = createClient()
    const { error } = await supabase
      .from('closures')
      .update({ status: 'resolved' })
      .eq('id', closure.id)
    if (error) {
      setOwnerError('Konnte nicht als gelöst markiert werden.')
      setResolving(false)
    }
    // On success, realtime removes the marker automatically — no local state needed
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    setOwnerError(null)
    const supabase = createClient()
    const { error } = await supabase
      .from('closures')
      .delete()
      .eq('id', closure.id)
    if (error) {
      setOwnerError('Löschen fehlgeschlagen.')
      setDeleting(false)
    }
    // On success, realtime removes the marker automatically — no local state needed
  }
  // Optimistic deltas: reset to 0 once realtime updates the prop counts
  const [delta, setDelta]           = useState<{ confirm: number; deny: number }>({ confirm: 0, deny: 0 })

  // Track previous prop counts to detect realtime updates
  const prevUpvotes   = useRef(closure.upvotes)
  const prevDownvotes = useRef(closure.downvotes)

  useEffect(() => {
    if (closure.upvotes !== prevUpvotes.current || closure.downvotes !== prevDownvotes.current) {
      prevUpvotes.current   = closure.upvotes
      prevDownvotes.current = closure.downvotes
      setDelta({ confirm: 0, deny: 0 })
    }
  }, [closure.upvotes, closure.downvotes])

  const severity = SEVERITY_LABELS[closure.severity]

  // Display counts with optimistic delta applied
  const displayUpvotes   = closure.upvotes + delta.confirm
  const displayDownvotes = closure.downvotes + delta.deny

  async function handleVote(voteType: VoteType) {
    if (submitting || voted === voteType) return
    setSubmitting(true)
    setVoteError(null)

    const supabase    = createClient()
    const fingerprint = getFingerprint()

    // --- Change vote (already voted, clicking the other button) ---
    if (voted) {
      const { error } = await supabase
        .from('votes')
        .update({ vote_type: voteType })
        .match({ closure_id: closure.id, anon_fingerprint: fingerprint })
      if (error) {
        setVoteError('Abstimmung fehlgeschlagen.')
      } else {
        if (voteType === 'confirm') {
          setDelta(d => ({ confirm: d.confirm + 1, deny: d.deny - 1 }))
        } else {
          setDelta(d => ({ confirm: d.confirm - 1, deny: d.deny + 1 }))
        }
        setVoted(voteType)
        saveVote(closure.id, voteType)
      }

    // --- New vote ---
    } else {
      const { error } = await supabase.from('votes').insert({
        closure_id:       closure.id,
        vote_type:        voteType,
        anon_fingerprint: fingerprint,
      })
      if (!error) {
        if (voteType === 'confirm') {
          setDelta(d => ({ ...d, confirm: d.confirm + 1 }))
        } else {
          setDelta(d => ({ ...d, deny: d.deny + 1 }))
        }
        setVoted(voteType)
        saveVote(closure.id, voteType)
      } else if (error.code === '23505') {
        // Vote already exists in DB — sync local state without changing delta
        setVoted(voteType)
        saveVote(closure.id, voteType)
      } else {
        setVoteError('Abstimmung fehlgeschlagen.')
      }
    }

    setSubmitting(false)
  }

  return (
    <Popup minWidth={240} maxWidth={300} className="ta-popup">
      <div className="flex flex-col gap-2 p-0.5" style={{ fontFamily: 'var(--font-jakarta, system-ui)', color: '#111827' }}>

        {/* Header badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="rounded px-2 py-0.5 text-xs font-medium" style={{ background: '#f3f4f6', color: '#6b7280' }}>
            {TYPE_LABELS[closure.closure_type]}
          </span>
          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${severity.className}`}>
            {severity.label}
          </span>
        </div>

        {/* Title */}
        <p className="text-sm font-semibold leading-snug" style={{ color: '#111827' }}>{closure.title}</p>

        {/* Description */}
        {closure.description && (
          <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>{closure.description}</p>
        )}

        {/* Photo */}
        {closure.photo_url && (
          <img
            src={closure.photo_url}
            alt="Foto der Sperre"
            className="w-full rounded-md object-cover"
            style={{ maxHeight: 120 }}
          />
        )}

        {/* Meta */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-xs" style={{ color: '#6b7280' }}>
            <Clock className="h-3 w-3 shrink-0" />
            <span>
              Gemeldet{' '}
              {formatDistanceToNow(new Date(closure.created_at), {
                addSuffix: true,
                locale: de,
              })}
            </span>
          </div>
          {closure.expected_end && (
            <div className="flex items-center gap-1 text-xs" style={{ color: '#6b7280' }}>
              <CalendarX className="h-3 w-3 shrink-0" />
              <span>
                Voraussichtlich bis{' '}
                {format(new Date(closure.expected_end), 'dd.MM.yyyy', { locale: de })}
              </span>
            </div>
          )}
        </div>

        {/* Voting */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleVote('confirm')}
            className={[
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors',
              voted === 'confirm'
                ? 'bg-success/25 text-success ring-1 ring-success/50 cursor-default'
                : 'bg-success/10 text-success hover:bg-success/20 cursor-pointer',
            ].join(' ')}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            Noch gesperrt {displayUpvotes > 0 && <span className="opacity-70">({displayUpvotes})</span>}
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleVote('deny')}
            className={[
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors',
              voted === 'deny'
                ? 'bg-danger/25 text-danger ring-1 ring-danger/50 cursor-default'
                : 'bg-danger/10 text-danger hover:bg-danger/20 cursor-pointer',
            ].join(' ')}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            Nicht mehr {displayDownvotes > 0 && <span className="opacity-70">({displayDownvotes})</span>}
          </button>
        </div>

        {voteError && (
          <p className="text-xs text-danger">{voteError}</p>
        )}

        {/* Owner actions — only visible to the reporter */}
        {isOwner && (
          <div className="border-t pt-2 flex gap-2" style={{ borderColor: '#e5e7eb' }}>
            <button
              type="button"
              disabled={resolving || deleting}
              onClick={handleResolve}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors bg-green-500/10 text-green-600 hover:bg-green-500/20 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {resolving ? 'Wird markiert…' : 'Gelöst'}
            </button>
            <button
              type="button"
              disabled={resolving || deleting}
              onClick={handleDelete}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors bg-danger/10 text-danger hover:bg-danger/20 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? 'Wird gelöscht…' : 'Löschen'}
            </button>
          </div>
        )}
        {ownerError && (
          <p className="text-xs text-danger">{ownerError}</p>
        )}
      </div>
    </Popup>
  )
}
