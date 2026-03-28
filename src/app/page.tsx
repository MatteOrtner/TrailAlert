import { MapLoader }  from '@/components/MapLoader'
import { AuthToast }  from '@/components/AuthToast'

interface Props {
  searchParams: Promise<{ auth?: string; auth_error?: string }>
}

export default async function Home({ searchParams }: Props) {
  const params = await searchParams

  const authOk    = params.auth === 'ok'
  const authError = params.auth_error ? decodeURIComponent(params.auth_error) : null

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <MapLoader />
      <AuthToast authOk={authOk} authError={authError} />
    </div>
  )
}
