'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { useReportForm } from '@/contexts/ReportFormContext'

export function ReportSuccessToast() {
  const { reportCount } = useReportForm()
  const [dismissedCount, setDismissedCount] = useState(0)
  const visible = reportCount > dismissedCount

  useEffect(() => {
    if (!visible) return
    const id = setTimeout(() => setDismissedCount(reportCount), 5000)
    return () => clearTimeout(id)
  }, [reportCount, visible])

  if (!visible) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[2000] flex -translate-x-1/2 items-center gap-3 rounded-xl px-4 py-3 shadow-2xl"
      style={{
        background: 'var(--bg-card)',
        border:     '1px solid var(--success)',
        minWidth:   280,
        maxWidth:   'calc(100vw - 2rem)',
      }}
    >
      <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: 'var(--success)' }} />
      <p className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        Sperre wurde gemeldet!
      </p>
      <button
        type="button"
        onClick={() => setDismissedCount(reportCount)}
        className="shrink-0 rounded-md p-1 transition-colors hover:bg-bg-card-hover"
        style={{ color: 'var(--text-secondary)' }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
