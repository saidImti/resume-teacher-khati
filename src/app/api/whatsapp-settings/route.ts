// ─── API /api/whatsapp-settings ──────────────────────────────────────────────
// GET  → récupère les paramètres WhatsApp de l'organisation
// PATCH → met à jour (test_mode, test_number, n8n_webhook_url, etc.) — admin

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'

export async function GET() {
  try {
    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('whatsapp_settings')
      .select(
        'production_number, production_verified, test_number, test_mode, ' +
        'n8n_webhook_url, n8n_enabled, messages_sent_today, messages_sent_month, last_message_at'
      )
      .eq('organization_id', ctx.organizationId)
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
    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    // Config : admin uniquement (matrice RLS)
    if (ctx.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })
    const supabase = await createServerSupabaseClient()

    const body = await req.json() as {
      test_mode?:       boolean
      test_number?:     string
      production_number?: string
      n8n_webhook_url?: string
      n8n_enabled?:     boolean
    }

    // Upsert par organisation (unique organization_id créé en migration 018)
    const { data, error } = await supabase
      .from('whatsapp_settings')
      .upsert(
        // user_id NOT NULL jusqu'à la migration 019
        { organization_id: ctx.organizationId, user_id: ctx.user.id, ...body },
        { onConflict: 'organization_id' }
      )
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
