import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ReportFormProvider } from '@/contexts/ReportFormContext'
import { WatchAreaProvider } from '@/contexts/WatchAreaContext'
import { Header } from '@/components/Header'
import { WatchAreaManager } from '@/components/WatchAreaManager'
import { AuthModal } from '@/components/AuthModal'
import { AuthModalProvider } from '@/contexts/AuthModalContext'
import { ReportSuccessToast } from '@/components/ReportSuccessToast'

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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TrailAlert',
  },
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
      <head>
        {/* Register Serwist Service Worker for offline capability */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(
                    function(registration) {
                      console.log('TrailAlert: PWA Service Worker registered');
                    },
                    function(err) {
                      console.error('TrailAlert: Service Worker registration failed', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body className="overflow-hidden flex flex-col bg-bg-dark text-text-primary antialiased">
        <AuthProvider>
          <AuthModalProvider>
            <ReportFormProvider>
              <WatchAreaProvider>
                <Header />
                <WatchAreaManager />
                <AuthModal />
                <ReportSuccessToast />
                <main>{children}</main>
              </WatchAreaProvider>
            </ReportFormProvider>
          </AuthModalProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
