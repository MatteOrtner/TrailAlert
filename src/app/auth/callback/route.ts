import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Handles both OAuth (Google) and Magic Link callbacks.
// Supabase redirects here with:
//   OAuth:      ?code=<pkce-code>
//   Magic Link: ?token_hash=<hash>&type=magiclink
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code      = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type      = searchParams.get('type') as 'magiclink' | 'email' | null
  const next      = searchParams.get('next') ?? '/'

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}?auth=ok`)
    }
    const msg = encodeURIComponent(error.message)
    return NextResponse.redirect(`${origin}/?auth_error=${msg}`)
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}?auth=ok`)
    }
    const msg = encodeURIComponent(error.message)
    return NextResponse.redirect(`${origin}/?auth_error=${msg}`)
  }

  return NextResponse.redirect(`${origin}/?auth_error=Unbekannter+Fehler`)
}
