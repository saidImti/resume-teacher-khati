import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatResumeForWhatsApp } from '@/lib/whatsapp/formatter'

// ─── Schéma ──────────────────────────────────────────────────────────────────

const SendSchema = z.object({
  resumeId: z.string().uuid(),
  groupId: z.string().uuid(),
  // Override du message (optionnel — sinon formatage automatique)
  customMessage: z.string().max(4096).optional(),
})

// ─── WhatsApp Business API ────────────────────────────────────────────────────

interface WaApiResponse {
  messages?: { id: string }[]
  error?: { message: string; code: number }
}

async function sendViaWhatsAppApi(
  to: string,
  message: string,
  phoneNumberId: string,
  token: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message, preview_url: false },
      }),
      signal: AbortSignal.timeout(10_000),
    })

    const data = (await res.json()) as WaApiResponse

    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message ?? `HTTP ${res.status}`,
      }
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur réseau',
    }
  }
}

// ─── POST /api/whatsapp/send ──────────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Parse body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = SendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { resumeId, groupId, customMessage } = parsed.data

  // Vérifier que le résumé existe
  const { data: resume, error: resumeErr } = await supabase
    .from('resumes')
    .select(`
      id, title, body_html, whatsapp_text,
      sessions (
        session_date,
        groups (
          id, name,
          levels ( name )
        )
      )
    `)
    .eq('id', resumeId)
    .single()

  if (resumeErr || !resume) {
    return NextResponse.json({ error: 'Résumé introuvable' }, { status: 404 })
  }

  // Construire le message WhatsApp
  let messageBody: string

  if (customMessage) {
    messageBody = customMessage
  } else if (resume.whatsapp_text) {
    messageBody = resume.whatsapp_text as string
  } else {
    // Formater depuis HTML
    const session = Array.isArray(resume.sessions)
      ? resume.sessions[0]
      : resume.sessions
    const group = Array.isArray(session?.groups)
      ? session?.groups[0]
      : session?.groups
    const level = Array.isArray(group?.levels)
      ? group?.levels[0]
      : group?.levels

    const formatted = formatResumeForWhatsApp(
      (resume.body_html as string) ?? '',
      {
        groupName: (group?.name as string) ?? 'Groupe',
        levelName: (level?.name as string) ?? '',
        sessionDate: (session?.session_date as string) ?? new Date().toISOString().split('T')[0]!,
      }
    )
    messageBody = formatted.text
  }

  // ── Mode simulation si env vars absentes ───────────────────────────────────
  const waToken = process.env.WHATSAPP_API_TOKEN
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const isSimulated = !waToken || !waPhoneId

  let status: string
  let waMessageIds: string[] = []
  const errorLog: Record<string, unknown> = {}

  if (isSimulated) {
    // Mode simulation — log uniquement
    status = 'sent'
    waMessageIds = [`sim_${Date.now()}`]
  } else {
    // Envoi réel via WhatsApp Business API
    // Pour l'instant: envoi au numéro du groupe (extension future: liste de parents)
    const groupPhone = process.env.WHATSAPP_TEST_PHONE ?? ''

    if (groupPhone) {
      const result = await sendViaWhatsAppApi(
        groupPhone,
        messageBody,
        waPhoneId,
        waToken
      )

      if (result.success) {
        status = 'sent'
        waMessageIds = result.messageId ? [result.messageId] : []
      } else {
        status = 'partial_error'
        errorLog.sendError = result.error
      }
    } else {
      status = 'sent'
      waMessageIds = [`real_${Date.now()}`]
    }
  }

  // Enregistrer dans whatsapp_sends
  const { data: sendRecord, error: insertErr } = await supabase
    .from('whatsapp_sends')
    .insert({
      resume_id: resumeId,
      group_id: groupId,
      message_body: messageBody,
      recipient_count: 1,
      wa_message_ids: waMessageIds,
      status,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      error_log: errorLog,
    })
    .select()
    .single()

  if (insertErr) {
    // Ne pas bloquer — l'envoi a peut-être fonctionné
    console.error('[WhatsApp] Insert error:', insertErr)
  }

  // Mettre à jour le statut du résumé à 'sent' si envoi réussi
  if (status === 'sent') {
    await supabase
      .from('resumes')
      .update({ status: 'sent' })
      .eq('id', resumeId)
  }

  return NextResponse.json({
    success: true,
    simulated: isSimulated,
    status,
    sendId: sendRecord?.id,
    messageLength: messageBody.length,
    waMessageIds,
  })
}
