import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useComments } from '@/hooks/useComments'
import { Loader2, MessageSquare, Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

export function ClosureComments({ closureId }: { closureId: string }) {
  const { user } = useAuth()
  const { comments, loading } = useComments(closureId)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // By default, only show comments when expanded to save popup space
  const [expanded, setExpanded] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > 500) return

    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('closure_comments')
      .insert({
        closure_id: closureId,
        user_id: user.id,
        text: trimmed
      })

    setSubmitting(false)
    if (err) {
      setError('Fehler beim Senden.')
    } else {
      setText('')
    }
  }

  if (!expanded) {
    return (
      <div className="pt-2 border-t mt-2" style={{ borderColor: 'var(--border)' }}>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 mb-1"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Kommentare / Updates ({loading ? '...' : comments.length})
        </button>
      </div>
    )
  }

  return (
    <div className="pt-2 border-t mt-2 flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
          Kommentare ({comments.length})
        </span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Zuklappen
        </button>
      </div>

      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center py-2">
             <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs italic text-gray-500 py-1">Noch keine Updates.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-2 flex flex-col gap-1">
              <p className="text-xs text-gray-800 dark:text-gray-200 break-words">{c.text}</p>
              <span className="text-[10px] text-gray-500">
                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: de })}
              </span>
            </div>
          ))
        )}
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-1 mt-1">
          <div className="flex gap-1">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Update schreiben..."
              maxLength={500}
              className="flex-1 text-xs rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 focus:outline-none focus:border-accent"
              style={{ color: 'var(--text-primary)' }}
            />
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="flex items-center justify-center bg-accent text-white px-2 py-1.5 rounded-md disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            </button>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </form>
      ) : (
        <p className="text-[10px] text-center text-gray-500 mt-1">
          Bitte logge dich ein, um zu kommentieren.
        </p>
      )}
    </div>
  )
}
