'use client'

import { useEffect } from 'react'

interface ClientErrorPayload {
  type: 'error' | 'unhandledrejection'
  message: string
  stack?: string | null
  source?: string | null
  line?: number | null
  column?: number | null
  url: string
  userAgent: string
  timestamp: string
}

const TELEMETRY_ENDPOINT = '/api/telemetry/client-error'

function sendPayload(payload: ClientErrorPayload) {
  const body = JSON.stringify(payload)

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' })
    navigator.sendBeacon(TELEMETRY_ENDPOINT, blob)
    return
  }

  void fetch(TELEMETRY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Intentionally swallow errors; telemetry must not break UX.
  })
}

export function ClientErrorReporter() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_CLIENT_ERROR_REPORTING === 'false') {
      return
    }

    const onError = (event: ErrorEvent) => {
      sendPayload({
        type: 'error',
        message: event.message || 'Unknown client error',
        stack: event.error?.stack ?? null,
        source: event.filename ?? null,
        line: event.lineno ?? null,
        column: event.colno ?? null,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      })
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason =
        typeof event.reason === 'string'
          ? event.reason
          : event.reason?.message ?? JSON.stringify(event.reason)

      sendPayload({
        type: 'unhandledrejection',
        message: reason || 'Unhandled promise rejection',
        stack: event.reason?.stack ?? null,
        source: null,
        line: null,
        column: null,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])

  return null
}
