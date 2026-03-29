'use client'

import { useState } from 'react'

const KEY = 'trailalert_onboarding_seen'

function hasSeenOnboarding(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(KEY) === '1'
}

export function useOnboarding() {
  const [seen, setSeen] = useState(() => hasSeenOnboarding())

  /** Call after a deliberate user choice (sign in or anonymous). Persists to localStorage. */
  function markSeen() {
    localStorage.setItem(KEY, '1')
    setSeen(true)
  }

  return { hasSeen: seen, markSeen }
}
