'use client'

import dynamic from 'next/dynamic'
import { useRef, useState } from 'react'
import {
  X, Bell, BellOff, Trash2, Plus, MapPin, Loader2, Eye,
} from 'lucide-react'
import { useWatchAreaPanel } from '@/contexts/WatchAreaContext'
import { useWatchAreas } from '@/hooks/useWatchAreas'
import { useAuth } from '@/contexts/AuthContext'
import type { WatchArea } from '@/lib/types'

// PositionPicker is Leaflet — must be ssr:false
const PositionPicker = dynamic(() => import('./PositionPicker'), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-lg"
      style={{ height: 200, background: 'var(--bg-dark)', border: '1px solid var(--border)' }}
    >
      <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  ),
})

// ---------------------------------------------------------------------------
// Watch Area Card
// ---------------------------------------------------------------------------

interface CardProps {
  area:           WatchArea
  onDelete:       (id: string) => void
  onToggleNotify: (id: string, v: boolean) => void
}

function WatchAreaCard({ area, onDelete, onToggleNotify }: CardProps) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await onDelete(area.id)
  }

  const displayName = area.name || `${area.center_lat.toFixed(3)}, ${area.center_lng.toFixed(3)}`

  return (
    <div
      className="flex flex-col gap-2 rounded-xl p-3"
      style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
            <span className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {displayName}
            </span>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Radius: {area.radius_km} km
          </span>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-danger/10"
          style={{ color: 'var(--danger)', opacity: deleting ? 0.5 : 1 }}
          title="Löschen"
        >
          {deleting
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Trash2 className="h-4 w-4" />
          }
        </button>
      </div>

      {/* Email notification toggle */}
      <label className="flex cursor-pointer items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-1.5">
          {area.notify_email
            ? <Bell className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
            : <BellOff className="h-3.5 w-3.5" style={{ color: 'var(--text-secondary)' }} />
          }
          <span className="text-xs" style={{ color: area.notify_email ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            E-Mail-Benachrichtigungen
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={area.notify_email}
          onClick={() => onToggleNotify(area.id, !area.notify_email)}
          className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
          style={{ background: area.notify_email ? 'var(--accent)' : 'var(--border)' }}
        >
          <span
            className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
            style={{ transform: area.notify_email ? 'translateX(16px)' : 'translateX(0)' }}
          />
        </button>
      </label>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add form
// ---------------------------------------------------------------------------

const DEFAULT_RADIUS = 10

interface AddFormProps {
  onSave:   () => void
  onCancel: () => void
  addArea:  ReturnType<typeof useWatchAreas>['addArea']
}

function AddAreaForm({ onSave, onCancel, addArea }: AddFormProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [radius, setRadius]     = useState(DEFAULT_RADIUS)
  const [name, setName]         = useState('')
  const [notify, setNotify]     = useState(true)
  const [saving, setSaving]     = useState(false)
  const [posError, setPosError] = useState(false)

  async function handleSave() {
    if (!position) { setPosError(true); return }
    setSaving(true)
    await addArea({
      center_lat:   position.lat,
      center_lng:   position.lng,
      radius_km:    radius,
      name:         name.trim(),
      notify_email: notify,
    })
    setSaving(false)
    onSave()
  }

  const inputStyle: React.CSSProperties = {
    width:        '100%',
    background:   'var(--bg-dark)',
    border:       '1px solid var(--border)',
    borderRadius: 8,
    color:        'var(--text-primary)',
    padding:      '8px 12px',
    fontSize:     14,
    outline:      'none',
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Mittelpunkt <span style={{ color: 'var(--accent)' }}>*</span>
        </label>
        <PositionPicker
          value={position}
          onChange={(pos) => { setPosition(pos); setPosError(false) }}
        />
        {posError && (
          <p className="text-xs" style={{ color: 'var(--danger)' }}>
            Bitte Position auf der Karte setzen.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Radius
          </label>
          <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            {radius} km
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={50}
          step={1}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: 'var(--accent)' }}
        />
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span>1 km</span>
          <span>50 km</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Name <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Rund um Lienz"
          maxLength={80}
          style={inputStyle}
        />
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 select-none"
             style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
            E-Mail-Benachrichtigungen
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={notify}
          onClick={() => setNotify((v) => !v)}
          className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
          style={{ background: notify ? 'var(--accent)' : 'var(--border)' }}
        >
          <span
            className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
            style={{ transform: notify ? 'translateX(16px)' : 'translateX(0)' }}
          />
        </button>
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors"
          style={{
            background: 'var(--accent)',
            color:      'var(--bg-dark)',
            opacity:    saving ? 0.7 : 1,
            cursor:     saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Speichern
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// WatchAreaManager panel
// ---------------------------------------------------------------------------

export function WatchAreaManager() {
  const { isOpen, close } = useWatchAreaPanel()
  const { user }          = useAuth()
  const { areas, loading, addArea, removeArea, toggleNotify } = useWatchAreas()
  const [adding, setAdding] = useState(false)
  const touchStartY = useRef(0)

  function handleClose() {
    close()
    setAdding(false)
  }

  function onHeaderTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
  }
  function onHeaderTouchEnd(e: React.TouchEvent) {
    if (e.changedTouches[0].clientY - touchStartY.current > 80) handleClose()
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[1001] bg-black/50 backdrop-blur-sm sm:bg-black/30"
          onClick={handleClose}
        />
      )}

      <aside
        className="fixed inset-y-0 right-0 z-[1002] flex w-full flex-col sm:w-[420px]"
        style={{
          background:  'var(--bg-card)',
          borderLeft:  '1px solid var(--border)',
          boxShadow:   '-8px 0 32px rgba(0,0,0,0.5)',
          transform:     isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition:    'transform 300ms ease-in-out',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        {/* Header — swipe down to close on mobile */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
          onTouchStart={onHeaderTouchStart}
          onTouchEnd={onHeaderTouchEnd}
        >
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Watch Areas
            </span>
            {areas.length > 0 && (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ background: 'var(--accent)/15', color: 'var(--accent)' }}
              >
                {areas.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">

          {/* Not logged in */}
          {!user && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <MapPin className="h-10 w-10" style={{ color: 'var(--border)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Anmeldung erforderlich
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Watch Areas sind nur für eingeloggte Benutzer verfügbar.
              </p>
            </div>
          )}

          {/* Add form */}
          {user && adding && (
            <AddAreaForm
              addArea={addArea}
              onSave={() => setAdding(false)}
              onCancel={() => setAdding(false)}
            />
          )}

          {/* List */}
          {user && !adding && (
            <>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--text-secondary)' }} />
                </div>
              ) : areas.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full"
                       style={{ background: 'var(--bg-dark)' }}>
                    <Bell className="h-7 w-7" style={{ color: 'var(--border)' }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Noch keine Watch Areas
                  </p>
                  <p className="max-w-xs text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Definiere Gebiete auf der Karte, über die du bei neuen Sperren per E-Mail benachrichtigt wirst.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {areas.map((area) => (
                    <WatchAreaCard
                      key={area.id}
                      area={area}
                      onDelete={removeArea}
                      onToggleNotify={toggleNotify}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — add button */}
        {user && !adding && (
          <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors"
              style={{ background: 'var(--accent)', color: 'var(--bg-dark)' }}
            >
              <Plus className="h-4 w-4" />
              Neues Gebiet beobachten
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
