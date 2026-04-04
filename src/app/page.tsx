import type { Metadata } from 'next'
import { MapLoader }  from '@/components/MapLoader'
import { AuthToast }  from '@/components/AuthToast'
import { redirect } from 'next/navigation'
import { SEO_KEYWORDS } from '@/lib/seo'

interface Props {
  searchParams: Promise<{
    auth?: string
    auth_error?: string
    closure?: string
    code?: string
    token_hash?: string
    type?: string
    next?: string
  }>
}

export const metadata: Metadata = {
  title: 'TrailAlert | Trail Alert – Forstwege-Sperren in Osttirol & Tirol',
  description: 'TrailAlert (Trail Alert) zeigt aktuelle Forstwege-Sperren für Mountainbiker in Osttirol und Tirol.',
  keywords: SEO_KEYWORDS,
  alternates: { canonical: '/' },
}

export default async function Home({ searchParams }: Props) {
  const params = await searchParams
  const canonicalBase = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const code = params.code
  const tokenHash = params.token_hash
  const type = params.type

  // Safety fallback: if a magic-link lands on "/" with auth params,
  // forward to the dedicated callback route (and canonical domain if set).
  if (code || (tokenHash && type)) {
    const query = new URLSearchParams()
    if (code) query.set('code', code)
    if (tokenHash) query.set('token_hash', tokenHash)
    if (type) query.set('type', type)
    if (params.next) query.set('next', params.next)

    const callbackPath = `/auth/callback?${query.toString()}`

    if (canonicalBase) {
      const callbackUrl = new URL(callbackPath, canonicalBase).toString()
      redirect(callbackUrl)
    }

    redirect(callbackPath)
  }

  const authOk          = params.auth === 'ok'
  const authError       = params.auth_error ? decodeURIComponent(params.auth_error) : null
  const targetClosureId = params.closure ?? null

  return (
    <div className="relative w-full overflow-hidden" style={{ height: '100dvh' }}>
      <MapLoader targetClosureId={targetClosureId} />
      <AuthToast authOk={authOk} authError={authError} />
    </div>
  )
}
