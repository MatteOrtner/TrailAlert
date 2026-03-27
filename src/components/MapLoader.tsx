'use client'

// `ssr: false` must live in a Client Component per Next.js 16 docs.
// This thin wrapper keeps page.tsx as a Server Component.

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#1a1f2e]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Karte wird geladen…
        </p>
      </div>
    </div>
  ),
})

export function MapLoader() {
  return <Map />
}
