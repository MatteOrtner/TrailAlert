'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { WatchArea } from '@/lib/types'

interface AddWatchAreaInput {
  center_lat:   number
  center_lng:   number
  radius_km:    number
  name:         string
  notify_email: boolean
}

export function useWatchAreas() {
  const { user }            = useAuth()
  const [areas, setAreas]   = useState<WatchArea[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const supabase = useRef(createClient())

  const fetchAreas = useCallback(async () => {
    if (!user) { setAreas([]); return }
    setLoading(true)
    const { data, error: err } = await supabase.current
      .from('watch_areas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setAreas(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchAreas()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [fetchAreas])

  async function addArea(input: AddWatchAreaInput): Promise<WatchArea | null> {
    if (!user) return null
    const { data, error: err } = await supabase.current
      .from('watch_areas')
      .insert({ ...input, user_id: user.id })
      .select()
      .single()
    if (err) { setError(err.message); return null }
    setAreas((prev) => [data, ...prev])
    return data
  }

  async function removeArea(id: string): Promise<void> {
    const { error: err } = await supabase.current
      .from('watch_areas')
      .delete()
      .eq('id', id)
    if (err) { setError(err.message); return }
    setAreas((prev) => prev.filter((a) => a.id !== id))
  }

  async function toggleNotify(id: string, notify_email: boolean): Promise<void> {
    const { data, error: err } = await supabase.current
      .from('watch_areas')
      .update({ notify_email })
      .eq('id', id)
      .select()
      .single()
    if (err) { setError(err.message); return }
    setAreas((prev) => prev.map((a) => (a.id === id ? data : a)))
  }

  return { areas, loading, error, addArea, removeArea, toggleNotify, refetch: fetchAreas }
}
