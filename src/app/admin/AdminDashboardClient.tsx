'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Closure, ClosureStatus } from '@/lib/types'
import { Trash2, CheckCircle2, MapPin, AlertTriangle, ShieldAlert, Image as ImageIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

export function AdminDashboardClient({ initialClosures }: { initialClosures: Closure[] }) {
  const [closures, setClosures] = useState<Closure[]>(initialClosures)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const supabase = createClient()

  const activeCount = closures.filter(c => c.status === 'active').length
  const resolvedCount = closures.filter(c => c.status === 'resolved').length
  const pendingReviewCount = closures.filter(c => c.status === 'pending_review').length

  async function handleDelete(id: string) {
    if (!window.confirm('Sicher, dass du diese Sperre (Meldung) endgültig löschen willst?')) return
    setLoadingId(id)

    const { error } = await supabase
      .from('closures')
      .delete()
      .eq('id', id)

    if (!error) {
      setClosures(prev => prev.filter(c => c.id !== id))
    } else {
      alert(`Fehler beim Löschen: ${error.message}`)
    }
    setLoadingId(null)
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'resolved' : 'active'
    setLoadingId(id)

    const { error } = await supabase
      .from('closures')
      .update({ status: newStatus })
      .eq('id', id)

    if (!error) {
      setClosures(prev => prev.map(c => c.id === id ? { ...c, status: newStatus as ClosureStatus } : c))
    } else {
      alert(`Fehler beim Status-Update: ${error.message}`)
    }
    setLoadingId(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex flex-col rounded-2xl border border-border bg-bg-card p-5">
          <span className="text-2xl font-black text-text-primary">{closures.length}</span>
          <span className="text-sm font-medium text-text-secondary">Sperren Gesamt</span>
        </div>
        <div className="flex flex-col rounded-2xl border border-border bg-bg-card p-5">
          <span className="text-2xl font-black text-[var(--accent)]">{activeCount}</span>
          <span className="text-sm font-medium text-text-secondary">Aktive Sperren</span>
        </div>
        <div className="flex flex-col rounded-2xl border border-border bg-bg-card p-5">
          <span className="text-2xl font-black text-[var(--success)]">{resolvedCount}</span>
          <span className="text-sm font-medium text-text-secondary">Behoben</span>
        </div>
        <div className="flex flex-col rounded-2xl border border-border bg-bg-card p-5">
          <span className="text-2xl font-black" style={{ color: 'var(--warning)' }}>{pendingReviewCount}</span>
          <span className="text-sm font-medium text-text-secondary">Zu prüfen</span>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all',            label: 'Alle' },
          { key: 'active',         label: 'Aktiv' },
          { key: 'pending_review', label: 'Zu prüfen' },
          { key: 'unconfirmed',    label: 'Unbestätigt' },
          { key: 'resolved',       label: 'Behoben' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterStatus(tab.key)}
            className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: filterStatus === tab.key ? 'var(--accent)' : 'var(--bg-card)',
              color:      filterStatus === tab.key ? 'var(--bg-dark)' : 'var(--text-secondary)',
              border:     '1px solid var(--border)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {closures
          .filter(c => filterStatus === 'all' || c.status === filterStatus)
          .map(closure => (
          <div
            key={closure.id}
            className="flex flex-col gap-4 rounded-xl border border-border bg-bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-4">
              <div 
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold uppercase text-[var(--bg-dark)]"
                style={{
                  background: closure.severity === 'full_closure' ? 'var(--danger)' :
                              closure.severity === 'partial' ? 'var(--warning)' : 'var(--accent)'
                }}
              >
                {closure.title.slice(0,2)}
              </div>
              
              <div className="flex flex-col">
                <span className="text-base font-bold text-text-primary flex items-center gap-2">
                  {closure.title}
                  {closure.status === 'resolved' && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--success)]/20 text-[var(--success)]">
                      Gelöst
                    </span>
                  )}
                  {closure.status === 'pending_review' && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                      Zu prüfen
                    </span>
                  )}
                </span>
                
                <span className="mt-1 flex items-center gap-1 text-sm text-text-secondary">
                  <span className="capitalize">{closure.closure_type}</span>
                  <span>•</span>
                  {formatDistanceToNow(new Date(closure.created_at), { locale: de, addSuffix: true })}
                </span>
                
                <span className="mt-2 flex items-center gap-3 text-xs text-text-secondary font-medium">
                  <span title="GPS"><MapPin className="inline w-3 h-3 -mt-0.5 mr-1" />{closure.latitude.toFixed(4)}, {closure.longitude.toFixed(4)}</span>
                  {closure.photo_url && <span className="flex items-center gap-1 text-[var(--accent)]"><ImageIcon className="w-3 h-3" /> Foto inkl.</span>}
                </span>

                {closure.description && (
                  <p className="mt-3 text-sm italic text-text-secondary line-clamp-2">"{closure.description}"</p>
                )}
              </div>
            </div>

            <div className="flex w-full min-w-40 flex-row gap-2 sm:w-auto sm:flex-col">
              {closure.status === 'pending_review' ? (
                <>
                  <button
                    onClick={() => handleToggleStatus(closure.id, 'resolved')}
                    disabled={loadingId === closure.id}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--bg-dark)] px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-white/5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[var(--success)]" /> Auflösen
                  </button>
                  <button
                    onClick={() => handleToggleStatus(closure.id, 'unconfirmed')}
                    disabled={loadingId === closure.id}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--bg-dark)] px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-white/5 disabled:opacity-50"
                  >
                    <AlertTriangle className="h-4 w-4 text-[var(--warning)]" /> Reaktivieren
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleToggleStatus(closure.id, closure.status)}
                  disabled={loadingId === closure.id}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--bg-dark)] px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-white/5 disabled:opacity-50"
                >
                  {closure.status === 'active' ? (
                    <><CheckCircle2 className="h-4 w-4 text-[var(--success)]" /> Als gelöst markieren</>
                  ) : (
                    <><AlertTriangle className="h-4 w-4 text-[var(--warning)]" /> Als aktiv markieren</>
                  )}
                </button>
              )}

              <button
                onClick={() => handleDelete(closure.id)}
                disabled={loadingId === closure.id}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--danger)]/50 bg-[var(--danger)]/10 px-4 py-2 text-sm font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)]/20 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Löschen
              </button>
            </div>
          </div>
        ))}

        {closures.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-text-secondary">
            <ShieldAlert className="h-10 w-10 opacity-20" />
            <p>Keine Meldungen in der Datenbank.</p>
          </div>
        )}
      </div>
    </div>
  )
}
