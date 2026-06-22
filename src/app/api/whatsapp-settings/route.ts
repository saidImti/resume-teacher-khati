// ─── API /api/whatsapp-settings ──────────────────────────────────────────────
// GET  → récupère les paramètres WhatsApp
// PATCH → met à jour (test_mode, test_number, n8n_webhook_url, etc.)

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data, error } = await supabase
      .from('whatsapp_settings')
      .select(
        'production_number, production_verified, test_number, test_mode, ' +
        'n8n_webhook_url, n8n_enabled, messages_sent_today, messages_sent_month, last_message_at'
      )
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Retourner des valeurs par défaut si pas encore de settings
    return NextResponse.json({
      settings: data ?? {
        production_number:   null,
        production_verified: false,
        test_number:         null,
        test_mode:           true,
        n8n_webhook_url:     null,
        n8n_enabled:         false,
        messages_sent_today: 0,
        messages_sent_month: 0,
        last_message_at:     null,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json() as {
      test_mode?:       boolean
      test_number?:     string
      production_number?: string
      n8n_webhook_url?: string
      n8n_enabled?:     boolean
    }

    // Upsert
    const { data, error } = await supabase
      .from('whatsapp_settings')
      .upsert({ user_id: user.id, ...body }, { onConflict: 'user_id' })
      .select(
        'production_number, production_verified, test_number, test_mode, ' +
        'n8n_webhook_url, n8n_enabled, messages_sent_today, messages_sent_month'
      )
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ settings: data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
