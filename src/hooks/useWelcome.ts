'use client'

import { useState } from 'react'

const KEY = 'trailalert_welcome_seen'

export function useWelcome() {
  const [seen, setSeen] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem(KEY) === '1'
  })

  function dismiss() {
    localStorage.setItem(KEY, '1')
    setSeen(true)
  }

  return { showWelcome: !seen, dismiss }
}
