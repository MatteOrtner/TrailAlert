'use client'

import { useState } from 'react'
import { Popup } from 'react-leaflet'
import { formatDistanceToNow, format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ThumbsUp, ThumbsDown, Clock, CalendarX } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
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

function clearVote(closureId: string) {
  localStorage.removeItem(VOTE_KEY(closureId))
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  closure: Closure
}

export function ClosurePopup({ closure }: Props) {
  const [upvotes, setUpvotes]       = useState(closure.upvotes)
  const [downvotes, setDownvotes]   = useState(closure.downvotes)
  const [voted, setVoted]           = useState<VoteType | null>(() => getSavedVote(closure.id))
  const [submitting, setSubmitting] = useState(false)
  const [voteError, setVoteError]   = useState<string | null>(null)

  const severity = SEVERITY_LABELS[closure.severity]

  async function refreshCounts() {
    const supabase = createClient()
    const { data } = await supabase
      .from('closures')
      .select('upvotes, downvotes')
      .eq('id', closure.id)
      .single()
    if (data) {
      setUpvotes(data.upvotes)
      setDownvotes(data.downvotes)
    }
  }

  async function handleVote(voteType: VoteType) {
    if (submitting) return
    setSubmitting(true)
    setVoteError(null)

    const supabase    = createClient()
    const fingerprint = getFingerprint()

    // --- Remove vote (clicking the same button again) ---
    if (voted === voteType) {
      const { error } = await supabase
        .from('votes')
        .delete()
        .match({ closure_id: closure.id, anon_fingerprint: fingerprint })
      if (error) {
        setVoteError('Abstimmung fehlgeschlagen.')
      } else {
        setVoted(null)
        clearVote(closure.id)
      }

    // --- Change vote (clicking the other button) ---
    } else if (voted) {
      const { error } = await supabase
        .from('votes')
        .update({ vote_type: voteType })
        .match({ closure_id: closure.id, anon_fingerprint: fingerprint })
      if (error) {
        setVoteError('Abstimmung fehlgeschlagen.')
      } else {
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
        setVoted(voteType)
        saveVote(closure.id, voteType)
      } else if (error.code === '23505') {
        setVoted(voteType)
        saveVote(closure.id, voteType)
      } else {
        setVoteError('Abstimmung fehlgeschlagen.')
        setSubmitting(false)
        return
      }
    }

    // Re-fetch counts from closures table — kept accurate by DB trigger
    await refreshCounts()
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
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
              voted === 'confirm'
                ? 'bg-success/25 text-success ring-1 ring-success/50'
                : 'bg-success/10 text-success hover:bg-success/20',
            ].join(' ')}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            Noch gesperrt {upvotes > 0 && <span className="opacity-70">({upvotes})</span>}
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleVote('deny')}
            className={[
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
              voted === 'deny'
                ? 'bg-danger/25 text-danger ring-1 ring-danger/50'
                : 'bg-danger/10 text-danger hover:bg-danger/20',
            ].join(' ')}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            Nicht mehr {downvotes > 0 && <span className="opacity-70">({downvotes})</span>}
          </button>
        </div>

        {voteError && (
          <p className="text-xs text-danger">{voteError}</p>
        )}
      </div>
    </Popup>
  )
}
