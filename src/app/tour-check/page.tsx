import type { Metadata } from 'next'
import { TourCheckClient } from './TourCheckClient'
import { SEO_KEYWORDS } from '@/lib/seo'

export const metadata: Metadata = {
  title:       'Tour prüfen – TrailAlert',
  description: 'Prüfe deine GPX-Route auf aktive Wegsperren in Osttirol.',
  keywords: [...SEO_KEYWORDS, 'gpx check lienz', 'tour pruefen mtb', 'mtb route check'],
  alternates: { canonical: '/tour-check' },
}

export default function TourCheckPage() {
  return <TourCheckClient />
}
