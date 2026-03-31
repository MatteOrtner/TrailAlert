'use client'

import { createContext, useContext, useState } from 'react'

interface HeaderMenuContextValue {
  menuOpen: boolean
  setMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void
}

const HeaderMenuContext = createContext<HeaderMenuContextValue>({
  menuOpen: false,
  setMenuOpen: () => {},
})

export function HeaderMenuProvider({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <HeaderMenuContext.Provider value={{ menuOpen, setMenuOpen }}>
      {children}
    </HeaderMenuContext.Provider>
  )
}

export function useHeaderMenu() {
  return useContext(HeaderMenuContext)
}
