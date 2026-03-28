'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Closure, ClosureType, SeverityLevel } from '@/lib/types'

export interface ClosureFilters {
  types:        ClosureType[]        // empty = all types
  severities:   SeverityLevel[]      // empty = all severities
  timeRange:    'all' | '7d' | '30d'
  confirmedOnly: boolean
}

const ALL_TYPES:      ClosureType[]    = ['forestwork', 'construction', 'damage', 'other']
const ALL_SEVERITIES: SeverityLevel[]  = ['full_closure', 'partial', 'warning']

export const DEFAULT_FILTERS: ClosureFilters = {
  types:         ALL_TYPES,
  severities:    ALL_SEVERITIES,
  timeRange:     'all',
  confirmedOnly: false,
}

export function isDefaultFilters(f: ClosureFilters): boolean {
  return (
    f.types.length === ALL_TYPES.length &&
    f.severities.length === ALL_SEVERITIES.length &&
    f.timeRange === 'all' &&
    !f.confirmedOnly
  )
}

export function useClosures() {
  const [allClosures, setAllClosures] = useState<Closure[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [filters, setFilters]         = useState<ClosureFilters>(DEFAULT_FILTERS)

  const supabase = useRef(createClient())

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
          setAllClosures((prev) => [payload.new as Closure, ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'closures' },
        (payload) => {
          const updated = payload.new as Closure
          setAllClosures((prev) =>
            updated.status === 'resolved'
              ? prev.filter((c) => c.id !== updated.id)
              : prev.map((c) => (c.id === updated.id ? updated : c))
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'closures' },
        (payload) => {
          setAllClosures((prev) => prev.filter((c) => c.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [])

  const closures = allClosures.filter((c) => {
    if (!filters.types.includes(c.closure_type)) return false
    if (!filters.severities.includes(c.severity)) return false

    if (filters.timeRange !== 'all') {
      const days   = filters.timeRange === '7d' ? 7 : 30
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
      if (new Date(c.created_at).getTime() < cutoff) return false
    }

    if (filters.confirmedOnly && c.upvotes === 0) return false

    return true
  })

  return {
    closures,
    total: allClosures.length,
    loading,
    error,
    filters,
    setFilters,
  }
}
