'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Euro, Receipt, Download, ArrowRight, Printer, MessageCircle, Loader2,
} from 'lucide-react'
import { computeMonthlyAmount } from '@/lib/supabase/queries'
import type { Site, PricingRule, Invoice, InvoiceStatus, Family } from '@/types'
import { FadeIn } from '@/components/ui/FadeIn'
import { GenerateInvoicesButton } from './GenerateInvoicesButton'
import { useOrgRole } from '@/contexts/OrgRoleContext'

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

export function FinancesContent({ sites, pricingRules, invoices, revenueStats, currentYear, families }: Props) {
  // Finances : mutations admin-only (matrice RLS) — la page reste consultable
  const { isAdmin } = useOrgRole()
  const [tab, setTab] = useState<'dashboard' | 'factures' | 'tarifs'>('dashboard')
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all')
  const [filterSite, setFilterSite] = useState('all')
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null)
  const [sendingReminderAll, setSendingReminderAll] = useState(false)
  const [reminderResult, setReminderResult] = useState<{ sent: number; failed: number; simulated: boolean } | null>(null)

  // KPIs globaux
  const totalDue   = invoices.reduce((s, i) => s + i.amount_due,  0)
  const totalPaid  = invoices.reduce((s, i) => s + i.amount_paid, 0)
  const totalUnpaid = totalDue - totalPaid
  const overdueCount = invoices.filter(i => i.status === 'overdue').length
  const specialRateFamilies = useMemo(() => {
    return families
      .filter((family) => family.custom_monthly_rate !== null && family.custom_monthly_rate !== undefined)
      .sort((a, b) => {
        const siteA = sites.find((site) => site.id === a.primary_site_id)?.name ?? ''
        const siteB = sites.find((site) => site.id === b.primary_site_id)?.name ?? ''
        return siteA.localeCompare(siteB) || a.parent1_last.localeCompare(b.parent1_last)
      })
  }, [families, sites])
  const activeRuleBySite = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]!
    const map = new Map<string, PricingRule>()
    pricingRules
      .filter((rule) => rule.is_active && rule.effective_from <= today && (!rule.effective_until || rule.effective_until >= today))
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from))
      .forEach((rule) => {
        if (!map.has(rule.site_id)) map.set(rule.site_id, rule)
      })
    return map
  }, [pricingRules])
  const financeActions = [
    {
      title: 'Tarifs',
      text: pricingRules.length > 0 ? `${pricingRules.length} regle${pricingRules.length > 1 ? 's' : ''} configuree${pricingRules.length > 1 ? 's' : ''}` : 'Configurer les tarifs par site',
      done: pricingRules.length > 0,
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

  async function sendPaymentReminder(invoiceId: string) {
    setSendingReminderId(invoiceId)
    try {
      const res = await fetch('/api/whatsapp/payment-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur envoi relance')
      setReminderResult({ sent: data.sent ?? 0, failed: data.failed ?? 0, simulated: data.simulated ?? false })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'envoi de la relance')
    } finally {
      setSendingReminderId(null)
    }
  }

  async function sendAllReminders() {
    if (!confirm('Envoyer une relance WhatsApp à toutes les familles avec des factures impayées ou en retard ?')) return
    setSendingReminderAll(true)
    setReminderResult(null)
    try {
      const res = await fetch('/api/whatsapp/payment-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur envoi relances')
      setReminderResult({ sent: data.sent ?? 0, failed: data.failed ?? 0, simulated: data.simulated ?? false })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'envoi des relances')
    } finally {
      setSendingReminderAll(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-5 sm:px-6">
        <FadeIn>
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid lg:grid-cols-[1fr_380px]">
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-500">Direction financière</p>
                    <h1 className="mt-2 text-2xl font-semibold text-foreground">Pilotage des finances</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      Tarifs, situations particulières, facturation et paiements réunis dans un parcours de gestion unique.
                    </p>
                  </div>
                  {isAdmin && (
                    <Link href="/settings/tarification"
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                      <Euro className="h-4 w-4" /> Gérer les tarifs
                    </Link>
                  )}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <FinanceMetric label="Encaissé" value={`${totalPaid.toFixed(0)} €`} helper="paiements reçus" />
                  <FinanceMetric label="À encaisser" value={`${totalUnpaid.toFixed(0)} €`} helper="reste à percevoir" />
                  <FinanceMetric label="Retards" value={overdueCount} helper="factures critiques" />
                  <FinanceMetric label="Tarifs actifs" value={activeRuleBySite.size} helper={`${specialRateFamilies.length} famille${specialRateFamilies.length > 1 ? 's' : ''} aidée${specialRateFamilies.length > 1 ? 's' : ''}`} />
                </div>
              </div>
              <div className="border-t border-border bg-muted/30 p-5 sm:p-6 lg:border-l lg:border-t-0">
                <p className="text-sm font-semibold text-foreground">Centre d’attention</p>
                <div className="mt-3 grid gap-2">
              {financeActions.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setTab(item.tab)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
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
            </div>
          </section>
        </FadeIn>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-2">
          <div className="flex gap-1 rounded-lg bg-muted/40 p-1">
            {(['dashboard', 'factures', 'tarifs'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {t === 'dashboard' ? 'Vue d’ensemble' : t === 'factures' ? 'Factures' : 'Tarifs & aides'}
              </button>
            ))}
          </div>
            <button
              type="button"
              onClick={exportInvoicesCsv}
              disabled={invoices.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-accent disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Export factures CSV
            </button>
        </div>

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <FadeIn delay={0.05}>
              {invoices.length === 0 ? (
                <section className="grid gap-4 rounded-xl border border-dashed border-primary/30 bg-primary/[0.04] p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Prochaine étape</p>
                    <h2 className="mt-2 text-lg font-semibold text-foreground">Initialiser la facturation</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                      Les tarifs existent déjà. La prochaine étape consiste à générer les premières échéances pour transformer cette page en véritable suivi d’encaissement.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setTab('tarifs')} className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent">
                      Vérifier les tarifs
                    </button>
                    <button type="button" onClick={() => setTab('factures')} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                      Préparer les factures
                    </button>
                  </div>
                </section>
              ) : (
              <div className="rounded-xl border border-border bg-card p-6">
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
              )}
            </FadeIn>

            {/* Répartition par site */}
            <FadeIn delay={0.08}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {sites.map(site => {
                  const siteInvoices = invoices.filter(i => i.site_id === site.id)
                  const sitePaid = siteInvoices.reduce((s, i) => s + i.amount_paid, 0)
                  const siteDue  = siteInvoices.reduce((s, i) => s + i.amount_due,  0)
                  const rule = pricingRules.find(r => r.site_id === site.id && r.is_active)
                  return (
                    <div key={site.id} className="rounded-xl border border-border bg-card p-5">
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
                          {rule.price_1_child} € / mois / famille (forfait, quel que soit le nombre d&apos;enfants)
                        </p>
                      )}
                      {rule && rule.billing_type === 'monthly_per_child' && (
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
                {isAdmin && <GenerateInvoicesButton />}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={sendAllReminders}
                    disabled={sendingReminderAll || invoices.filter(i => ['pending','overdue','partial'].includes(i.status)).length === 0}
                    className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-40"
                  >
                    {sendingReminderAll
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <MessageCircle className="h-4 w-4" />}
                    Relancer les impayés
                  </button>
                )}
                {reminderResult && (
                  <span className={`text-xs font-medium px-2 py-1 rounded-lg ${reminderResult.simulated ? 'bg-blue-50 text-blue-700' : reminderResult.sent > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {reminderResult.simulated ? `Simulation: ${reminderResult.sent} envoyé(s)` : `${reminderResult.sent} relance(s) envoyée(s)${reminderResult.failed > 0 ? ` · ${reminderResult.failed} échec` : ''}`}
                  </span>
                )}
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
                        <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Relance</th>
                        <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">PDF</th>
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
                            <td className="px-5 py-4 text-center">
                              {['pending', 'overdue', 'partial'].includes(inv.status) ? (
                                <button
                                  type="button"
                                  onClick={() => sendPaymentReminder(inv.id)}
                                  disabled={sendingReminderId === inv.id}
                                  title="Envoyer une relance WhatsApp"
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-orange-500 hover:text-orange-700 hover:bg-orange-50 transition-colors disabled:opacity-50"
                                >
                                  {sendingReminderId === inv.id
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <MessageCircle className="w-4 h-4" />}
                                </button>
                              ) : (
                                <span className="text-[var(--color-text-muted)] text-xs">—</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <a
                                href={`/finances/invoice/${inv.id}/print`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Imprimer / Enregistrer en PDF"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-text-muted)] hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              >
                                <Printer className="w-4 h-4" />
                              </a>
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
            {isAdmin && (
              <FadeIn>
                <Link
                  href="/settings/tarification"
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 transition hover:bg-primary/10"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Configuration</p>
                    <h2 className="mt-1 text-lg font-semibold text-foreground">Créer ou modifier un tarif</h2>
                    <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                      Grilles par site (dégressif, séance, forfait) et tarifs spéciaux par famille se gèrent depuis Paramètres → Tarification.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
                    Ouvrir Tarification <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </FadeIn>
            )}

            <FadeIn delay={0.04}>
              <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Registre solidaire</p>
                    <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">Tarifs personnalises appliques</h2>
                    <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-muted)]">
                      Seules les familles listees ici beneficient de leur montant special. Toutes les autres restent au tarif normal du site concerne.
                    </p>
                  </div>
                  <div className="rounded-xl border border-violet-200 bg-white px-4 py-3 text-right">
                    <p className="text-2xl font-bold text-violet-700">{specialRateFamilies.length}</p>
                    <p className="text-xs font-medium text-violet-700">famille{specialRateFamilies.length > 1 ? 's' : ''} avec tarif special</p>
                  </div>
                </div>

                {specialRateFamilies.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-violet-200 bg-white/70 p-5 text-sm text-[var(--color-text-muted)]">
                    Aucun tarif personnalise pour le moment. Choisis une famille, indique le montant mensuel et elle apparaitra ici.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-violet-200 bg-white">
                    <div className="grid grid-cols-[1.25fr_0.9fr_0.8fr_1.2fr_0.75fr] gap-3 border-b border-violet-100 bg-violet-100/70 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-800">
                      <span>Famille</span>
                      <span>Site applique</span>
                      <span>Tarif special</span>
                      <span>Note interne</span>
                      <span className="text-right">Actions</span>
                    </div>
                    <div className="divide-y divide-violet-100">
                      {specialRateFamilies.map((family) => {
                        const site = sites.find((item) => item.id === family.primary_site_id)
                        const childrenCount = family.students?.filter((student) => student.status !== 'departed').length ?? 0
                        const normalRule = family.primary_site_id ? activeRuleBySite.get(family.primary_site_id) : null
                        const normalAmount = normalRule ? computeMonthlyAmount(normalRule, Math.max(childrenCount, 1)) : null
                        return (
                          <div key={family.id} className="grid grid-cols-[1.25fr_0.9fr_0.8fr_1.2fr_0.75fr] items-center gap-3 px-4 py-3 text-sm">
                            <div>
                              <p className="font-semibold text-[var(--color-text)]">{family.parent1_first} {family.parent1_last}</p>
                              <p className="text-xs text-[var(--color-text-muted)]">{childrenCount} enfant{childrenCount > 1 ? 's' : ''} rattache{childrenCount > 1 ? 's' : ''}</p>
                            </div>
                            <div>
                              <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                                {site?.name ?? 'Site non defini'}
                              </span>
                            </div>
                            <div>
                              <p className="text-base font-bold text-violet-700">{Number(family.custom_monthly_rate).toFixed(2)} EUR/mois</p>
                              {normalAmount !== null && (
                                <p className="text-xs text-[var(--color-text-muted)]">normal: {normalAmount.toFixed(0)} EUR/mois</p>
                              )}
                            </div>
                            <p className="line-clamp-2 text-xs text-[var(--color-text-muted)]">{family.custom_rate_note || 'Aucune note'}</p>
                            <div className="flex justify-end">
                              {isAdmin && (
                                <Link
                                  href="/settings/tarification"
                                  className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
                                >
                                  Gérer
                                </Link>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </FadeIn>

            <FadeIn>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {sites.map(site => {
                  const rules = pricingRules.filter(r => r.site_id === site.id)
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

                              {rule.billing_type === 'monthly_per_child' && (
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

                              {rule.billing_type === 'monthly_family' && (
                                <div className="flex items-center gap-2">
                                  <Euro className="h-4 w-4 text-emerald-600" />
                                  <span className="text-lg font-bold text-emerald-700">{rule.price_1_child} €</span>
                                  <span className="text-xs text-[var(--color-text-muted)]">/ mois / famille (forfait, quel que soit le nombre d&apos;enfants)</span>
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

function FinanceMetric({
  label,
  value,
  helper,
}: {
  label: string
  value: number | string
  helper: string
}) {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="truncate text-xl font-bold leading-none text-foreground">{value}</p>
        <p className="pb-0.5 text-right text-[11px] text-muted-foreground">{helper}</p>
      </div>
    </div>
  )
}

const selectCls = 'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30'
