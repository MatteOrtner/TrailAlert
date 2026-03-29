'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Popup } from 'react-leaflet'
import { formatDistanceToNow, format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ThumbsUp, ThumbsDown, Clock, CalendarX, CheckCircle, X, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { Closure, ClosureType, SeverityLevel, VoteType } from '@/lib/types'
import { ClosureComments } from './ClosureComments'

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
  full_closure: { label: 'Vollsperrung', className: 'bg-danger/20 text-danger' },
  partial:      { label: 'Teilsperrung', className: 'bg-accent/20 text-accent' },
  warning:      { label: 'Warnung',      className: 'bg-accent/10 text-accent/80' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// A basic fingerprint function to roughly identify anonymous users
function getFingerprint() {
  let fp = localStorage.getItem('ta_anon_fp')
  if (!fp) {
    fp = crypto.randomUUID()
    localStorage.setItem('ta_anon_fp', fp)
  }
  return fp
}

const VOTE_KEY = (id: string) => `ta_vote_${id}`

function getSavedVote(closureId: string): VoteType | null {
  if (typeof window === 'undefined') return null
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
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [resolving, setResolving]       = useState(false)
  const [ownerError, setOwnerError] = useState<string | null>(null)
  const [copied, setCopied]         = useState(false)

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
          <>
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="w-full overflow-hidden rounded-md"
              style={{ maxHeight: 120 }}
            >
              <img
                src={closure.photo_url}
                alt="Foto der Sperre"
                className="w-full object-cover transition-opacity hover:opacity-90"
                style={{ maxHeight: 120 }}
              />
            </button>
            {lightboxOpen && createPortal(
              <div
                className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/90 p-4"
                onClick={() => setLightboxOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  className="absolute right-4 top-4 rounded-full p-2"
                  style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                >
                  <X className="h-5 w-5" />
                </button>
                <img
                  src={closure.photo_url!}
                  alt="Foto der Sperre"
                  className="max-h-full max-w-full rounded-lg object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>,
              document.body,
            )}
          </>
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

        {/* Share Button (everyone) */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleShare}
            className="flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Share2 className="h-3.5 w-3.5" />
            {copied ? 'Link kopiert!' : 'Sperre teilen'}
          </button>
        </div>

        {/* Comments Section */}
        <ClosureComments closureId={closure.id} />

        {voteError && (
          <p className="text-xs text-danger">{voteError}</p>
        )}

        {/* Owner actions — only visible to the reporter */}
        {isOwner && (
          <div className="border-t pt-2 flex gap-2" style={{ borderColor: '#e5e7eb' }}>
            <button
              type="button"
              disabled={resolving}
              onClick={handleResolve}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors bg-green-500/10 text-green-600 hover:bg-green-500/20 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {resolving ? 'Wird markiert…' : 'Als gelöst markieren'}
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
