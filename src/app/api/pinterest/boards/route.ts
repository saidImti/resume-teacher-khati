import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPinterestBoards } from '@/lib/pinterest/client'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: settings } = await supabase
    .from('pinterest_settings')
    .select('access_token')
    .eq('user_id', user.id)
    .single()

  if (!settings?.access_token) {
    return NextResponse.json({ error: 'Pinterest not connected' }, { status: 400 })
  }

  try {
    const boards = await getPinterestBoards(settings.access_token)
    return NextResponse.json({ boards })
  } catch (err) {
    console.error('Pinterest boards error:', err)
    return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 })
  }
}
