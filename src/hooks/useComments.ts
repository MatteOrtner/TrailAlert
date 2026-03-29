import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ClosureComment } from '@/lib/types'

export function useComments(closureId: string) {
  const [comments, setComments] = useState<ClosureComment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    async function fetchComments() {
      const { data } = await supabase
        .from('closure_comments')
        .select('*')
        .eq('closure_id', closureId)
        .order('created_at', { ascending: true })

      if (mounted && data) {
        setComments(data as ClosureComment[])
      }
      if (mounted) setLoading(false)
    }

    fetchComments()

    // Realtime subscription
    const channel = supabase
      .channel(`comments_${closureId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'closure_comments',
          filter: `closure_id=eq.${closureId}`,
        },
        (payload) => {
          if (mounted) {
            setComments((prev) => [...prev, payload.new as ClosureComment])
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [closureId])

  return { comments, loading }
}
