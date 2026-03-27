import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
  throw new Error(
    '❌ NEXT_PUBLIC_SUPABASE_URL fehlt oder ist ungültig.\n' +
    'Trage deine Supabase Project URL in .env.local ein:\n' +
    'NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co'
  )
}
if (!supabaseKey) {
  throw new Error(
    '❌ NEXT_PUBLIC_SUPABASE_ANON_KEY fehlt.\n' +
    'Trage deinen Supabase Anon Key in .env.local ein.'
  )
}

export function createClient() {
  return createBrowserClient(supabaseUrl!, supabaseKey!)
}
