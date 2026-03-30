import type { Metadata } from 'next'
import { TourCheckClient } from './TourCheckClient'

export const metadata: Metadata = {
  title:       'Tour prüfen – TrailAlert',
  description: 'Prüfe deine GPX-Route auf aktive Wegsperren in Osttirol.',
}

export default function TourCheckPage() {
  return <TourCheckClient />
}
