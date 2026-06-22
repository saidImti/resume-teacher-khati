// POST /api/whatsapp/test — envoi d'un message libre pour tester la configuration
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage, normalizePhoneNumber } from '@/lib/whatsapp/send'

const Schema = z.object({
  to:      z.string().min(5),
  message: z.string().min(1).max(4096),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'to (téléphone) et message requis' }, { status: 400 })
  }

  const phone = normalizePhoneNumber(parsed.data.to)
  if (!phone) {
    return NextResponse.json({ error: 'Numéro de téléphone invalide' }, { status: 400 })
  }

  const result = await sendWhatsAppMessage(phone, parsed.data.message)
  return NextResponse.json(result)
}
