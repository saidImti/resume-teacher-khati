'use client'

import { useState, useMemo } from 'react'
import {
  Wallet, TrendingUp, AlertCircle, CheckCircle2, Clock,
  Euro, Receipt, Download, Plus, Save, Users,
} from 'lucide-react'
import { computeMonthlyAmount } from '@/lib/supabase/queries'
import type { Site, PricingRule, Invoice, InvoiceStatus, Family } from '@/types'
import { FadeIn } from '@/components/ui/FadeIn'

interface RevenueRow {
  period_month: number
  amount_due: number
  amount_paid: number
  status: string
  site: { name: string; color: string }[] | null
}

interface Props {
  sites: Site[]
  pricingRules: PricingRule[]
  invoices: Invoice[]
  revenueStats: RevenueRow[]
  currentYear: number
  families: Family[]
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  paid:      { label: 'Payé',       bg: 'bg-emerald-50 ring-emerald-200', color: 'text-emerald-700' },
  pending:   { label: 'En attente', bg: 'bg-amber-50 ring-amber-200',     color: 'text-amber-700'   },
  overdue:   { label: 'En retard',  bg: 'bg-red-50 ring-red-200',         color: 'text-red-700'     },
  partial:   { label: 'Partiel',    bg: 'bg-orange-50 ring-orange-200',   color: 'text-orange-700'  },
  cancelled: { label: 'Annulé',     bg: 'bg-slate-100 ring-slate-200',    color: 'text-slate-500'   },
  draft:     { label: 'Brouillon',  bg: 'bg-slate-100 ring-slate-200',    color: 'text-slate-400'   },
}

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

const BILLING_LABELS: Record<string, string> = {
  per_session:       'Par séance',
  monthly_per_child: 'Mensuel / enfant',
  monthly_family:    'Mensuel / famille',
}

type PricingForm = {
  site_id: string
  name: string
  billing_type: PricingRule['billing_type']
  price_per_session: string
  price_1_child: string
  price_2_children: string
  price_3_children: string
  price_4_children: string
  price_5plus: string
  effective_from: string
  effective_until: string
  is_active: boolean
  notes: string
}

type FamilyRateForm = {
  family_id: string
  primary_site_id: string
  custom_monthly_rate: string
  custom_rate_note: string
}

export function FinancesContent({ sites, pricingRules, invoices, revenueStats, currentYear, families }: Props) {
  const [tab, setTab] = useState<'dashboard' | 'factures' | 'tarifs'>('dashboard')
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all')
  const [filterSite, setFilterSite] = useState('all')
  const [localPricingRules, setLocalPricingRules] = useState(pricingRules)
  const [localFamilies, setLocalFamilies] = useState(families)
  const [savingPricing, setSavingPricing] = useState(false)
  const [savingFamilyRate, setSavingFamilyRate] = useState(false)
  const [pricingForm, setPricingForm] = useState<PricingForm>({
    site_id: sites[0]?.id ?? '',
    name: `Tarif ${sites[0]?.name ?? 'site'} ${currentYear}`,
    billing_type: 'monthly_family',
    price_per_session: '',
    price_1_child: '45',
    price_2_children: '40',
    price_3_children: '35',
    price_4_children: '30',
    price_5plus: '25',
    effective_from: new Date().toISOString().split('T')[0]!,
    effective_until: '',
    is_active: true,
    notes: '',
  })
  const [familyRateForm, setFamilyRateForm] = useState<FamilyRateForm>({
    family_id: families[0]?.id ?? '',
    primary_site_id: families[0]?.primary_site_id ?? sites[0]?.id ?? '',
    custom_monthly_rate: families[0]?.custom_monthly_rate?.toString() ?? '',
    custom_rate_note: families[0]?.custom_rate_note ?? '',
  })

  // KPIs globaux
  const totalDue   = invoices.reduce((s, i) => s + i.amount_due,  0)
  const totalPaid  = invoices.reduce((s, i) => s + i.amount_paid, 0)
  const totalUnpaid = totalDue - totalPaid
  const overdueCount = invoices.filter(i => i.status === 'overdue').length
  const financeActions = [
    {
      title: 'Tarifs',
      text: localPricingRules.length > 0 ? `${localPricingRules.length} regle${localPricingRules.length > 1 ? 's' : ''} configuree${localPricingRules.length > 1 ? 's' : ''}` : 'Configurer les tarifs par site',
      done: localPricingRules.length > 0,
      tab: 'tarifs' as const,
    },
    {
      title: 'Factures',
      text: invoices.length > 0 ? `${invoices.length} facture${invoices.length > 1 ? 's' : ''} suivie${invoices.length > 1 ? 's' : ''}` : 'Preparer le suivi des familles',
      done: invoices.length > 0,
      tab: 'factures' as const,
    },
    {
      title: 'Retards',
      text: overdueCount > 0 ? `${overdueCount} facture${overdueCount > 1 ? 's' : ''} a relancer` : 'Aucun retard critique',
      done: overdueCount === 0,
      tab: 'factures' as const,
    },
  ]

  // Revenus par mois (pour le graphique)
  const monthlyRevenue = useMemo(() => {
    const map: Record<number, { due: number; paid: number }> = {}
    revenueStats.forEach(r => {
      const m = r.period_month
      if (!map[m]) map[m] = { due: 0, paid: 0 }
      map[m]!.due  += Number(r.amount_due)
      map[m]!.paid += Number(r.amount_paid)
    })
    return Array.from({ length: 12 }, (_, i) => ({
      month: MONTH_NAMES[i]!,
      due:   map[i + 1]?.due  ?? 0,
      paid:  map[i + 1]?.paid ?? 0,
    }))
  }, [revenueStats])

  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.due), 1)

  // Filtrage factures
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchStatus = filterStatus === 'all' || inv.status === filterStatus
      const matchSite   = filterSite   === 'all' || inv.site_id === filterSite
      return matchStatus && matchSite
    })
  }, [invoices, filterStatus, filterSite])

  function exportInvoicesCsv() {
    const rows = filteredInvoices.map((invoice) => ({
      famille: invoice.family ? `${invoice.family.parent1_first} ${invoice.family.parent1_last}` : 'Famille inconnue',
      numero: invoice.invoice_number ?? '',
      periode: `${invoice.period_month}/${invoice.period_year}`,
      site: invoice.site?.name ?? '',
      montant: invoice.amount_due.toFixed(2),
      paye: invoice.amount_paid.toFixed(2),
      reste: (invoice.amount_due - invoice.amount_paid).toFixed(2),
      statut: STATUS_CONFIG[invoice.status]?.label ?? invoice.status,
    }))
    const headers = ['famille', 'numero', 'periode', 'site', 'montant', 'paye', 'reste', 'statut']
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => {
        const value = String(row[header as keyof typeof row] ?? '')
        return `"${value.replace(/"/g, '""')}"`
      }).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `factures-${currentYear}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function createPricingRule(event: React.FormEvent) {
    event.preventDefault()
    setSavingPricing(true)
    try {
      const res = await fetch('/api/pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: pricingForm.site_id,
          name: pricingForm.name,
          billing_type: pricingForm.billing_type,
          price_per_session: pricingForm.price_per_session,
          price_1_child: pricingForm.price_1_child,
          price_2_children: pricingForm.price_2_children,
          price_3_children: pricingForm.price_3_children,
          price_4_children: pricingForm.price_4_children,
          price_5plus: pricingForm.price_5plus,
          effective_from: pricingForm.effective_from,
          effective_until: pricingForm.effective_until || null,
          is_active: pricingForm.is_active,
          notes: pricingForm.notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Impossible de créer le tarif')
      setLocalPricingRules((current) => [data as PricingRule, ...current])
      setPricingForm((current) => ({
        ...current,
        name: `Tarif ${sites.find((site) => site.id === current.site_id)?.name ?? 'site'} ${currentYear}`,
        notes: '',
      }))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur lors de la création du tarif')
    } finally {
      setSavingPricing(false)
    }
  }

  async function saveFamilyRate(event: React.FormEvent) {
    event.preventDefault()
    if (!familyRateForm.family_id) return
    setSavingFamilyRate(true)
    try {
      const res = await fetch(`/api/families/${familyRateForm.family_id}/rate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_site_id: familyRateForm.primary_site_id || null,
          custom_monthly_rate: familyRateForm.custom_monthly_rate,
          custom_rate_note: familyRateForm.custom_rate_note || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Impossible de modifier le tarif famille')
      setLocalFamilies((current) => current.map((family) => family.id === data.id ? data as Family : family))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur lors de la modification famille')
    } finally {
      setSavingFamilyRate(false)
    }
  }

  function selectFamilyForRate(familyId: string) {
    const family = localFamilies.find((item) => item.id === familyId)
    setFamilyRateForm({
      family_id: familyId,
      primary_site_id: family?.primary_site_id ?? sites[0]?.id ?? '',
      custom_monthly_rate: family?.custom_monthly_rate?.toString() ?? '',
      custom_rate_note: family?.custom_rate_note ?? '',
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--color-text)]">Finances</h1>
              <p className="text-sm text-[var(--color-text-muted)]">Tarifs · Facturation · Paiements — {currentYear}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1">
            {(['dashboard', 'factures', 'tarifs'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-all ${
                  tab === t
                    ? 'bg-[var(--color-surface)] text-emerald-600 shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {t === 'dashboard' ? 'Vue d\'ensemble' : t === 'factures' ? 'Factures' : 'Tarifs'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl w-full px-6 py-6">
        <div className="mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-600">Pilotage financier</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">Ce qu'il faut surveiller</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Un espace premium doit guider les relances, pas seulement afficher des chiffres.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {financeActions.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setTab(item.tab)}
                  className={`rounded-xl border px-4 py-3 text-left transition hover:-translate-y-0.5 ${
                    item.done
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs opacity-80">{item.text}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportInvoicesCsv}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
            >
              <Download className="h-4 w-4" />
              Export factures CSV
            </button>
          </div>
        </div>

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <FadeIn>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <KpiCard
                  label="Encaissé"
                  value={`${totalPaid.toFixed(0)} €`}
                  sub="total paiements reçus"
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  color="emerald"
                />
                <KpiCard
                  label="À encaisser"
                  value={`${totalUnpaid.toFixed(0)} €`}
                  sub="solde restant dû"
                  icon={<Clock className="h-5 w-5" />}
                  color="amber"
                />
                <KpiCard
                  label="En retard"
                  value={`${overdueCount}`}
                  sub={overdueCount > 1 ? 'factures impayees' : 'facture impayee'}
                  icon={<AlertCircle className="h-5 w-5" />}
                  color="red"
                />
                <KpiCard
                  label="Total facturé"
                  value={`${totalDue.toFixed(0)} €`}
                  sub={`${invoices.length} factures`}
                  icon={<TrendingUp className="h-5 w-5" />}
                  color="blue"
                />
              </div>
            </FadeIn>

            {/* Graphique mensuel */}
            <FadeIn delay={0.05}>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <h2 className="mb-6 text-sm font-semibold text-[var(--color-text)]">
                  Revenus mensuels {currentYear}
                </h2>
                <div className="flex items-end gap-2 h-40">
                  {monthlyRevenue.map((m, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="relative w-full flex flex-col items-center justify-end" style={{ height: '120px' }}>
                        {/* Barre payé */}
                        <div
                          className="w-full rounded-t-lg bg-emerald-500 transition-all"
                          style={{ height: `${(m.paid / maxRevenue) * 100}%`, minHeight: m.paid > 0 ? '4px' : '0' }}
                          title={`Payé: ${m.paid.toFixed(0)} €`}
                        />
                        {/* Barre dû (overlay transparent) */}
                        {m.due > m.paid && (
                          <div
                            className="absolute bottom-0 w-full rounded-t-lg bg-emerald-200 -z-10"
                            style={{ height: `${(m.due / maxRevenue) * 100}%` }}
                            title={`Facturé: ${m.due.toFixed(0)} €`}
                          />
                        )}
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)]">{m.month}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                  <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-emerald-500" />Encaissé</div>
                  <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-emerald-200" />Facturé</div>
                </div>
              </div>
            </FadeIn>

            {/* Répartition par site */}
            <FadeIn delay={0.08}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {sites.map(site => {
                  const siteInvoices = invoices.filter(i => i.site_id === site.id)
                  const sitePaid = siteInvoices.reduce((s, i) => s + i.amount_paid, 0)
                  const siteDue  = siteInvoices.reduce((s, i) => s + i.amount_due,  0)
                  const rule = localPricingRules.find(r => r.site_id === site.id && r.is_active)
                  return (
                    <div key={site.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-[var(--color-text)]">{site.name}</h3>
                        {rule && (
                          <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg)] rounded-lg px-2 py-1 border border-[var(--color-border)]">
                            {BILLING_LABELS[rule.billing_type]}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-[var(--color-text-muted)]">Encaissé</p>
                          <p className="text-xl font-bold text-emerald-600">{sitePaid.toFixed(0)} €</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--color-text-muted)]">Facturé</p>
                          <p className="text-xl font-bold text-[var(--color-text)]">{siteDue.toFixed(0)} €</p>
                        </div>
                      </div>
                      {rule && rule.billing_type === 'per_session' && (
                        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
                          Tarif : {rule.price_per_session} €/séance/enfant
                        </p>
                      )}
                      {rule && rule.billing_type === 'monthly_family' && (
                        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
                          1 enfant: {rule.price_1_child} € · 2: {rule.price_2_children} € · 3: {rule.price_3_children} € / mois
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </FadeIn>
          </div>
        )}

        {/* ── FACTURES ── */}
        {tab === 'factures' && (
          <div className="space-y-5">
            <FadeIn>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as InvoiceStatus | 'all')}
                  className={selectCls}
                >
                  <option value="all">Tous statuts</option>
                  <option value="paid">Payé</option>
                  <option value="pending">En attente</option>
                  <option value="overdue">En retard</option>
                  <option value="partial">Partiel</option>
                  <option value="draft">Brouillon</option>
                  <option value="cancelled">Annulé</option>
                </select>
                <select
                  value={filterSite}
                  onChange={e => setFilterSite(e.target.value)}
                  className={selectCls}
                >
                  <option value="all">Tous sites</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <span className="ml-auto text-sm text-[var(--color-text-muted)]">
                  {filteredInvoices.length} facture{filteredInvoices.length > 1 ? 's' : ''}
                </span>
              </div>
            </FadeIn>

            <FadeIn delay={0.04}>
              {filteredInvoices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-20 text-center">
                  <Receipt className="mx-auto mb-3 h-10 w-10 text-[var(--color-text-muted)]" />
                  <p className="text-sm font-medium text-[var(--color-text)]">Aucune facture trouvée</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Famille</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hidden sm:table-cell">Période</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hidden md:table-cell">Site</th>
                        <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Montant</th>
                        <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Payé</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {filteredInvoices.map(inv => {
                        const st = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.pending
                        const balance = inv.amount_due - inv.amount_paid
                        return (
                          <tr key={inv.id} className="hover:bg-[var(--color-bg)] transition-colors">
                            <td className="px-5 py-4">
                              <p className="text-sm font-medium text-[var(--color-text)]">
                                {inv.family
                                  ? `${inv.family.parent1_first} ${inv.family.parent1_last}`
                                  : 'Famille inconnue'}
                              </p>
                              {inv.invoice_number && (
                                <p className="text-xs text-[var(--color-text-muted)]">{inv.invoice_number}</p>
                              )}
                            </td>
                            <td className="px-5 py-4 hidden sm:table-cell">
                              <span className="text-sm text-[var(--color-text-muted)]">
                                {MONTH_NAMES[inv.period_month - 1]} {inv.period_year}
                              </span>
                            </td>
                            <td className="px-5 py-4 hidden md:table-cell">
                              <span className="text-sm text-[var(--color-text-muted)]">
                                {inv.site?.name ?? '—'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <span className="text-sm font-semibold text-[var(--color-text)]">
                                {inv.amount_due.toFixed(2)} €
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div>
                                <span className={`text-sm font-semibold ${balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  {inv.amount_paid.toFixed(2)} €
                                </span>
                                {balance > 0 && (
                                  <p className="text-xs text-red-500">reste {balance.toFixed(2)} €</p>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${(st ?? STATUS_CONFIG.pending)!.bg} ${(st ?? STATUS_CONFIG.pending)!.color}`}>
                                {(st ?? STATUS_CONFIG.pending)!.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </FadeIn>
          </div>
        )}

        {/* ── TARIFS ── */}
        {tab === 'tarifs' && (
          <div className="space-y-5">
            <FadeIn>
              <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                <form onSubmit={createPricingRule} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Nouvelle grille</p>
                      <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">Créer un tarif par site</h2>
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        Par séance, mensuel par enfant ou mensuel famille avec dégressivité.
                      </p>
                    </div>
                    <Plus className="h-5 w-5 text-emerald-600" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Site">
                      <select
                        value={pricingForm.site_id}
                        onChange={(e) => {
                          const siteName = sites.find((site) => site.id === e.target.value)?.name ?? 'site'
                          setPricingForm((current) => ({ ...current, site_id: e.target.value, name: `Tarif ${siteName} ${currentYear}` }))
                        }}
                        className={selectCls}
                        required
                      >
                        {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Nom du tarif">
                      <input value={pricingForm.name} onChange={(e) => setPricingForm((current) => ({ ...current, name: e.target.value }))} className={inputCls} required />
                    </Field>
                    <Field label="Type de facturation">
                      <select
                        value={pricingForm.billing_type}
                        onChange={(e) => setPricingForm((current) => ({ ...current, billing_type: e.target.value as PricingRule['billing_type'] }))}
                        className={selectCls}
                      >
                        <option value="monthly_family">Mensuel famille dégressif</option>
                        <option value="monthly_per_child">Mensuel par enfant</option>
                        <option value="per_session">Par séance</option>
                      </select>
                    </Field>
                    <Field label="Actif dès le">
                      <input type="date" value={pricingForm.effective_from} onChange={(e) => setPricingForm((current) => ({ ...current, effective_from: e.target.value }))} className={inputCls} required />
                    </Field>
                  </div>

                  {pricingForm.billing_type === 'per_session' ? (
                    <div className="mt-4">
                      <Field label="Prix par séance et par enfant">
                        <input type="number" min="0" step="0.01" value={pricingForm.price_per_session} onChange={(e) => setPricingForm((current) => ({ ...current, price_per_session: e.target.value }))} placeholder="ex. 12" className={inputCls} />
                      </Field>
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-5">
                      {([
                        ['price_1_child', '1 enfant'],
                        ['price_2_children', '2 enfants'],
                        ['price_3_children', '3 enfants'],
                        ['price_4_children', '4 enfants'],
                        ['price_5plus', '5+'],
                      ] as Array<[keyof Pick<PricingForm, 'price_1_child' | 'price_2_children' | 'price_3_children' | 'price_4_children' | 'price_5plus'>, string]>).map(([key, label]) => (
                        <Field key={key} label={label}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={pricingForm[key]}
                            onChange={(e) => setPricingForm((current) => ({ ...current, [key]: e.target.value }))}
                            className={inputCls}
                          />
                        </Field>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Fin de validité">
                      <input type="date" value={pricingForm.effective_until} onChange={(e) => setPricingForm((current) => ({ ...current, effective_until: e.target.value }))} className={inputCls} />
                    </Field>
                    <label className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)]">
                      <input type="checkbox" checked={pricingForm.is_active} onChange={(e) => setPricingForm((current) => ({ ...current, is_active: e.target.checked }))} />
                      Tarif actif
                    </label>
                  </div>

                  <Field label="Notes et conditions">
                    <textarea value={pricingForm.notes} onChange={(e) => setPricingForm((current) => ({ ...current, notes: e.target.value }))} rows={3} placeholder="Ex. Tarif solidaire, valable pour l'année, remise fratrie..." className={inputCls} />
                  </Field>

                  <button type="submit" disabled={savingPricing || !pricingForm.site_id} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                    <Save className="h-4 w-4" />
                    {savingPricing ? 'Création...' : 'Créer le tarif'}
                  </button>
                </form>

                <form onSubmit={saveFamilyRate} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                  <div className="mb-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">Cas particulier</p>
                    <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">Tarif personnalisé famille</h2>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      Pour une famille en difficulté, fixe un montant mensuel spécial et documente la raison.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Field label="Famille">
                      <select value={familyRateForm.family_id} onChange={(e) => selectFamilyForRate(e.target.value)} className={selectCls}>
                        <option value="">Choisir une famille</option>
                        {localFamilies.map((family) => (
                          <option key={family.id} value={family.id}>{family.parent1_first} {family.parent1_last}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Site principal">
                      <select value={familyRateForm.primary_site_id} onChange={(e) => setFamilyRateForm((current) => ({ ...current, primary_site_id: e.target.value }))} className={selectCls}>
                        <option value="">Aucun site</option>
                        {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Montant mensuel personnalisé">
                      <input type="number" min="0" step="0.01" value={familyRateForm.custom_monthly_rate} onChange={(e) => setFamilyRateForm((current) => ({ ...current, custom_monthly_rate: e.target.value }))} placeholder="ex. 20" className={inputCls} />
                    </Field>
                    <Field label="Justification / note interne">
                      <textarea value={familyRateForm.custom_rate_note} onChange={(e) => setFamilyRateForm((current) => ({ ...current, custom_rate_note: e.target.value }))} rows={4} placeholder="Ex. Tarif solidaire jusqu'à décembre, situation temporaire..." className={inputCls} />
                    </Field>
                  </div>

                  <button type="submit" disabled={savingFamilyRate || !familyRateForm.family_id} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60">
                    <Users className="h-4 w-4" />
                    {savingFamilyRate ? 'Enregistrement...' : 'Enregistrer la famille'}
                  </button>
                </form>
              </div>
            </FadeIn>

            <FadeIn>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {sites.map(site => {
                  const rules = localPricingRules.filter(r => r.site_id === site.id)
                    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))
                  return (
                    <div key={site.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-[var(--color-text)]">{site.name}</h3>
                        <span className="text-xs text-[var(--color-text-muted)]">{rules.length} règle{rules.length > 1 ? 's' : ''}</span>
                      </div>

                      {rules.length === 0 ? (
                        <p className="text-sm text-[var(--color-text-muted)]">Aucun tarif configuré pour ce site.</p>
                      ) : (
                        <div className="space-y-3">
                          {rules.map(rule => (
                            <div
                              key={rule.id}
                              className={`rounded-xl border p-4 ${rule.is_active ? 'border-emerald-200 bg-emerald-50/50' : 'border-[var(--color-border)] opacity-60'}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-[var(--color-text)]">{rule.name}</p>
                                {rule.is_active && (
                                  <span className="text-xs text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">Actif</span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                                {BILLING_LABELS[rule.billing_type]} · depuis {new Date(rule.effective_from).toLocaleDateString('fr-FR')}
                                {rule.effective_until && ` → ${new Date(rule.effective_until).toLocaleDateString('fr-FR')}`}
                              </p>

                              {rule.billing_type === 'per_session' && (
                                <div className="flex items-center gap-2">
                                  <Euro className="h-4 w-4 text-emerald-600" />
                                  <span className="text-lg font-bold text-emerald-700">{rule.price_per_session} €</span>
                                  <span className="text-xs text-[var(--color-text-muted)]">/ séance / enfant</span>
                                </div>
                              )}

                              {(rule.billing_type === 'monthly_family' || rule.billing_type === 'monthly_per_child') && (
                                <div className="grid grid-cols-5 gap-2 text-center">
                                  {[
                                    { n: '1 enf.', v: rule.price_1_child },
                                    { n: '2 enf.', v: rule.price_2_children },
                                    { n: '3 enf.', v: rule.price_3_children },
                                    { n: '4 enf.', v: rule.price_4_children },
                                    { n: '5+',     v: rule.price_5plus },
                                  ].map(({ n, v }) => (
                                    <div key={n} className="rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] py-2">
                                      <p className="text-xs text-[var(--color-text-muted)]">{n}</p>
                                      <p className="text-sm font-bold text-[var(--color-text)]">
                                        {v != null ? `${v}€` : '—'}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {rule.billing_type === 'monthly_family' && rule.price_2_children && (
                                <div className="mt-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] p-3">
                                  <p className="text-xs text-[var(--color-text-muted)] mb-2 font-medium">Simulation mensuelle</p>
                                  {[1, 2, 3, 4].map(n => (
                                    <div key={n} className="flex justify-between text-xs py-0.5">
                                      <span className="text-[var(--color-text-muted)]">{n} enfant{n > 1 ? 's' : ''}</span>
                                      <span className="font-semibold text-[var(--color-text)]">
                                        {computeMonthlyAmount(rule, n).toFixed(0)} €/mois
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {rule.notes && (
                                <p className="mt-2 text-xs text-[var(--color-text-muted)] italic">{rule.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </FadeIn>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub: string; icon: React.ReactNode; color: string
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50 text-amber-600',
    red:     'bg-red-50 text-red-600',
    blue:    'bg-blue-50 text-blue-600',
  }
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-[var(--color-text)]">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-[var(--color-text)]">{label}</p>
      <p className="text-xs text-[var(--color-text-muted)]">{sub}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>
      {children}
    </label>
  )
}

const selectCls = 'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30'
const inputCls = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30'
