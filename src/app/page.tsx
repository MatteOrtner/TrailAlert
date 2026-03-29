import { MapLoader }  from '@/components/MapLoader'
import { AuthToast }  from '@/components/AuthToast'

interface Props {
  searchParams: Promise<{ auth?: string; auth_error?: string; closure?: string }>
}

export default async function Home({ searchParams }: Props) {
  const params = await searchParams

  const authOk          = params.auth === 'ok'
  const authError       = params.auth_error ? decodeURIComponent(params.auth_error) : null
  const targetClosureId = params.closure ?? null

  return (
    <div className="relative w-full overflow-hidden" style={{ height: '100svh' }}>
      <MapLoader targetClosureId={targetClosureId} />
      <AuthToast authOk={authOk} authError={authError} />
    </div>
  )
}
