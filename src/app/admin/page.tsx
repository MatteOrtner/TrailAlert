import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminDashboardClient } from './AdminDashboardClient'
import { ADMIN_EMAILS } from '@/lib/constants'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const userEmail = user?.email?.toLowerCase()
  if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
    redirect('/')
  }

  const { data: closures, error } = await supabase
    .from('closures')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="p-8 text-center text-red-500">Fehler beim Laden der Sperren. {error.message}</div>
  }

  return (
    <div className="flex w-full flex-col overflow-y-auto bg-bg-dark px-4 pb-8 pt-24 sm:px-8" style={{ height: '100dvh' }}>
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-text-primary">Kommandozentrale</h1>
            <p className="mt-2 text-sm text-text-secondary">Verwaltung und Moderation der aktiven Wegsperren.</p>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-full border border-border bg-bg-card px-4 py-2 text-sm font-medium text-text-primary">
            Admin: {user?.email ?? 'Unbekannt'}
          </div>
        </div>

        <AdminDashboardClient initialClosures={closures ?? []} />
      </div>
    </div>
  )
}
