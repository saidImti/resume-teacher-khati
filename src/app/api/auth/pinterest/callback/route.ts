import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { exchangeCodeForToken, getPinterestUserInfo } from '@/lib/pinterest/client'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const storedState = req.cookies.get('pinterest_oauth_state')?.value

  // Clear state cookie
  const failRedirect = (msg: string) => {
    const url = new URL('/outils/pinterest', APP_URL)
    url.searchParams.set('error', msg)
    const res = NextResponse.redirect(url)
    res.cookies.delete('pinterest_oauth_state')
    return res
  }

  if (error)                           return failRedirect(error)
  if (!code)                           return failRedirect('no_code')
  if (!state || state !== storedState) return failRedirect('invalid_state')

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return failRedirect('unauthenticated')

  try {
    const tokens   = await exchangeCodeForToken(code)
    const pUser    = await getPinterestUserInfo(tokens.access_token)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await supabase
      .from('pinterest_settings')
      .upsert({
        user_id:               user.id,
        access_token:          tokens.access_token,
        refresh_token:         tokens.refresh_token,
        token_expires_at:      expiresAt,
        pinterest_user_id:     pUser.id,
        pinterest_username:    pUser.username,
        pinterest_profile_url: `https://pinterest.com/${pUser.username}`,
        connected_at:          new Date().toISOString(),
      }, { onConflict: 'user_id' })

    const res = NextResponse.redirect(new URL('/outils/pinterest', APP_URL))
    res.cookies.delete('pinterest_oauth_state')
    return res
  } catch (err) {
    console.error('Pinterest callback error:', err)
    return failRedirect('token_exchange_failed')
  }
}
