import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { verifyRegistrationToken } from '@/lib/registration-token'
import { resolveRegistrationOrgId } from '@/lib/org'
import { getOrganizationName } from '@/lib/branding'
import { computeMonthlyAmount } from '@/lib/supabase/queries'
import { formatRegistrationNumber } from '@/lib/utils'
import type { Family, PricingRule } from '@/types'

const PublicRegistrationSchema = z.object({
  token: z.string().min(20),
  student: z.object({
    first_name: z.string().trim().min(1).max(80),
    last_name: z.string().trim().min(1).max(80),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
    gender: z.enum(['M', 'F', 'autre']).default('M'),
    site_id: z.string().uuid(),
    level_id: z.string().uuid().optional().or(z.literal('')),
    medical_notes: z.string().max(1200).optional(),
    photo_consent: z.boolean().default(false),
  }),
  family: z.object({
    parent1_first: z.string().trim().min(1).max(80),
    parent1_last: z.string().trim().min(1).max(80),
    parent1_phone: z.string().trim().min(4).max(40),
    parent1_email: z.string().trim().email().optional().or(z.literal('')),
    parent1_whatsapp: z.string().trim().max(40).optional(),
    address: z.string().trim().max(180).optional(),
    city: z.string().trim().max(80).optional(),
    postal_code: z.string().trim().max(20).optional(),
    emergency_name: z.string().trim().max(120).optional(),
    emergency_phone: z.string().trim().max(40).optional(),
    emergency_relation: z.string().trim().max(80).optional(),
  }),
})

async function sendWhatsApp(to: string | undefined, message: string) {
  const token = process.env.WHATSAPP_API_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneId || !to) return { sent: false, reason: 'not_configured' }

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/[^\d]/g, ''),
        type: 'text',
        text: { body: message, preview_url: false },
      }),
    })
    return { sent: response.ok, reason: response.ok ? 'sent' : 'api_error' }
  } catch {
    return { sent: false, reason: 'network_error' }
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = PublicRegistrationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
  }

  const payload = verifyRegistrationToken(parsed.data.token)
  if (!payload) return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 401 })

  const organizationId = await resolveRegistrationOrgId(payload)
  if (!organizationId) return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { student, family } = parsed.data

  const [{ data: site }, { data: level }, { data: families }, { data: pricingRule }, orgName] = await Promise.all([
    admin.from('sites').select('*').eq('id', student.site_id).eq('organization_id', organizationId).single(),
    student.level_id
      ? admin.from('levels').select('*').eq('id', student.level_id).eq('organization_id', organizationId).single()
      : Promise.resolve({ data: null }),
    admin.from('families').select('*').eq('organization_id', organizationId),
    admin
      .from('pricing_rules')
      .select('*, site:sites(*)')
      .eq('organization_id', organizationId)
      .eq('site_id', student.site_id)
      .eq('is_active', true)
      .lte('effective_from', new Date().toISOString().split('T')[0])
      .or(`effective_until.is.null,effective_until.gte.${new Date().toISOString().split('T')[0]}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getOrganizationName(admin, organizationId).catch(() => null),
  ])

  if (!site) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })

  const schoolName = orgName ?? 'l’école'

  const normalizedPhone = family.parent1_phone.replace(/\s+/g, ' ').trim()
  const normalizedEmail = family.parent1_email?.toLowerCase().trim()
  const existingFamily = ((families ?? []) as Family[]).find((candidate) => {
    const samePhone = candidate.parent1_phone?.replace(/\s+/g, ' ').trim() === normalizedPhone
    const sameEmail = normalizedEmail && candidate.parent1_email?.toLowerCase().trim() === normalizedEmail
    return samePhone || sameEmail
  })

  let familyId = existingFamily?.id
  let familyRecord = existingFamily

  if (!familyId) {
    const { data: createdFamily, error: familyError } = await admin
      .from('families')
      .insert({
        organization_id: organizationId,
        // user_id NOT NULL jusqu'à la migration 019 — émetteur du QR
        user_id: payload.userId,
        parent1_first: family.parent1_first,
        parent1_last: family.parent1_last,
        parent1_phone: normalizedPhone,
        parent1_email: normalizedEmail || null,
        parent1_whatsapp: family.parent1_whatsapp || normalizedPhone,
        address: family.address || null,
        city: family.city || null,
        postal_code: family.postal_code || null,
        primary_site_id: student.site_id,
      })
      .select()
      .single()
    if (familyError) return NextResponse.json({ error: familyError.message }, { status: 500 })
    familyId = createdFamily.id
    familyRecord = createdFamily as Family
  } else {
    await admin
      .from('families')
      .update({ primary_site_id: student.site_id })
      .eq('id', familyId)
  }

  const { data: savedStudent, error: studentError } = await admin
    .from('students')
    .insert({
      organization_id: organizationId,
      user_id: payload.userId,
      family_id: familyId,
      first_name: student.first_name,
      last_name: student.last_name,
      date_of_birth: student.date_of_birth || null,
      gender: student.gender,
      photo_consent: student.photo_consent,
      site_id: student.site_id,
      level_id: student.level_id || null,
      status: 'trial',
      enrollment_date: new Date().toISOString().split('T')[0],
      emergency_name: family.emergency_name || null,
      emergency_phone: family.emergency_phone || null,
      emergency_relation: family.emergency_relation || null,
      medical_notes: student.medical_notes || null,
      notes: 'Inscription parent via QR sécurisé.',
    })
    .select()
    .single()

  if (studentError) return NextResponse.json({ error: studentError.message }, { status: 500 })

  const activeChildren = ((families ?? []) as Family[])
    .find((candidate) => candidate.id === familyId)?.students?.length ?? 1
  const customRate = familyRecord?.custom_monthly_rate
  const normalAmount = pricingRule ? computeMonthlyAmount(pricingRule as PricingRule, Math.max(activeChildren, 1)) : null
  const tariffText = customRate
    ? `Tarif personnalisé famille : ${Number(customRate).toFixed(2)} €/mois.`
    : normalAmount
      ? `Tarif indicatif du site : ${normalAmount.toFixed(2)} €/mois.`
      : `Tarif à confirmer par ${schoolName}.`

  const registrationNumber = familyRecord?.registration_number
    ? formatRegistrationNumber(familyRecord.registration_number)
    : null

  const parentMessage = [
    'Bonjour,',
    `Nous avons bien reçu l'inscription de ${student.first_name} ${student.last_name}.`,
    registrationNumber ? `N° d'inscription : ${registrationNumber}.` : null,
    `Site demandé : ${site.name}.`,
    level ? `Niveau : ${level.emoji ?? ''} ${level.name}.` : null,
    tariffText,
    `${schoolName} vous recontactera pour confirmer le créneau, le tarif final et les prochaines étapes.`,
  ].filter(Boolean).join('\n')

  const adminMessage = [
    'Nouvelle inscription reçue',
    `Élève : ${student.first_name} ${student.last_name}`,
    registrationNumber ? `N° d'inscription : ${registrationNumber}` : null,
    `Parent : ${family.parent1_first} ${family.parent1_last}`,
    `Téléphone : ${normalizedPhone}`,
    normalizedEmail ? `Email : ${normalizedEmail}` : null,
    `Site : ${site.name}`,
    level ? `Niveau : ${level.name}` : null,
    tariffText,
  ].filter(Boolean).join('\n')

  const [parentSend, adminSend] = await Promise.all([
    sendWhatsApp(family.parent1_whatsapp || normalizedPhone, parentMessage),
    sendWhatsApp(process.env.REGISTRATION_ADMIN_PHONE, adminMessage),
  ])

  return NextResponse.json({
    success: true,
    studentId: savedStudent.id,
    tariffText,
    parentMessage,
    adminMessage,
    notifications: {
      parent: parentSend,
      admin: adminSend,
    },
  })
}
