// POST /api/whatsapp/catchup
// Envoie le contenu du cours aux parents des élèves absents.
// Si un résumé existe pour la séance → utilise le texte WhatsApp formaté.
// Si pas encore de résumé → envoie une notification d'absence générique.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
import { getOrganizationName } from '@/lib/branding'
import { sendWhatsAppMessage, normalizePhoneNumber } from '@/lib/whatsapp/send'
import { formatResumeForWhatsApp } from '@/lib/whatsapp/formatter'

const Schema = z.object({
  sessionId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (ctx.role === 'viewer') return NextResponse.json({ error: 'Lecture seule' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'sessionId UUID requis' }, { status: 400 })
  }

  const { sessionId } = parsed.data
  const admin = createAdminSupabaseClient()

  // ── 1. Paramètres WhatsApp + nom de l'école ───────────────────────────────
  const [{ data: waSettings }, orgName] = await Promise.all([
    admin
      .from('whatsapp_settings')
      .select('test_mode, test_number, production_number')
      .eq('organization_id', ctx.organizationId)
      .maybeSingle(),
    getOrganizationName(admin, ctx.organizationId).catch(() => null),
  ])

  const testMode   = waSettings?.test_mode ?? true
  const testNumber = normalizePhoneNumber(waSettings?.test_number)
  const schoolName = orgName ?? 'votre école'

  // ── 2. Session + groupe + level ───────────────────────────────────────────
  const { data: session, error: sessErr } = await admin
    .from('sessions')
    .select('id, session_date, group:groups(id, name, level:levels(id, name, emoji, color))')
    .eq('id', sessionId)
    .eq('organization_id', ctx.organizationId)
    .single()

  if (sessErr || !session) {
    return NextResponse.json({ error: 'Séance introuvable' }, { status: 404 })
  }

  // ── 3. Élèves absents de cette séance avec numéros WhatsApp ───────────────
  const { data: absents, error: absErr } = await admin
    .from('attendance')
    .select(`
      id,
      student_id,
      notif_sent_at,
      student:students(
        id, first_name, last_name,
        family:families(id, parent1_first, parent1_whatsapp, parent1_phone)
      )
    `)
    .eq('session_id', sessionId)
    .in('status', ['absent', 'excused'])
    .eq('organization_id', ctx.organizationId)

  if (absErr) return NextResponse.json({ error: absErr.message }, { status: 500 })
  if (!absents || absents.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'Aucun absent pour cette séance' })
  }

  // ── 4. Résumé existant pour cette séance (optionnel) ─────────────────────
  const { data: resume } = await admin
    .from('resumes')
    .select('id, body_html, whatsapp_text, title')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // ── 5. Construire le texte du message ─────────────────────────────────────
  interface GroupShape { id: string; name: string; level: { id: string; name: string; emoji: string; color: string }[] | { id: string; name: string; emoji: string; color: string } | null }
  const rawGroup   = session.group as unknown as GroupShape | GroupShape[] | null
  const group      = rawGroup ? (Array.isArray(rawGroup) ? rawGroup[0] : rawGroup) : null
  const rawLevel   = group?.level
  const level      = rawLevel ? (Array.isArray(rawLevel) ? rawLevel[0] : rawLevel) : null
  const sessionDate = session.session_date as string

  let courseText: string
  if (resume?.whatsapp_text) {
    courseText = resume.whatsapp_text as string
  } else if (resume?.body_html) {
    const formatted = formatResumeForWhatsApp(resume.body_html as string, {
      groupName:   (group?.name as string) ?? 'Groupe',
      levelName:   (level?.name as string) ?? '',
      sessionDate,
    })
    courseText = formatted.text
  } else {
    courseText = null as unknown as string
  }

  // ── 6. Envoyer à chaque parent absent ────────────────────────────────────
  const results: Array<{ studentId: string; phone: string | null; success: boolean; simulated: boolean; error?: string }> = []

  for (const rec of absents) {
    interface StudentShape { id: string; first_name: string; last_name: string; family?: { id: string; parent1_first: string; parent1_whatsapp: string | null; parent1_phone: string | null }[] | { id: string; parent1_first: string; parent1_whatsapp: string | null; parent1_phone: string | null } | null }
    type FamilyShape = { id: string; parent1_first: string; parent1_whatsapp: string | null; parent1_phone: string | null }
    const rawStudent = rec.student as unknown as StudentShape | StudentShape[] | null
    const student    = rawStudent ? (Array.isArray(rawStudent) ? rawStudent[0] : rawStudent) : null
    if (!student) continue

    const rawFamily = student.family
    const family: FamilyShape | null = rawFamily
      ? (Array.isArray(rawFamily) ? (rawFamily as FamilyShape[])[0] ?? null : rawFamily as FamilyShape)
      : null
    const rawPhone = family?.parent1_whatsapp ?? family?.parent1_phone ?? null
    const parentPhone = testMode
      ? (testNumber ?? normalizePhoneNumber(rawPhone))
      : normalizePhoneNumber(rawPhone)

    if (!parentPhone) {
      results.push({ studentId: student.id, phone: null, success: false, simulated: false, error: 'Aucun numéro WhatsApp' })
      continue
    }

    // Message personnalisé
    const parentFirst = family?.parent1_first ?? 'Parent'
    const studentName = `${student.first_name} ${student.last_name}`
    const dateStr = new Date(sessionDate).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
    })

    let message: string
    if (courseText) {
      message = `👋 *Bonjour ${parentFirst},*\n\n${studentName} était absent(e) lors du cours du ${dateStr}.\n\nVoici le contenu du cours pour qu'il/elle puisse rattraper :\n\n${courseText}`
    } else {
      message = `👋 *Bonjour ${parentFirst},*\n\n${studentName} était absent(e) lors du cours du ${dateStr}.\n\nLe résumé du cours sera disponible prochainement auprès de ${schoolName}.\n\n📚 À bientôt !`
    }

    const sendResult = await sendWhatsAppMessage(parentPhone, message)
    results.push({
      studentId: student.id,
      phone: parentPhone,
      success: sendResult.success,
      simulated: sendResult.simulated,
      error: sendResult.error,
    })

    // Mettre à jour le champ notif_sent_at si succès
    if (sendResult.success) {
      await admin
        .from('attendance')
        .update({
          notif_sent_at: new Date().toISOString(),
          notif_type: courseText ? 'catchup' : 'absence_alert',
        })
        .eq('id', rec.id)
    }
  }

  const sent      = results.filter((r) => r.success).length
  const failed    = results.filter((r) => !r.success).length
  const simulated = results.some((r) => r.simulated)

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    simulated,
    testMode,
    hasCourseContent: !!courseText,
    results,
  })
}
