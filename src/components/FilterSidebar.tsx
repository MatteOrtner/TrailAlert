'use client'

import { useEffect, useRef } from 'react'
import { X, SlidersHorizontal, Locate, Loader2 } from 'lucide-react'
import { useGeolocation } from '@/hooks/useGeolocation'
import {
  DEFAULT_FILTERS,
  isDefaultFilters,
  type DistanceFilterKm,
  type ClosureFilters,
} from '@/hooks/useClosures'
import type { ClosureType, SeverityLevel } from '@/lib/types'

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------

const TYPE_OPTIONS: { value: ClosureType; label: string }[] = [
  { value: 'forestwork',   label: 'Forstarbeiten' },
  { value: 'construction', label: 'Bauarbeiten' },
  { value: 'damage',       label: 'Wegschaden' },
  { value: 'other',        label: 'Sonstiges' },
]

const SEVERITY_OPTIONS: { value: SeverityLevel; label: string; color: string }[] = [
  { value: 'full_closure', label: 'Voll gesperrt', color: '#ef4444' },
  { value: 'partial',      label: 'Teilweise',     color: '#f59e0b' },
  { value: 'warning',      label: 'Warnung',       color: '#eab308' },
]

const TIME_OPTIONS: { value: ClosureFilters['timeRange']; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: '7d',  label: 'Letzte 7 Tage' },
  { value: '30d', label: 'Letzte 30 Tage' },
]

const DISTANCE_OPTIONS: { value: DistanceFilterKm; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 3,     label: '3 km' },
  { value: 10,    label: '10 km' },
  { value: 25,    label: '25 km' },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  accent?: string
}

function FilterCheckbox({ checked, onChange, label, accent }: CheckboxProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-center gap-2.5 py-1.5 select-none text-left"
    >
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
        style={{
          background:   checked ? (accent ?? 'var(--accent)') : 'transparent',
          borderColor:  checked ? (accent ?? 'var(--accent)') : 'var(--border)',
        }}
      >
        {checked && (
          <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-none stroke-current" strokeWidth={1.8}
               style={{ color: accent ? '#000' : 'var(--bg-dark)' }}>
            <polyline points="1 4 3.5 6.5 9 1" />
          </svg>
        )}
      </span>
      {accent && (
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: accent }} />
      )}
      <span className="text-sm text-text-primary">{label}</span>
    </button>
  )
}

interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
        {title}
      </p>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 select-none">
      <span className="text-sm text-text-primary">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
        style={{ background: checked ? 'var(--accent)' : 'var(--border)' }}
      >
        <span
          className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
        />
      </button>
    </label>
  )
}

// ---------------------------------------------------------------------------
// FilterSidebar
// ---------------------------------------------------------------------------

export interface FilterSidebarProps {
  open:       boolean
  onClose:    () => void
  filters:    ClosureFilters
  setFilters: (f: ClosureFilters) => void
  count:      number
  total:      number
}

export function FilterSidebar({
  open,
  onClose,
  filters,
  setFilters,
  count,
  total,
}: FilterSidebarProps) {
  const touchStartY = useRef(0)
  const geo = useGeolocation()
  const pendingDistanceKmRef = useRef<DistanceFilterKm | null>(null)
  const lastAppliedLocationRef = useRef<string | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (e.changedTouches[0].clientY - touchStartY.current > 80) onClose()
  }

  function toggleType(value: ClosureType) {
    const next = filters.types.includes(value)
      ? filters.types.filter((t) => t !== value)
      : [...filters.types, value]
    setFilters({ ...filters, types: next })
  }

  function toggleSeverity(value: SeverityLevel) {
    const next = filters.severities.includes(value)
      ? filters.severities.filter((s) => s !== value)
      : [...filters.severities, value]
    setFilters({ ...filters, severities: next })
  }

  function requestLocationForDistance(nextDistanceKm: DistanceFilterKm) {
    pendingDistanceKmRef.current = nextDistanceKm
    geo.requestLocation()
  }

  function setDistanceFilter(nextDistanceKm: DistanceFilterKm) {
    if (nextDistanceKm === 'all') {
      pendingDistanceKmRef.current = null
      setFilters({
        ...filters,
        distanceKm: 'all',
        distanceCenter: null,
      })
      return
    }

    if (filters.distanceCenter) {
      setFilters({ ...filters, distanceKm: nextDistanceKm })
      return
    }

    requestLocationForDistance(nextDistanceKm)
  }

  function refreshDistanceLocation() {
    const nextDistanceKm = filters.distanceKm === 'all' ? 10 : filters.distanceKm
    requestLocationForDistance(nextDistanceKm)
  }

  useEffect(() => {
    if (geo.error) pendingDistanceKmRef.current = null
  }, [geo.error])

  useEffect(() => {
    if (!geo.position) return

    const lat = geo.position.latitude
    const lng = geo.position.longitude
    const locationKey = `${lat.toFixed(6)},${lng.toFixed(6)}`
    const pendingDistanceKm = pendingDistanceKmRef.current

    if (pendingDistanceKm === null && lastAppliedLocationRef.current === locationKey) return
    lastAppliedLocationRef.current = locationKey

    setFilters({
      ...filters,
      distanceKm: pendingDistanceKm ?? (filters.distanceKm === 'all' ? 10 : filters.distanceKm),
      distanceCenter: { lat, lng },
    })
    pendingDistanceKmRef.current = null
  }, [geo.position, filters, setFilters])

  const isDirty = !isDefaultFilters(filters)

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[998] bg-black/50 backdrop-blur-sm sm:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel
          Mobile:  fixed bottom sheet, slides up from bottom
          Desktop: static sidebar in flex row, width-animates open/closed  */}
      <aside
        className={[
          'flex flex-col shrink-0 overflow-hidden',
          'transition-all duration-300 ease-in-out',
          // Mobile geometry (bottom sheet)
          'fixed inset-x-0 bottom-0 z-[999] max-h-[85vh] rounded-t-2xl',
          // Mobile animation
          open ? 'translate-y-0' : 'translate-y-full',
          // Desktop overrides
          'sm:static sm:inset-auto sm:z-auto sm:max-h-none sm:rounded-none sm:translate-y-0',
          open ? 'sm:w-80' : 'sm:w-0 sm:opacity-0',
          // Border: top on mobile, right on desktop
          'border-t border-r-0 sm:border-t-0 sm:border-r',
        ].join(' ')}
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        {/* Drag handle — mobile only */}
        <div
          className="flex items-center justify-center py-2.5 sm:hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-hidden
        >
          <div className="h-1 w-10 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3"
             style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-semibold text-text-primary">Filter</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors hover:bg-bg-card-hover"
          >
            <X className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Counter */}
        <div className="flex items-baseline gap-1.5 border-b px-4 py-3"
             style={{ borderColor: 'var(--border)' }}>
          <span className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
            {count}
          </span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {count === 1 ? 'aktive Sperre' : 'aktive Sperren'}
            {isDirty && total !== count && (
              <span className="ml-1 opacity-60">von {total}</span>
            )}
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">

          <Section title="Typ">
            {TYPE_OPTIONS.map((opt) => (
              <FilterCheckbox
                key={opt.value}
                checked={filters.types.includes(opt.value)}
                onChange={() => toggleType(opt.value)}
                label={opt.label}
              />
            ))}
          </Section>

          <div className="h-px" style={{ background: 'var(--border)' }} />

          <Section title="Schweregrad">
            {SEVERITY_OPTIONS.map((opt) => (
              <FilterCheckbox
                key={opt.value}
                checked={filters.severities.includes(opt.value)}
                onChange={() => toggleSeverity(opt.value)}
                label={opt.label}
                accent={opt.color}
              />
            ))}
          </Section>

          <div className="h-px" style={{ background: 'var(--border)' }} />

          <Section title="Zeitraum">
            <div className="flex flex-col gap-1">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilters({ ...filters, timeRange: opt.value })}
                  className="flex w-full cursor-pointer items-center gap-2.5 py-1.5 select-none text-left"
                >
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors"
                    style={{
                      borderColor: filters.timeRange === opt.value ? 'var(--accent)' : 'var(--border)',
                    }}
                  >
                    {filters.timeRange === opt.value && (
                      <span className="h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />
                    )}
                  </span>
                  <span className="text-sm text-text-primary">{opt.label}</span>
                </button>
              ))}
            </div>
          </Section>

          <div className="h-px" style={{ background: 'var(--border)' }} />

          <Section title="In meiner Nähe (GPS)">
            <button
              type="button"
              onClick={refreshDistanceLocation}
              disabled={geo.loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors"
              style={{
                background: 'var(--bg-dark)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                opacity: geo.loading ? 0.7 : 1,
              }}
            >
              {geo.loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Locate className="h-4 w-4" />
              )}
              {filters.distanceCenter ? 'Standort aktualisieren' : 'Standort verwenden'}
            </button>

            {filters.distanceCenter && (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Aktiv: {filters.distanceCenter.lat.toFixed(4)}, {filters.distanceCenter.lng.toFixed(4)}
              </p>
            )}

            {geo.error && (
              <p className="text-xs" style={{ color: 'var(--danger)' }}>
                {geo.error}
              </p>
            )}

            <div className="mt-1 flex flex-col gap-1">
              {DISTANCE_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setDistanceFilter(opt.value)}
                  className="flex w-full cursor-pointer items-center gap-2.5 py-1.5 select-none text-left"
                >
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors"
                    style={{
                      borderColor: filters.distanceKm === opt.value ? 'var(--accent)' : 'var(--border)',
                    }}
                  >
                    {filters.distanceKm === opt.value && (
                      <span className="h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />
                    )}
                  </span>
                  <span className="text-sm text-text-primary">{opt.label}</span>
                </button>
              ))}
            </div>
          </Section>

          <div className="h-px" style={{ background: 'var(--border)' }} />

          <Section title="Weitere Filter">
            <Toggle
              checked={filters.confirmedOnly}
              onChange={(v) => setFilters({ ...filters, confirmedOnly: v })}
              label="Nur bestätigte Sperren"
            />
          </Section>
        </div>

        {/* Footer */}
        {isDirty && (
          <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="w-full rounded-lg py-2.5 text-sm font-medium transition-colors hover:bg-bg-card-hover"
              style={{ color: 'var(--accent)' }}
            >
              Filter zurücksetzen
            </button>
          </div>
        )}

        {/* Safe-area spacer for notched phones (mobile only) */}
        <div className="sm:hidden" style={{ height: 'env(safe-area-inset-bottom)' }} />
      </aside>
    </>
  )
}

// ---------------------------------------------------------------------------
// Toggle button (rendered on the map)
// ---------------------------------------------------------------------------

export interface FilterToggleButtonProps {
  open:    boolean
  onClick: () => void
  isDirty: boolean
  count:   number
}

export function FilterToggleButton({ open, onClick, isDirty, count }: FilterToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Filter öffnen"
      className="relative flex h-11 items-center justify-center gap-2 rounded-lg px-3 shadow-lg transition-colors"
      style={{
        background:  open ? 'var(--accent)' : 'var(--bg-card)',
        border:      `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
        color:       open ? 'var(--bg-dark)' : 'var(--text-secondary)',
      }}
    >
      <SlidersHorizontal className="h-5 w-5 shrink-0" />
      <span
        className="text-xs font-semibold tabular-nums"
        style={{ color: open ? 'var(--bg-dark)' : isDirty ? 'var(--accent)' : 'var(--text-secondary)' }}
      >
        {count}
      </span>
      {isDirty && !open && (
        <span
          className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2"
          style={{ background: 'var(--accent)', borderColor: 'var(--bg-dark)' }}
        />
      )}
    </button>
  )
}
