'use client'

import { createContext, useContext, useRef, useState } from 'react'

interface ReportFormContextType {
  isOpen: boolean
  open:   () => void
  close:  () => void
  // Map.tsx assigns this ref so the form can zoom after submit
  onSuccessRef: React.MutableRefObject<((lat: number, lng: number) => void) | null>
}

const ReportFormContext = createContext<ReportFormContextType | null>(null)

export function ReportFormProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const onSuccessRef = useRef<((lat: number, lng: number) => void) | null>(null)

  return (
    <ReportFormContext.Provider
      value={{
        isOpen,
        open:  () => setIsOpen(true),
        close: () => setIsOpen(false),
        onSuccessRef,
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
