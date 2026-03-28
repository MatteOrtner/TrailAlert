import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ReportFormProvider } from '@/contexts/ReportFormContext'
import { WatchAreaProvider } from '@/contexts/WatchAreaContext'
import { Header } from '@/components/Header'

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://trailalert.vercel.app'
const TITLE   = 'TrailAlert — Forstwege-Sperren für Mountainbiker'
const DESC    = 'Aktuelle Forstwege-Sperren in Osttirol und Tirol. Crowdsourcing-Plattform für Mountainbiker — melde Sperren, stimme ab und behalte deine Lieblingsgebiete im Blick.'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: TITLE,
  description: DESC,
  keywords: ['Mountainbike', 'Forstwege', 'Sperren', 'Osttirol', 'Tirol', 'TrailAlert', 'MTB'],
  authors: [{ name: 'TrailAlert' }],
  robots: { index: true, follow: true },
  openGraph: {
    type:      'website',
    locale:    'de_AT',
    url:       APP_URL,
    siteName:  'TrailAlert',
    title:     TITLE,
    description: DESC,
  },
  twitter: {
    card:        'summary',
    title:       TITLE,
    description: DESC,
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width:              'device-width',
  initialScale:       1,
  maximumScale:       5,
  themeColor:         '#0f1115',
  viewportFit:        'cover',   // enables safe-area-inset on notched phones
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={jakartaSans.variable}>
      <body className="overflow-hidden flex flex-col bg-bg-dark text-text-primary antialiased">
        <AuthProvider>
          <ReportFormProvider>
            <WatchAreaProvider>
              <Header />
              <main>{children}</main>
            </WatchAreaProvider>
          </ReportFormProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
