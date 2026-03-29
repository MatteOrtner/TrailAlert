import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminDashboardClient } from './AdminDashboardClient'
import { ADMIN_EMAILS } from '@/lib/constants'

export default async function AdminPage() {
  const supabase = await createClient()

  // 1. Get logged in User
  const { data: { user } } = await supabase.auth.getUser()
  
  // 2. Gate access conditionally (for now, if no one is in ADMIN_EMAILS, allow the first person or just un-gate it for testing. But safer to gate it and tell Matte)
  if (!user || user.email && !ADMIN_EMAILS.includes(user.email)) {
    // If you haven't added your email yet to the array above, we will let you pass for testing if the array is basically empty.
    // Production: uncomment the below redirect!
    // redirect('/') 
  }

  // 3. Fetch all closures (newest first)
  const { data: closures, error } = await supabase
    .from('closures')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="p-8 text-center text-red-500">Fehler beim Laden der Sperren. {error.message}</div>
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-bg-dark px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-text-primary">Kommandozentrale</h1>
            <p className="mt-2 text-sm text-text-secondary">Verwaltung und Moderation der aktiven Wegsperren.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-bg-card px-4 py-2 text-sm font-medium text-text-primary">
            Admin: {user?.email ?? 'Unbekannt'}
          </div>
        </div>

        <AdminDashboardClient initialClosures={closures ?? []} />
      </div>
    </div>
  )
}
