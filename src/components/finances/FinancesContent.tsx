'use client'

import { useState, useMemo } from 'react'
import {
  Wallet, TrendingUp, AlertCircle, CheckCircle2, Clock,
  Euro, Receipt,
} from 'lucide-react'
import { computeMonthlyAmount } from '@/lib/supabase/queries'
import type { Site, PricingRule, Invoice, InvoiceStatus } from '@/types'
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

export function FinancesContent({ sites, pricingRules, invoices, revenueStats, currentYear }: Props) {
  const [tab, setTab] = useState<'dashboard' | 'factures' | 'tarifs'>('dashboard')
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all')
  const [filterSite, setFilterSite] = useState('all')

  // KPIs globaux
  const totalDue   = invoices.reduce((s, i) => s + i.amount_due,  0)
  const totalPaid  = invoices.reduce((s, i) => s + i.amount_paid, 0)
  const totalUnpaid = totalDue - totalPaid
  const overdueCount = invoices.filter(i => i.status === 'overdue').length
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
                  const rule = pricingRules.find(r => r.site_id === site.id && r.is_active)
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

const selectCls = 'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30'
