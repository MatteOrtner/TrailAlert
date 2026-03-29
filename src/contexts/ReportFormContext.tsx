'use client'

import { createContext, useContext, useRef, useState } from 'react'

interface ReportFormContextType {
  isOpen: boolean
  open:   () => void
  close:  () => void
  // Map.tsx assigns this ref so the form can zoom after submit
  onSuccessRef: React.MutableRefObject<((lat: number, lng: number) => void) | null>
  // Increments each time a closure is successfully reported — used by toast
  reportCount:     number
  notifyReported:  () => void
  // True while the user is picking a location on the main map (step 0)
  isPickingLocation: boolean
  setIsPickingLocation: (v: boolean) => void
  // Map.tsx calls this when the user taps the map during picking
  onPositionPickedRef: React.MutableRefObject<((lat: number, lng: number) => void) | null>
}

const ReportFormContext = createContext<ReportFormContextType | null>(null)

export function ReportFormProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen]                   = useState(false)
  const [reportCount, setReportCount]         = useState(0)
  const [isPickingLocation, setIsPickingLocation] = useState(false)
  const onSuccessRef      = useRef<((lat: number, lng: number) => void) | null>(null)
  const onPositionPickedRef = useRef<((lat: number, lng: number) => void) | null>(null)

  return (
    <ReportFormContext.Provider
      value={{
        isOpen,
        open:  () => setIsOpen(true),
        close: () => setIsOpen(false),
        onSuccessRef,
        reportCount,
        notifyReported: () => setReportCount((n) => n + 1),
        isPickingLocation,
        setIsPickingLocation,
        onPositionPickedRef,
      }}
    >
      {children}
    </ReportFormContext.Provider>
  )
}

export function useReportForm() {
  const ctx = useContext(ReportFormContext)
  if (!ctx) throw new Error('useReportForm must be inside ReportFormProvider')
  return ctx
}
