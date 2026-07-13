// POST /api/invoices/generate-monthly
// Génère automatiquement les factures mensuelles pour toutes les familles actives.
// Logique : tarif personnalisé → sinon grille dégressiv par enfant × site.
// Idempotent : ne re-crée pas une facture déjà payée.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
import { monthlyForFamily, unitRateForFamilySize } from '@/lib/pricing'

const Schema = z.object({
  month: z.number().int().min(1).max(12),
  year:  z.number().int().min(2020).max(2100),
})

// ─── Types DB bruts ───────────────────────────────────────────────────────────

interface DBStudent {
  id: string
  first_name: string
  last_name: string
  status: string
  site_id: string | null
}

interface DBFamily {
  id: string
  user_id: string
  parent1_first: string
  parent1_last: string
  primary_site_id: string | null
  custom_monthly_rate: number | null
  is_active: boolean
  students: DBStudent[]
}

interface DBPricingRule {
  id: string
  site_id: string
  billing_type: 'per_session' | 'monthly_per_child' | 'monthly_family'
  price_per_session:  number | null
  price_1_child:      number | null
  price_2_children:   number | null
  price_3_children:   number | null
  price_4_children:   number | null
  price_5plus:        number | null
  is_active: boolean
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  // Finances : admin uniquement (matrice RLS)
  if (ctx.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'month et year requis (1-12, 2020-2100)' }, { status: 400 })
  }

  const { month, year } = parsed.data
  const admin = createAdminSupabaseClient()

  // ── 1. Familles actives avec leurs élèves actifs ───────────────────────────
  const { data: families, error: famErr } = await admin
    .from('families')
    .select(`
      id, user_id, parent1_first, parent1_last,
      primary_site_id, custom_monthly_rate, is_active,
      students (id, first_name, last_name, status, site_id)
    `)
    .eq('organization_id', ctx.organizationId)
    .eq('is_active', true)

  if (famErr) return NextResponse.json({ error: famErr.message }, { status: 500 })

  // ── 2. Tarifs actifs ───────────────────────────────────────────────────────
  const { data: rules, error: rulesErr } = await admin
    .from('pricing_rules')
    .select('id, site_id, billing_type, price_per_session, price_1_child, price_2_children, price_3_children, price_4_children, price_5plus, is_active')
    .eq('organization_id', ctx.organizationId)
    .eq('is_active', true)

  if (rulesErr) return NextResponse.json({ error: rulesErr.message }, { status: 500 })

  const rulesBySite = new Map<string, DBPricingRule>()
  for (const r of (rules ?? []) as DBPricingRule[]) {
    // On garde une seule règle par site (la plus récente — on suppose sorted par effective_from desc)
    if (!rulesBySite.has(r.site_id)) rulesBySite.set(r.site_id, r)
  }

  // ── 3. Factures existantes pour ce mois ───────────────────────────────────
  const { data: existingInvoices } = await admin
    .from('invoices')
    .select('id, family_id, status')
    .eq('organization_id', ctx.organizationId)
    .eq('period_month', month)
    .eq('period_year', year)

  const existingMap = new Map<string, { id: string; status: string }>()
  for (const inv of existingInvoices ?? []) {
    existingMap.set(inv.family_id, { id: inv.id, status: inv.status })
  }

  // ── 4. Générer une facture par famille ────────────────────────────────────
  const created: string[] = []
  const updated: string[] = []
  const skipped: string[] = []
  const errors: { familyId: string; error: string }[] = []

  for (const fam of (families ?? []) as DBFamily[]) {
    const existing = existingMap.get(fam.id)

    // Ne jamais toucher une facture déjà payée
    if (existing && (existing.status === 'paid' || existing.status === 'cancelled')) {
      skipped.push(fam.id)
      continue
    }

    // Élèves actifs ou essai
    const activeStudents = (fam.students ?? []).filter(
      (s) => s.status === 'active' || s.status === 'trial'
    )

    if (activeStudents.length === 0) {
      skipped.push(fam.id)
      continue
    }

    // Calcul du montant dû
    let amountDue = 0
    const lineItems: Array<{
      description: string
      student_name?: string
      quantity: number
      unit_price: number
      total: number
    }> = []

    if (fam.custom_monthly_rate !== null && fam.custom_monthly_rate > 0) {
      // Tarif personnalisé — override tout
      amountDue = Number(fam.custom_monthly_rate)
      lineItems.push({
        description: 'Tarif personnalisé famille',
        quantity: 1,
        unit_price: amountDue,
        total: amountDue,
      })
    } else {
      // Tarification par site
      const bySite = new Map<string, DBStudent[]>()
      for (const s of activeStudents) {
        const siteId = s.site_id ?? fam.primary_site_id ?? ''
        if (!siteId) continue
        const arr = bySite.get(siteId) ?? []
        arr.push(s)
        bySite.set(siteId, arr)
      }

      for (const [siteId, students] of bySite) {
        const rule = rulesBySite.get(siteId)
        if (!rule) {
          // Pas de tarif configuré pour ce site — on met 0 et on note
          lineItems.push({
            description: `Aucun tarif configuré pour ce site (${students.length} élève${students.length > 1 ? 's' : ''})`,
            quantity: students.length,
            unit_price: 0,
            total: 0,
          })
          continue
        }

        if (rule.billing_type === 'monthly_per_child') {
          const total = monthlyForFamily(rule, students.length)
          amountDue += total
          const priceEach = unitRateForFamilySize(rule, students.length).unit
          for (const s of students) {
            lineItems.push({
              description: `Cours d'anglais — ${new Date(year, month - 1, 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`,
              student_name: `${s.first_name} ${s.last_name}`,
              quantity: 1,
              unit_price: priceEach,
              total: priceEach,
            })
          }
        } else if (rule.billing_type === 'monthly_family') {
          const total = Number(rule.price_1_child ?? 0)
          amountDue += total
          lineItems.push({
            description: `Abonnement famille — ${new Date(year, month - 1, 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`,
            quantity: 1,
            unit_price: total,
            total,
          })
        }
        // per_session: not computed here (requires session count — future)
      }
    }

    // Numéro de facture
    const invoiceNumber = `FAC-${year}${String(month).padStart(2, '0')}-${fam.id.slice(0, 8).toUpperCase()}`

    // Due date = dernier jour du mois
    const dueDate = new Date(year, month, 0).toISOString().split('T')[0] as string

    try {
      if (existing) {
        // Mettre à jour (draft → pending avec nouveau montant)
        await admin
          .from('invoices')
          .update({
            amount_due: amountDue,
            line_items: lineItems,
            status: 'pending',
            due_date: dueDate,
          })
          .eq('id', existing.id)
        updated.push(fam.id)
      } else {
        // Créer
        await admin
          .from('invoices')
          .insert({
            organization_id: ctx.organizationId,
            // user_id NOT NULL jusqu'à la migration 019
            user_id:        ctx.user.id,
            family_id:      fam.id,
            site_id:        fam.primary_site_id,
            period_month:   month,
            period_year:    year,
            invoice_number: invoiceNumber,
            amount_due:     amountDue,
            amount_paid:    0,
            discount:       0,
            status:         'pending',
            due_date:       dueDate,
            line_items:     lineItems,
          })
        created.push(fam.id)
      }
    } catch (err) {
      errors.push({ familyId: fam.id, error: String(err) })
    }
  }

  return NextResponse.json({
    ok:      true,
    month,
    year,
    created: created.length,
    updated: updated.length,
    skipped: skipped.length,
    errors:  errors.length,
    details: errors.length > 0 ? errors : undefined,
  })
}
