'use client'

import { createContext, useContext, useState } from 'react'

interface WatchAreaContextType {
  isOpen: boolean
  open:   () => void
  close:  () => void
}

const WatchAreaContext = createContext<WatchAreaContextType | null>(null)

export function WatchAreaProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <WatchAreaContext.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
    </WatchAreaContext.Provider>
  )
}

export function useWatchAreaPanel() {
  const ctx = useContext(WatchAreaContext)
  if (!ctx) throw new Error('useWatchAreaPanel must be inside WatchAreaProvider')
  return ctx
}
