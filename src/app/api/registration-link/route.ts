import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createRegistrationToken } from '@/lib/registration-token'

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin
  const token = createRegistrationToken(user.id)
  const registrationUrl = `${origin}/inscription?token=${encodeURIComponent(token)}`

  return NextResponse.json({
    url: registrationUrl,
    expiresInDays: 90,
  })
}
