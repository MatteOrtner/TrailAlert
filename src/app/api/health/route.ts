import { NextResponse } from 'next/server'

export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev'

  return NextResponse.json({
    status: 'ok',
    service: 'trailalert-web',
    timestamp: new Date().toISOString(),
    commit,
    checks: {
      env: {
        hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      },
    },
  })
}
