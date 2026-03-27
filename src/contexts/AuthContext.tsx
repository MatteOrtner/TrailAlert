'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user:    User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  // Stable client reference — createClient() returns a new instance each call
  const supabase = useRef(createClient())

  useEffect(() => {
    const client = supabase.current
    let initialised = false

    // onAuthStateChange fires INITIAL_SESSION synchronously from the local
    // cookie — use it to populate the user immediately so UI doesn't flash.
    // After getUser() (server-round-trip) resolves we stop the loading state.
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      // On subsequent events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED …) we're
      // already past the initial load so just update without touching loading.
      if (initialised) return
      if (event === 'INITIAL_SESSION') {
        // Server validation still in flight — let getUser() below set loading=false
      }
    })

    // Validate session with server, then mark loading done
    client.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
      setLoading(false)
      initialised = true
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
