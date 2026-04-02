'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  X, Locate, ChevronRight, ChevronLeft,
  Upload, Loader2, ImageIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useReportForm } from '@/contexts/ReportFormContext'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useAuth } from '@/contexts/AuthContext'
import type { Closure, ClosureType, SeverityLevel } from '@/lib/types'
import { haversineMeters } from '@/lib/geo'
import { buildStraightLinePath, fetchRoadRoutePath } from '@/lib/routing'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_OPTIONS: { value: ClosureType; label: string }[] = [
  { value: 'forestwork',   label: 'Forstarbeiten' },
  { value: 'construction', label: 'Bauarbeiten' },
  { value: 'damage',       label: 'Wegschaden' },
  { value: 'other',        label: 'Sonstiges' },
]

const SEVERITY_OPTIONS: { value: SeverityLevel; label: string; color: string; desc: string }[] = [
  { value: 'full_closure', label: 'Voll gesperrt',       color: '#ef4444', desc: 'Weg komplett unbefahrbar' },
  { value: 'partial',      label: 'Teilweise befahrbar', color: '#f59e0b', desc: 'Eingeschränkt passierbar' },
  { value: 'warning',      label: 'Warnung',             color: '#eab308', desc: 'Vorsicht empfohlen' },
]

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp']

// ---------------------------------------------------------------------------
// Reusable field wrapper
// ---------------------------------------------------------------------------

function Field({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {label}
        {required && <span style={{ color: 'var(--accent)' }}> *</span>}
      </label>
      {children}
      {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS = ['Ort', 'Details', 'Foto']

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <div className="flex items-center gap-1.5">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold"
              style={{
                background: i < current ? 'var(--success)' : i === current ? 'var(--accent)' : 'var(--border)',
                color:      i <= current ? 'var(--bg-dark)' : 'var(--text-secondary)',
              }}
            >
              {i < current ? '✓' : i + 1}
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: i === current ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="h-px w-4" style={{ background: 'var(--border)' }} />
          )}
        </div>
      ))}
    </div>
  )
}


// ---------------------------------------------------------------------------
// ReportForm
// ---------------------------------------------------------------------------

type Step = 0 | 1 | 2 | 'success'

interface FormState {
  position:    { lat: number; lng: number } | null
  title:       string
  type:        ClosureType
  severity:    SeverityLevel
  description: string
  expectedEnd: string
  routeEnabled: boolean
  routeStart: { lat: number; lng: number } | null
  routeEnd: { lat: number; lng: number } | null
}

type PickingTarget = 'main' | 'route_start' | 'route_end'

const INITIAL_FORM: FormState = {
  position:    null,
  title:       '',
  type:        'forestwork',
  severity:    'full_closure',
  description: '',
  expectedEnd: '',
  routeEnabled: false,
  routeStart: null,
  routeEnd: null,
}

export function ReportForm() {
  const {
    isOpen, close,
    isPickingLocation, setIsPickingLocation,
    onPositionPickedRef,
    allClosures,
  } = useReportForm()
  const { user } = useAuth()
  const geo = useGeolocation()

  const [step, setStep]           = useState<Step>(0)
  const [form, setForm]           = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors]       = useState<Partial<Record<keyof FormState, string>>>({})
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError]     = useState<string | null>(null)
  const [submitting,    setSubmitting]    = useState(false)
  const [submitError,   setSubmitError]   = useState<string | null>(null)
  const [dragOver, setDragOver]         = useState(false)
  const [nearbyClosures, setNearbyClosures] = useState<{ closure: Closure; distanceM: number }[]>([])
  const [routeError, setRouteError]     = useState<string | null>(null)
  const [pickingTarget, setPickingTarget] = useState<PickingTarget | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const touchStartY  = useRef(0)
  const router       = useRouter()

  // Register position-picked callback so Map.tsx can deliver tapped lat/lng.
  // We reuse the same map interaction for main position, route start and route end.
  onPositionPickedRef.current = (lat, lng) => {
    if (pickingTarget === 'route_start') {
      setForm((f) => ({ ...f, routeEnabled: true, routeStart: { lat, lng } }))
      setRouteError(null)
    } else if (pickingTarget === 'route_end') {
      setForm((f) => ({ ...f, routeEnabled: true, routeEnd: { lat, lng } }))
      setRouteError(null)
    } else {
      setForm((f) => ({ ...f, position: { lat, lng } }))
      setErrors((e) => ({ ...e, position: undefined }))
      setStep(1)
    }

    setIsPickingLocation(false)
    setPickingTarget(null)
  }

  // Start with main position picking on open.
  useEffect(() => {
    if (isOpen && step === 0 && pickingTarget === null) {
      setPickingTarget('main')
    }
  }, [isOpen, step, pickingTarget])

  useEffect(() => {
    setIsPickingLocation(isOpen && pickingTarget !== null)
  }, [isOpen, pickingTarget, setIsPickingLocation])

  function handleClose() {
    close()
    setIsPickingLocation(false)
    // Reset after transition
    setTimeout(() => {
      setStep(0)
      setForm(INITIAL_FORM)
      setErrors({})
      setPhotoFile(null)
      setPhotoPreview(null)
      setPhotoError(null)
      setRouteError(null)
      setPickingTarget(null)
    }, 300)
  }

  function onHeaderTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
  }
  function onHeaderTouchEnd(e: React.TouchEvent) {
    if (e.changedTouches[0].clientY - touchStartY.current > 80) handleClose()
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function openRoutePointPicker(target: 'route_start' | 'route_end') {
    setForm((f) => ({ ...f, routeEnabled: true }))
    setRouteError(null)
    setPickingTarget(target)
  }

  function cancelPickingMode() {
    if (pickingTarget && pickingTarget !== 'main') {
      setPickingTarget(null)
      setIsPickingLocation(false)
      return
    }
    handleClose()
  }

  function formatCoord(value: number) {
    return value.toFixed(5)
  }

  const routeStraightDistanceM = form.routeStart && form.routeEnd
    ? Math.round(
      haversineMeters(
        form.routeStart.lat,
        form.routeStart.lng,
        form.routeEnd.lat,
        form.routeEnd.lng,
      ),
    )
    : null

  // --- GPS: apply to whichever point the user is currently picking ---
  useEffect(() => {
    if (!geo.position || !isOpen || !pickingTarget) return

    const picked = { lat: geo.position.latitude, lng: geo.position.longitude }

    if (pickingTarget === 'route_start') {
      setForm((f) => ({ ...f, routeEnabled: true, routeStart: picked }))
      setRouteError(null)
    } else if (pickingTarget === 'route_end') {
      setForm((f) => ({ ...f, routeEnabled: true, routeEnd: picked }))
      setRouteError(null)
    } else {
      setForm((f) => ({ ...f, position: picked }))
      setErrors((e) => ({ ...e, position: undefined }))
      setStep(1)
    }

    setIsPickingLocation(false)
    setPickingTarget(null)
  }, [geo.position, isOpen, pickingTarget, setIsPickingLocation])

  // Compute nearby open closures when the user picks a location
  useEffect(() => {
    if (!form.position || step !== 1) {
      setNearbyClosures([])
      return
    }
    const RADIUS_M = 100
    const nearby = allClosures
      .filter(c => c.status === 'active' || c.status === 'unconfirmed')
      .map(c => ({
        closure:   c,
        distanceM: haversineMeters(form.position!.lat, form.position!.lng, c.latitude, c.longitude),
      }))
      .filter(({ distanceM }) => distanceM <= RADIUS_M)
      .sort((a, b) => a.distanceM - b.distanceM)
    setNearbyClosures(nearby)
  }, [form.position, step, allClosures])

  // --- Photo file validation ---
  function applyPhoto(file: File) {
    setPhotoError(null)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setPhotoError('Nur JPG, PNG oder WebP erlaubt.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setPhotoError('Maximale Dateigröße: 5 MB.')
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) applyPhoto(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) applyPhoto(file)
  }

  // --- Step validation ---
  function validateStep1(): boolean {
    const errs: typeof errors = {}
    if (!form.title.trim()) {
      errs.title = 'Titel ist erforderlich.'
    } else if (form.title.trim().length < 5) {
      errs.title = 'Titel muss mindestens 5 Zeichen haben.'
    }

    if (form.routeEnabled && (!form.routeStart || !form.routeEnd)) {
      setRouteError('Bitte Start und Ende für den Sperr-Verlauf setzen.')
    } else {
      setRouteError(null)
    }

    setErrors(errs)
    return Object.keys(errs).length === 0 && (!form.routeEnabled || !!(form.routeStart && form.routeEnd))
  }

  // --- Submit ---
  async function handleSubmit() {
    if (submitting || !form.position) return
    if (form.routeEnabled && (!form.routeStart || !form.routeEnd)) {
      setRouteError('Bitte Start und Ende für den Sperr-Verlauf setzen.')
      setStep(1)
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    const routeStart = form.routeEnabled ? form.routeStart : null
    const routeEnd = form.routeEnabled ? form.routeEnd : null

    let routePath: Closure['route_path'] = null
    let routeDistanceM: number | null = null

    if (routeStart && routeEnd) {
      if (navigator.onLine) {
        const routeResult = await fetchRoadRoutePath(routeStart, routeEnd)
        if (routeResult) {
          routePath = routeResult.path
          routeDistanceM = routeResult.distanceM
        }
      }

      if (!routePath) {
        routePath = buildStraightLinePath(routeStart, routeEnd)
        routeDistanceM = Math.round(
          haversineMeters(routeStart.lat, routeStart.lng, routeEnd.lat, routeEnd.lng),
        )
      }
    }

    // CHECK FOR OFFLINE
    if (!navigator.onLine) {
      try {
        const { fileToBase64, saveToOfflineQueue } = await import('@/lib/offlineQueue')
        let photoDataUrl: string | null = null
        if (photoFile) {
          photoDataUrl = await fileToBase64(photoFile)
        }

        saveToOfflineQueue({
          id:           crypto.randomUUID(),
          latitude:     form.position.lat,
          longitude:    form.position.lng,
          title:        form.title.trim(),
          description:  form.description.trim() || null,
          closure_type: form.type,
          severity:     form.severity,
          expected_end: form.expectedEnd || null,
          reported_by:  user?.id ?? null,
          route_start_lat: routeStart?.lat ?? null,
          route_start_lng: routeStart?.lng ?? null,
          route_end_lat: routeEnd?.lat ?? null,
          route_end_lng: routeEnd?.lng ?? null,
          route_path: routePath,
          route_distance_m: routeDistanceM,
          photoDataUrl,
          photoType:    photoFile?.type ?? null,
          createdAt:    Date.now()
        })

        close()
        alert('Du bist offline! Deine Meldung wurde gespeichert und wird automatisch gepostet, sobald du wieder Internet-Empfang hast.')
      } catch {
        setSubmitError('Fehler beim Offline-Speichern.')
      } finally {
        setSubmitting(false)
      }
      return
    }

    const supabase = createClient()
    let photoUrl: string | null = null

    // Upload photo (optional — silently skip if fails for anonymous users)
    if (photoFile) {
      const ext  = photoFile.name.split('.').pop() ?? 'jpg'
      const path = `${Date.now()}_${crypto.randomUUID()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('closure-photos')
        .upload(path, photoFile, { contentType: photoFile.type, upsert: false })

      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('closure-photos')
          .getPublicUrl(uploadData.path)
        photoUrl = publicUrl
      } else if (uploadError) {
        setPhotoError('Foto konnte nicht hochgeladen werden (Login erforderlich).')
        // Continue without photo
      }
    }

    const insertPayload: Record<string, unknown> = {
      latitude: form.position.lat,
      longitude: form.position.lng,
      title: form.title.trim(),
      description: form.description.trim() || null,
      closure_type: form.type,
      severity: form.severity,
      expected_end: form.expectedEnd || null,
      photo_url: photoUrl,
      reported_by: user?.id ?? null,
      status: 'active',
    }

    if (routeStart && routeEnd && routePath) {
      insertPayload.route_start_lat = routeStart.lat
      insertPayload.route_start_lng = routeStart.lng
      insertPayload.route_end_lat = routeEnd.lat
      insertPayload.route_end_lng = routeEnd.lng
      insertPayload.route_path = routePath
      insertPayload.route_distance_m = routeDistanceM
    }

    const { data: closure, error: insertError } = await supabase
      .from('closures')
      .insert(insertPayload)
      .select()
      .single()

    setSubmitting(false)

    if (insertError || !closure) {
      if (
        form.routeEnabled &&
        insertError?.message?.includes("Could not find the 'route_")
      ) {
        setSubmitError(
          'Sperr-Verlauf konnte nicht gespeichert werden, weil die neue Datenbank-Migration noch nicht aktiv ist. Bitte Migration 013 ausführen.'
        )
        return
      }
      // Surface the error clearly at the top-level
      setSubmitError(
        insertError?.message
          ? `Speichern fehlgeschlagen: ${insertError.message}`
          : 'Speichern fehlgeschlagen. Bitte versuche es erneut.'
      )
      return
    }

    // Client-side navigation: the map component (and its Leaflet instance)
    // stay fully mounted. The server component re-renders with the new
    // ?closure= param, which passes targetClosureId down to Map, which
    // opens the marker popup — zero map re-initialization.
    close()
    router.push(`/?closure=${closure.id}`)
  }

  // Shared input/textarea style
  const inputStyle: React.CSSProperties = {
    width:        '100%',
    maxWidth:     '100%',
    boxSizing:    'border-box',
    background:   'var(--bg-dark)',
    border:       '1px solid var(--border)',
    borderRadius: 8,
    color:        'var(--text-primary)',
    padding:      '8px 12px',
    fontSize:     16,
    outline:      'none',
  }

  const pickingTitle =
    pickingTarget === 'route_start'
      ? 'Sperr-Verlauf — Startpunkt'
      : pickingTarget === 'route_end'
        ? 'Sperr-Verlauf — Endpunkt'
        : 'Sperre melden — Schritt 1/3'

  const pickingHint =
    pickingTarget === 'route_start'
      ? 'Tippe auf die Karte oder nutze GPS für den Startpunkt'
      : pickingTarget === 'route_end'
        ? 'Tippe auf die Karte oder nutze GPS für den Endpunkt'
        : 'Tippe auf die Karte oder nutze GPS'

  const pickingGpsLabel =
    pickingTarget === 'route_start'
      ? 'GPS als Startpunkt verwenden'
      : pickingTarget === 'route_end'
        ? 'GPS als Endpunkt verwenden'
        : 'Meinen Standort verwenden'

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* ---- PICKING MODE (step 0): map is visible, bottom bar shown ---- */}
      {isOpen && isPickingLocation && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[1002] flex flex-col gap-2 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)]"
          style={{
            background: 'var(--bg-card)',
            borderTop:  '1px solid var(--border)',
            boxShadow:  '0 -8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {pickingTitle}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {pickingHint}
              </p>
            </div>
            <button
              type="button"
              onClick={cancelPickingMode}
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => geo.requestLocation()}
            disabled={geo.loading}
            className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold"
            style={{
              background: 'var(--accent)',
              color:      'var(--bg-dark)',
              opacity:    geo.loading ? 0.7 : 1,
            }}
          >
            {geo.loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Locate className="h-4 w-4" />
            }
            {pickingGpsLabel}
          </button>
          {geo.error && (
            <p className="text-xs" style={{ color: 'var(--danger)' }}>{geo.error}</p>
          )}
        </div>
      )}

      {/* Backdrop (only when panel is visible) */}
      {isOpen && !isPickingLocation && (
        <div
          className="fixed inset-0 z-[1001] bg-black/50 backdrop-blur-sm sm:bg-black/30"
          onClick={handleClose}
        />
      )}

      {/* Panel — hidden during location picking, visible for steps 1+ */}
      <aside
        className="fixed inset-y-0 right-0 z-[1002] flex w-full flex-col sm:w-[480px]"
        style={{
          background:    'var(--bg-card)',
          borderLeft:    '1px solid var(--border)',
          boxShadow:     '-8px 0 32px rgba(0,0,0,0.5)',
          transform:     isOpen && !isPickingLocation ? 'translateX(0)' : 'translateX(100%)',
          transition:    'transform 300ms ease-in-out',
          pointerEvents: isOpen && !isPickingLocation ? 'auto' : 'none',
        }}
      >
        {/* Header — swipe down to close on mobile */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
          onTouchStart={onHeaderTouchStart}
          onTouchEnd={onHeaderTouchEnd}
        >
          <div className="flex flex-col gap-1">
            <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Sperre melden
            </span>
            {step !== 'success' && <StepBar current={step as number} />}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto px-5 py-5">

          {/* ---- STEP 1: Details ---- */}
          {step === 1 && (
            <>
              {nearbyClosures.length > 0 && (
                <div
                  className="rounded-lg p-3"
                  style={{ border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.08)' }}
                >
                  <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
                    Mögliche Duplikate in der Nähe
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    {nearbyClosures.map(({ closure, distanceM }) => (
                      <button
                        key={closure.id}
                        type="button"
                        onClick={() => {
                          close()
                          router.push(`/?closure=${closure.id}`)
                        }}
                        className="flex items-center justify-between gap-2 text-left text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <span className="truncate">{closure.title}</span>
                        <span className="shrink-0 text-xs font-medium" style={{ color: '#f59e0b' }}>
                          {Math.round(distanceM)} m
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Du kannst trotzdem eine neue Meldung erstellen.
                  </p>
                </div>
              )}

              <Field label="Titel" required error={errors.title}>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="z.B. Forststraße Richtung Hochstein"
                  minLength={5}
                  maxLength={100}
                  style={inputStyle}
                />
              </Field>

              <Field label="Typ">
                <select
                  value={form.type}
                  onChange={(e) => set('type', e.target.value as ClosureType)}
                  style={inputStyle}
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Schweregrad" required>
                <div className="flex flex-col gap-2">
                  {SEVERITY_OPTIONS.map((o) => (
                    <label
                      key={o.value}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                      style={{
                        border:     `1px solid ${form.severity === o.value ? o.color : 'var(--border)'}`,
                        background: form.severity === o.value ? `${o.color}18` : 'transparent',
                      }}
                    >
                      <input
                        type="radio"
                        name="severity"
                        value={o.value}
                        checked={form.severity === o.value}
                        onChange={() => set('severity', o.value)}
                        className="sr-only"
                      />
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ background: o.color }} />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {o.label}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {o.desc}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="Beschreibung">
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Was genau ist los? (optional)"
                  rows={3}
                  maxLength={500}
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
                />
              </Field>

              <Field label="Voraussichtliches Ende">
                <div style={{ width: '100%', overflow: 'hidden' }}>
                  <input
                    type="date"
                    value={form.expectedEnd}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => set('expectedEnd', e.target.value)}
                    style={{
                      ...inputStyle,
                      colorScheme: 'dark',
                      minWidth:    0,
                    }}
                  />
                </div>
              </Field>

              <div
                className="rounded-lg p-3"
                style={{
                  border: '1px solid var(--border)',
                  background: 'rgba(245,158,11,0.06)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Sperr-Verlauf (optional)
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Setze Start und Ende. Wir zeichnen dann den Straßenverlauf der Sperre.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (form.routeEnabled) {
                        setForm((f) => ({
                          ...f,
                          routeEnabled: false,
                          routeStart: null,
                          routeEnd: null,
                        }))
                        setRouteError(null)
                        return
                      }
                      setForm((f) => ({ ...f, routeEnabled: true }))
                    }}
                    className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={{
                      background: form.routeEnabled ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                      color: form.routeEnabled ? '#ef4444' : '#10b981',
                      border: `1px solid ${form.routeEnabled ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)'}`,
                    }}
                  >
                    {form.routeEnabled ? 'Verlauf entfernen' : 'Verlauf hinzufügen'}
                  </button>
                </div>

                {form.routeEnabled && (
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => openRoutePointPicker('route_start')}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-left transition-colors"
                      style={{
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        background: 'var(--bg-card)',
                      }}
                    >
                      <span>
                        Startpunkt setzen
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {form.routeStart
                          ? `${formatCoord(form.routeStart.lat)}, ${formatCoord(form.routeStart.lng)}`
                          : 'auf Karte wählen'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openRoutePointPicker('route_end')}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-left transition-colors"
                      style={{
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        background: 'var(--bg-card)',
                      }}
                    >
                      <span>
                        Endpunkt setzen
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {form.routeEnd
                          ? `${formatCoord(form.routeEnd.lat)}, ${formatCoord(form.routeEnd.lng)}`
                          : 'auf Karte wählen'}
                      </span>
                    </button>

                    {routeStraightDistanceM !== null && (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Luftlinie zwischen Start und Ende: {routeStraightDistanceM} m.
                      </p>
                    )}

                    {routeError && (
                      <p className="text-xs" style={{ color: 'var(--danger)' }}>
                        {routeError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ---- STEP 2: Foto ---- */}
          {step === 2 && (
            <>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Füge ein Foto hinzu um die Meldung zu verdeutlichen (optional, max. 5 MB).
              </p>

              {photoPreview ? (
                <div className="relative">
                  <Image
                    src={photoPreview}
                    alt="Vorschau"
                    width={1200}
                    height={800}
                    unoptimized
                    className="w-full rounded-lg object-cover"
                    style={{ maxHeight: 240 }}
                  />
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                    className="absolute right-2 top-2 rounded-full p-1"
                    style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg py-10 transition-colors"
                  style={{
                    border:     `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                    background: dragOver ? 'var(--accent)/5' : 'transparent',
                  }}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: 'var(--bg-dark)' }}
                  >
                    <ImageIcon className="h-6 w-6" style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Foto ablegen oder klicken
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      JPG, PNG, WebP · max. 5 MB
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium"
                    style={{ background: 'var(--bg-dark)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Datei auswählen
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={handleFileInput}
                  />
                </div>
              )}

              {photoError && (
                <p className="text-xs" style={{ color: 'var(--danger)' }}>{photoError}</p>
              )}

              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Hinweis: Foto-Upload erfordert einen Account. Ohne Login wird die Sperre ohne Foto gespeichert.
              </p>
            </>
          )}

        </div>

        {/* Submit error banner */}
        {submitError && (
          <div
            className="mx-5 mb-1 rounded-lg px-4 py-3 text-sm"
            style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.35)' }}
          >
            {submitError}
          </div>
        )}

        {/* Footer actions (steps 1 and 2 only) */}
        {(step === 1 || step === 2) && (
          <div
            className="flex items-center justify-between gap-3 px-5 py-4"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <button
              type="button"
              onClick={() => setStep((s) => (s as number) - 1 as Step)}
              className="flex items-center gap-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              <ChevronLeft className="h-4 w-4" />
              Zurück
            </button>

            {step === 1 ? (
              <button
                type="button"
                onClick={() => { if (validateStep1()) setStep(2) }}
                className="flex items-center gap-1 rounded-lg px-5 py-3 text-sm font-semibold transition-colors"
                style={{ background: 'var(--accent)', color: 'var(--bg-dark)', border: 'none' }}
              >
                Weiter
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors"
                style={{
                  background: 'var(--accent)',
                  color:      'var(--bg-dark)',
                  border:     'none',
                  opacity:    submitting ? 0.7 : 1,
                  cursor:     submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Meldung abschicken
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  )
}
