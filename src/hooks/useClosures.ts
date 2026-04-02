'use client'

import { useEffect, useMemo, useRef, useState, startTransition, type Dispatch, type SetStateAction } from 'react'
import { createClient } from '@/lib/supabase/client'
import { haversineMeters } from '@/lib/geo'
import type { Closure, ClosureType, SeverityLevel } from '@/lib/types'

export type DistanceFilterKm = 'all' | 3 | 10 | 25

export interface ClosureFilters {
  types:        ClosureType[]        // empty = all types
  severities:   SeverityLevel[]      // empty = all severities
  timeRange:    'all' | '7d' | '30d'
  confirmedOnly: boolean
  distanceKm: DistanceFilterKm
  distanceCenter: { lat: number; lng: number } | null
}

const ALL_TYPES:      ClosureType[]    = ['forestwork', 'construction', 'damage', 'other']
const ALL_SEVERITIES: SeverityLevel[]  = ['full_closure', 'partial', 'warning']

export const DEFAULT_FILTERS: ClosureFilters = {
  types:         ALL_TYPES,
  severities:    ALL_SEVERITIES,
  timeRange:     'all',
  confirmedOnly: false,
  distanceKm:    'all',
  distanceCenter: null,
}

export function isDefaultFilters(f: ClosureFilters): boolean {
  return (
    f.types.length === ALL_TYPES.length &&
    f.severities.length === ALL_SEVERITIES.length &&
    f.timeRange === 'all' &&
    !f.confirmedOnly &&
    f.distanceKm === 'all'
  )
}

function getTimeRangeCutoff(timeRange: ClosureFilters['timeRange']): number | null {
  if (timeRange === 'all') return null
  const days = timeRange === '7d' ? 7 : 30
  return Date.now() - days * 24 * 60 * 60 * 1000
}

export function useClosures() {
  const [allClosures, setAllClosures] = useState<Closure[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [filters, setFiltersState]    = useState<ClosureFilters>(DEFAULT_FILTERS)
  const [timeRangeCutoff, setTimeRangeCutoff] = useState<number | null>(null)

  const supabase = useRef(createClient())

  const setFilters: Dispatch<SetStateAction<ClosureFilters>> = (nextFilters) => {
    setFiltersState((prev) => {
      const resolved = typeof nextFilters === 'function'
        ? nextFilters(prev)
        : nextFilters
      setTimeRangeCutoff(getTimeRangeCutoff(resolved.timeRange))
      return resolved
    })
  }

  useEffect(() => {
    const client = supabase.current

    async function fetchClosures() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await client
        .from('closures')
        .select('*')
        .neq('status', 'resolved')
        .order('created_at', { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setAllClosures(data ?? [])
      }
      setLoading(false)
    }

    fetchClosures()

    const channel = client
      .channel('closures-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'closures' },
        (payload) => {
          // startTransition makes this a low-priority update — React can
          // interrupt it to handle touch/scroll events first, preventing lag.
          startTransition(() => {
            setAllClosures((prev) => [payload.new as Closure, ...prev])
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'closures' },
        (payload) => {
          const updated = payload.new as Closure
          startTransition(() => {
            setAllClosures((prev) =>
              updated.status === 'resolved'
                ? prev.filter((c) => c.id !== updated.id)
                : prev.map((c) => (c.id === updated.id ? updated : c))
            )
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'closures' },
        (payload) => {
          startTransition(() => {
            setAllClosures((prev) => prev.filter((c) => c.id !== payload.old.id))
          })
        }
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [])

  // useMemo ensures the filtered array is only recomputed when allClosures
  // or filters actually change — not on every parent re-render.
  const closures = useMemo(() => allClosures.filter((c) => {
    if (!filters.types.includes(c.closure_type)) return false
    if (!filters.severities.includes(c.severity)) return false

    if (timeRangeCutoff !== null && new Date(c.created_at).getTime() < timeRangeCutoff) {
      return false
    }

    if (filters.distanceKm !== 'all' && filters.distanceCenter) {
      const distanceM = haversineMeters(
        filters.distanceCenter.lat,
        filters.distanceCenter.lng,
        c.latitude,
        c.longitude,
      )

      if (distanceM > filters.distanceKm * 1000) return false
    }

    if (filters.confirmedOnly && c.upvotes === 0) return false

    return true
  }), [allClosures, filters, timeRangeCutoff])

  return {
    closures,
    total: allClosures.length,
    loading,
    error,
    filters,
    setFilters,
  }
}
