'use client'

import { useState } from 'react'

interface GeolocationState {
  position: GeolocationCoordinates | null
  error: string | null
  loading: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: false,
  })

  function requestLocation() {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'GPS wird von diesem Browser nicht unterstützt.' }))
      return
    }

    setState({ position: null, error: null, loading: true })

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({ position: pos.coords, error: null, loading: false })
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'GPS-Zugriff wurde verweigert.',
          2: 'Position konnte nicht ermittelt werden.',
          3: 'GPS-Anfrage hat zu lange gedauert.',
        }
        setState({
          position: null,
          error: messages[err.code] ?? 'Unbekannter GPS-Fehler.',
          loading: false,
        })
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    )
  }

  return { ...state, requestLocation }
}
