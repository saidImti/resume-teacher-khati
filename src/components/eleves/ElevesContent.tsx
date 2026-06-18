'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  BadgeEuro,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Download,
  Search,
  Save,
  ShieldAlert,
  UserPlus,
  Users,
  WalletCards,
  X,
  Loader2,
} from 'lucide-react'
import { buildSchoolRegister, type RegisterPaymentStatus, type SchoolRegisterRow } from '@/lib/school-register'
import type { Family, Invoice, PricingRule, Site, Student, StudentStats } from '@/types'
import { FadeIn } from '@/components/ui/FadeIn'

interface Props {
  sites: Site[]
  students: Student[]
  stats: StudentStats | null
  families: Family[]
  pricingRules: PricingRule[]
  invoices: Invoice[]
  currentMonth: number
  currentYear: number
}

const PAYMENT_STATUS: Record<RegisterPaymentStatus, {
  label: string
  detail: string
  className: string
}> = {
  overdue: {
    label: 'En retard',
    detail: 'Relance prioritaire',
    className: 'bg-red-50 text-red-700 ring-red-200',
  },
  partial: {
    label: 'Paiement partiel',
    detail: 'Solde restant',
    className: 'bg-orange-50 text-orange-700 ring-orange-200',
  },
  pending: {
    label: 'À encaisser',
    detail: 'Facture en attente',
    className: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  missing_invoice: {
    label: 'À facturer',
    detail: 'Aucune facture ce mois',
    className: 'bg-violet-50 text-violet-700 ring-violet-200',
  },
  no_pricing: {
    label: 'Tarif manquant',
    detail: 'Grille à configurer',
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
  },
  paid: {
    label: 'Payé',
    detail: 'Situation à jour',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  no_charge: {
    label: 'Sans échéance',
    detail: 'Aucun montant dû',
    className: 'bg-slate-100 text-slate-500 ring-slate-200',
  },
}

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

export function ElevesContent({
  sites,
  students,
  stats,
  families,
  pricingRules,
  invoices,
  currentMonth,
  currentYear,
}: Props) {
  const [search, setSearch] = useState('')
  const [filterSite, setFilterSite] = useState('all')
  const [filterPayment, setFilterPayment] = useState<RegisterPaymentStatus | 'all' | 'attention'>('all')
  const [managedRowId, setManagedRowId] = useState<string | null>(null)
  const [savingAction, setSavingAction] = useState<string | null>(null)
  const [localFamilies, setLocalFamilies] = useState(families)
  const [localInvoices, setLocalInvoices] = useState(invoices)

  const register = useMemo(() => buildSchoolRegister({
    families: localFamilies,
    students,
    pricingRules,
    invoices: localInvoices,
    sites,
    month: currentMonth,
    year: currentYear,
  }), [localFamilies, students, pricingRules, localInvoices, sites, currentMonth, currentYear])

  const filtered = useMemo(() => register.filter(row => {
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || [
      row.familyName,
      row.parentPhone ?? '',
      row.parentEmail ?? '',
      ...row.students.flatMap(student => [
        student.first_name,
        student.last_name,
        student.level?.name ?? '',
        student.enrollments
          ?.filter(enrollment => enrollment.status === 'active' || enrollment.status === 'trial')
          .map(enrollment => enrollment.group?.name ?? '')
          .join(' ') ?? '',
      ]),
    ].join(' ').toLowerCase().includes(q)
    const matchesSite = filterSite === 'all' || row.siteIds.includes(filterSite)
    const matchesPayment = filterPayment === 'all'
      || (filterPayment === 'attention'
        ? row.priority <= 5
        : row.paymentStatus === filterPayment)
    return matchesSearch && matchesSite && matchesPayment
  }), [register, search, filterSite, filterPayment])

  const totals = useMemo(() => ({
    expected: register.reduce((sum, row) => sum + row.expectedMonthly, 0),
    invoiced: register.reduce((sum, row) => sum + row.invoiced, 0),
    paid: register.reduce((sum, row) => sum + row.paid, 0),
    remaining: register.reduce((sum, row) => sum + row.remaining, 0),
    attention: register.filter(row => row.priority <= 5).length,
    paidFamilies: register.filter(row => row.paymentStatus === 'paid').length,
    specialRates: register.filter(row => row.hasSpecialRate).length,
  }), [register])

  const collectionRate = totals.invoiced > 0
    ? Math.round((totals.paid / totals.invoiced) * 100)
    : 0
  const activeStudents = stats ? stats.active + stats.trial : students.filter(student =>
    student.status === 'active' || student.status === 'trial'
  ).length
  const managedRow = register.find(row => row.id === managedRowId) ?? null

  function exportRegisterCsv() {
    const headers = [
      'priorite', 'famille', 'parent', 'telephone', 'email', 'eleves', 'sites',
      'tarif_mensuel', 'tarif_special', 'facture', 'paye', 'reste', 'statut',
    ]
    const rows = filtered.map(row => ({
      priorite: row.priority,
      famille: row.family?.parent1_last ?? 'Sans famille',
      parent: row.familyName,
      telephone: row.parentPhone ?? '',
      email: row.parentEmail ?? '',
      eleves: row.students.map(student => `${student.first_name} ${student.last_name}`).join(' | '),
      sites: row.siteNames.join(' | '),
      tarif_mensuel: row.expectedMonthly.toFixed(2),
      tarif_special: row.hasSpecialRate ? 'Oui' : 'Non',
      facture: row.invoiced.toFixed(2),
      paye: row.paid.toFixed(2),
      reste: row.remaining.toFixed(2),
      statut: PAYMENT_STATUS[row.paymentStatus].label,
    }))
    const csv = [
      headers.join(','),
      ...rows.map(row => headers.map(header => {
        const value = String(row[header as keyof typeof row] ?? '')
        return `"${value.replace(/"/g, '""')}"`
      }).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `registre-familles-${currentYear}-${String(currentMonth).padStart(2, '0')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function saveSpecialRate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!managedRow?.family) return
    const form = new FormData(event.currentTarget)
    setSavingAction('rate')
    try {
      const response = await fetch(`/api/families/${managedRow.family.id}/rate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_site_id: managedRow.family.primary_site_id ?? managedRow.siteIds[0] ?? null,
          custom_monthly_rate: form.get('custom_monthly_rate'),
          custom_rate_note: String(form.get('custom_rate_note') ?? '') || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Impossible de modifier le tarif')
      setLocalFamilies(current => current.map(family =>
        family.id === data.id ? data as Family : family
      ))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur tarif')
    } finally {
      setSavingAction(null)
    }
  }

  function upsertLocalInvoice(invoice: Invoice) {
    setLocalInvoices(current => {
      const exists = current.some(item => item.id === invoice.id)
      return exists
        ? current.map(item => item.id === invoice.id ? invoice : item)
        : [invoice, ...current]
    })
  }

  async function createInvoice(periodMonth: number, periodYear: number): Promise<Invoice | null> {
    if (!managedRow?.family) return null
    setSavingAction('invoice')
    try {
      const response = await fetch('/api/invoices/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: managedRow.family.id,
          site_id: managedRow.family.primary_site_id ?? managedRow.siteIds[0] ?? null,
          period_month: periodMonth,
          period_year: periodYear,
          amount_due: managedRow.expectedMonthly,
          notes: `Échéance mensuelle ${MONTHS[periodMonth - 1]} ${periodYear}`,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Impossible de créer la facture')
      upsertLocalInvoice(data as Invoice)
      return data as Invoice
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur facture')
      return null
    } finally {
      setSavingAction(null)
    }
  }

  async function savePayment(invoiceId: string, amount: number, method: string, paymentDate: string, reference = '') {
    if (!managedRow?.family) return null
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        family_id: managedRow.family.id,
        invoice_id: invoiceId,
        amount,
        method,
        payment_date: paymentDate,
        reference: reference || null,
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? 'Impossible d’enregistrer le paiement')
    upsertLocalInvoice(data.invoice as Invoice)
    return data.invoice as Invoice
  }

  async function recordPayment(event: React.FormEvent<HTMLFormElement>, invoiceId: string) {
    event.preventDefault()
    if (!managedRow?.family || !invoiceId) return
    const form = new FormData(event.currentTarget)
    setSavingAction('payment')
    try {
      await savePayment(
        invoiceId,
        Number(form.get('amount')),
        String(form.get('method')),
        String(form.get('payment_date')),
        String(form.get('reference') ?? '')
      )
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur paiement')
    } finally {
      setSavingAction(null)
    }
  }

  async function setMonthlySituation(
    month: number,
    year: number,
    situation: 'paid' | 'pending' | 'overdue'
  ) {
    if (!managedRow?.family) return
    setSavingAction(`month-${year}-${month}`)
    try {
      let invoice = localInvoices.find(item =>
        item.family_id === managedRow.family?.id &&
        item.period_month === month &&
        item.period_year === year &&
        item.status !== 'cancelled'
      ) ?? null
      if (!invoice) invoice = await createInvoice(month, year)
      if (!invoice) return

      if (situation === 'paid') {
        const remaining = Math.max(Number(invoice.amount_due) - Number(invoice.amount_paid), 0)
        if (remaining > 0) {
          await savePayment(invoice.id, remaining, 'cash', new Date().toISOString().slice(0, 10))
        }
        return
      }

      const response = await fetch(`/api/invoices/${invoice.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: situation }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Impossible de modifier le statut')
      upsertLocalInvoice(data as Invoice)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur de mise à jour')
    } finally {
      setSavingAction(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-5 sm:px-6">
        <FadeIn>
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid xl:grid-cols-[1fr_390px]">
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Registre administratif</p>
                    <h1 className="mt-2 text-2xl font-semibold text-foreground">Familles, inscriptions et paiements</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                      La situation scolaire et financière de chaque famille, classée automatiquement par ordre de priorité.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={exportRegisterCsv}
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
                    >
                      <Download className="h-4 w-4" />
                      Exporter
                    </button>
                    <Link
                      href="/eleves/new"
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <UserPlus className="h-4 w-4" />
                      Inscrire un élève
                    </Link>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-5">
                  <HeroMetric label="Élèves suivis" value={activeStudents} helper={`${register.length} familles`} />
                  <HeroMetric label="Prévision mensuelle" value={formatMoney(totals.expected)} helper={`${totals.specialRates} tarifs spéciaux`} />
                  <HeroMetric label="Facturé" value={formatMoney(totals.invoiced)} helper={`${MONTHS[currentMonth - 1]} ${currentYear}`} />
                  <HeroMetric label="Encaissé" value={formatMoney(totals.paid)} helper={`${collectionRate}% recouvré`} tone="success" />
                  <HeroMetric label="Reste à percevoir" value={formatMoney(totals.remaining)} helper={`${totals.attention} dossiers à traiter`} tone={totals.remaining > 0 ? 'danger' : 'default'} />
                </div>
              </div>

              <div className="border-t border-border bg-muted/30 p-5 sm:p-6 xl:border-l xl:border-t-0">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-semibold text-foreground">Centre d’attention</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <AttentionMetric
                    label="Dossiers prioritaires"
                    value={totals.attention}
                    className="border-amber-200 bg-amber-50 text-amber-800"
                  />
                  <AttentionMetric
                    label="Familles à jour"
                    value={totals.paidFamilies}
                    className="border-emerald-200 bg-emerald-50 text-emerald-800"
                  />
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  Les retards, paiements partiels, factures en attente et tarifs manquants remontent automatiquement en tête du tableau.
                </p>
              </div>
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={0.04}>
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[280px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Famille, élève, téléphone, niveau ou groupe..."
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
              <select value={filterPayment} onChange={event => setFilterPayment(event.target.value as typeof filterPayment)} className={selectCls}>
                <option value="all">Toutes les situations</option>
                <option value="attention">À traiter en priorité</option>
                <option value="overdue">En retard</option>
                <option value="partial">Paiement partiel</option>
                <option value="pending">À encaisser</option>
                <option value="missing_invoice">À facturer</option>
                <option value="no_pricing">Tarif manquant</option>
                <option value="paid">Payé</option>
              </select>
              <select value={filterSite} onChange={event => setFilterSite(event.target.value)} className={selectCls}>
                <option value="all">Tous les sites</option>
                {sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
              <span className="ml-auto text-sm font-medium text-muted-foreground">
                {filtered.length} famille{filtered.length > 1 ? 's' : ''}
              </span>
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={0.08}>
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-semibold text-foreground">Aucun dossier correspondant</p>
              <p className="mt-1 text-sm text-muted-foreground">Modifiez les filtres ou inscrivez un nouvel élève.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="min-w-[1420px] w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <TableHead className="w-[58px]">Priorité</TableHead>
                      <TableHead className="w-[230px]">Famille & contact</TableHead>
                      <TableHead className="w-[290px]">Élèves inscrits</TableHead>
                      <TableHead className="w-[150px]">Site & groupe</TableHead>
                      <TableHead className="w-[150px]">Tarif mensuel</TableHead>
                      <TableHead className="w-[110px] text-right">Facturé</TableHead>
                      <TableHead className="w-[110px] text-right">Payé</TableHead>
                      <TableHead className="w-[110px] text-right">Reste</TableHead>
                      <TableHead className="w-[160px]">Situation</TableHead>
                      <TableHead className="w-[130px] text-right">Actions</TableHead>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map(row => {
                      const payment = PAYMENT_STATUS[row.paymentStatus]
                      return (
                        <tr key={row.id} className={`align-top transition hover:bg-muted/20 ${row.priority <= 3 ? 'bg-amber-50/20' : ''}`}>
                          <td className="px-4 py-4">
                            <PriorityBadge priority={row.priority} />
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold text-foreground">{row.familyName}</p>
                            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                              <p>{row.parentPhone || 'Téléphone non renseigné'}</p>
                              <p className="max-w-[210px] truncate">{row.parentEmail || 'Email non renseigné'}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-2">
                              {row.students.map(student => {
                                const enrollment = student.enrollments?.find(item =>
                                  item.status === 'active' || item.status === 'trial'
                                )
                                return (
                                  <Link
                                    key={student.id}
                                    href={`/eleves/${student.id}`}
                                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 transition hover:border-primary/40"
                                  >
                                    <div>
                                      <p className="text-xs font-semibold text-foreground">{student.first_name} {student.last_name}</p>
                                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                                        {student.level?.emoji} {student.level?.name ?? 'Niveau non défini'}
                                        {enrollment?.group?.name ? ` · ${enrollment.group.name}` : ''}
                                      </p>
                                    </div>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                      student.status === 'trial'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                      {student.status === 'trial' ? 'Essai' : 'Actif'}
                                    </span>
                                  </Link>
                                )
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {row.siteNames.map(siteName => (
                                <span key={siteName} className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                                  {siteName}
                                </span>
                              ))}
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {row.students.length} enfant{row.students.length > 1 ? 's' : ''} facturé{row.students.length > 1 ? 's' : ''}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-base font-bold text-foreground">{formatMoney(row.expectedMonthly)}</p>
                            {row.hasSpecialRate ? (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-[10px] font-semibold text-violet-700">
                                  <BadgeEuro className="h-3 w-3" />
                                  Tarif spécial
                                </span>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  Normal : {formatMoney(row.normalMonthly)}
                                </p>
                              </div>
                            ) : (
                              <p className="mt-1 text-[11px] text-muted-foreground">Tarif standard</p>
                            )}
                          </td>
                          <MoneyCell value={row.invoiced} />
                          <MoneyCell value={row.paid} tone="success" />
                          <MoneyCell value={row.remaining} tone={row.remaining > 0 ? 'danger' : 'muted'} />
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${payment.className}`}>
                              {payment.label}
                            </span>
                            <p className="mt-1.5 text-[11px] text-muted-foreground">{payment.detail}</p>
                            {row.specialRateNote && (
                              <p className="mt-2 line-clamp-2 text-[11px] italic text-violet-600">{row.specialRateNote}</p>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setManagedRowId(row.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
                              >
                                <WalletCards className="h-3.5 w-3.5" />
                                Gérer
                              </button>
                              {row.students[0] && (
                                <Link
                                  href={`/eleves/${row.students[0].id}`}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:underline"
                                >
                                  Voir dossier
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </FadeIn>
      </div>

      {managedRow && (
        <FamilyManagementModal
          row={managedRow}
          invoices={localInvoices}
          currentMonth={currentMonth}
          currentYear={currentYear}
          savingAction={savingAction}
          onClose={() => setManagedRowId(null)}
          onSaveRate={saveSpecialRate}
          onCreateInvoice={createInvoice}
          onRecordPayment={recordPayment}
          onSetSituation={setMonthlySituation}
        />
      )}
    </div>
  )
}

function FamilyManagementModal({
  row,
  invoices,
  currentMonth,
  currentYear,
  savingAction,
  onClose,
  onSaveRate,
  onCreateInvoice,
  onRecordPayment,
  onSetSituation,
}: {
  row: SchoolRegisterRow
  invoices: Invoice[]
  currentMonth: number
  currentYear: number
  savingAction: string | null
  onClose: () => void
  onSaveRate: (event: React.FormEvent<HTMLFormElement>) => void
  onCreateInvoice: (month: number, year: number) => void
  onRecordPayment: (event: React.FormEvent<HTMLFormElement>, invoiceId: string) => void
  onSetSituation: (month: number, year: number, situation: 'paid' | 'pending' | 'overdue') => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const academicStartYear = currentMonth >= 9 ? currentYear : currentYear - 1
  const academicMonths = Array.from({ length: 12 }, (_, index) => {
    const month = ((8 + index) % 12) + 1
    const year = month >= 9 ? academicStartYear : academicStartYear + 1
    return { month, year, key: `${year}-${String(month).padStart(2, '0')}` }
  })
  const [selectedPeriod, setSelectedPeriod] = useState(
    `${currentYear}-${String(currentMonth).padStart(2, '0')}`
  )
  const [selectedYear, selectedMonth] = selectedPeriod.split('-').map(Number)
  const familyInvoices = row.family
    ? invoices.filter(invoice => invoice.family_id === row.family?.id && invoice.status !== 'cancelled')
    : []
  const selectedInvoice = familyInvoices.find(invoice =>
    invoice.period_month === selectedMonth && invoice.period_year === selectedYear
  )
  const selectedInvoiced = Number(selectedInvoice?.amount_due ?? 0)
  const selectedPaid = Number(selectedInvoice?.amount_paid ?? 0)
  const selectedRemaining = Math.max(selectedInvoiced - selectedPaid, 0)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-background px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Gestion famille</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">{row.familyName}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{row.students.length} enfant{row.students.length > 1 ? 's' : ''} · {row.siteNames.join(', ')}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!row.family ? (
          <div className="p-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Ce dossier doit d’abord être rattaché à une famille avant de pouvoir gérer son tarif et sa facturation.
            </div>
          </div>
        ) : (
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <form onSubmit={onSaveRate} className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">Tarif de la famille</h3>
              <p className="mt-1 text-xs text-muted-foreground">Tarif normal calculé : {formatMoney(row.normalMonthly)}</p>
              <label className="mt-4 block">
                <span className="text-xs font-medium text-foreground">Tarif mensuel spécial</span>
                <input
                  name="custom_monthly_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={row.family.custom_monthly_rate ?? ''}
                  placeholder="Laisser vide pour le tarif normal"
                  className={modalInputCls}
                />
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-medium text-foreground">Justification interne</span>
                <textarea
                  name="custom_rate_note"
                  defaultValue={row.family.custom_rate_note ?? ''}
                  rows={3}
                  className={modalInputCls}
                />
              </label>
              <button type="submit" disabled={savingAction !== null} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {savingAction === 'rate' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Enregistrer le tarif
              </button>
            </form>

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">Échéancier mensuel</h3>
              <p className="mt-1 text-xs text-muted-foreground">Année scolaire {academicStartYear}-{academicStartYear + 1} · paiement attendu le 1er de chaque mois</p>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {academicMonths.map(period => {
                  const invoice = familyInvoices.find(item =>
                    item.period_month === period.month && item.period_year === period.year
                  )
                  const due = Number(invoice?.amount_due ?? 0)
                  const paid = Number(invoice?.amount_paid ?? 0)
                  const isPast = period.key < `${currentYear}-${String(currentMonth).padStart(2, '0')}`
                  const status = !invoice
                    ? 'À créer'
                    : paid >= due
                      ? 'Payé'
                      : paid > 0
                        ? 'Partiel'
                        : isPast
                          ? 'En retard'
                          : 'À payer'
                  return (
                    <button
                      key={period.key}
                      type="button"
                      onClick={() => setSelectedPeriod(period.key)}
                      className={`rounded-lg border px-2 py-2 text-left transition ${
                        selectedPeriod === period.key ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-accent'
                      }`}
                    >
                      <p className="text-xs font-semibold capitalize text-foreground">{MONTHS[period.month - 1]}</p>
                      <p className={`mt-1 text-[10px] font-medium ${
                        status === 'Payé' ? 'text-emerald-600' : status === 'En retard' ? 'text-red-600' : 'text-muted-foreground'
                      }`}>{status}</p>
                    </button>
                  )
                })}
              </div>
              <p className="mt-4 text-sm font-semibold capitalize text-foreground">{MONTHS[(selectedMonth ?? 1) - 1]} {selectedYear}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <MiniAmount label="Facturé" value={selectedInvoiced} />
                <MiniAmount label="Payé" value={selectedPaid} />
                <MiniAmount label="Reste" value={selectedRemaining} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onSetSituation(selectedMonth ?? currentMonth, selectedYear ?? currentYear, 'paid')}
                  disabled={savingAction !== null || selectedRemaining <= 0 && Boolean(selectedInvoice)}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Marquer payé
                </button>
                <button
                  type="button"
                  onClick={() => onSetSituation(selectedMonth ?? currentMonth, selectedYear ?? currentYear, 'pending')}
                  disabled={savingAction !== null}
                  className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  À payer
                </button>
                <button
                  type="button"
                  onClick={() => onSetSituation(selectedMonth ?? currentMonth, selectedYear ?? currentYear, 'overdue')}
                  disabled={savingAction !== null}
                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  En retard
                </button>
                <button
                  type="button"
                  onClick={() => onCreateInvoice(selectedMonth ?? currentMonth, selectedYear ?? currentYear)}
                  disabled={savingAction !== null}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-50"
                >
                  {selectedInvoice ? 'Actualiser le montant' : 'Créer seulement'}
                </button>
              </div>
            </div>

            <form
              onSubmit={(event) => {
                if (selectedInvoice) onRecordPayment(event, selectedInvoice.id)
              }}
              className="rounded-xl border border-border bg-card p-4 md:col-span-2"
            >
              <h3 className="text-sm font-semibold text-foreground">Enregistrer un paiement</h3>
              {!selectedInvoice ? (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  Créez d’abord la facture du mois.
                </p>
              ) : (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <label>
                      <span className="text-xs font-medium text-foreground">Montant</span>
                      <input name="amount" type="number" min="0.01" step="0.01" defaultValue={selectedRemaining || row.expectedMonthly} required className={modalInputCls} />
                    </label>
                    <label>
                      <span className="text-xs font-medium text-foreground">Mode</span>
                      <select name="method" className={modalInputCls}>
                        <option value="cash">Espèces</option>
                        <option value="card">Carte</option>
                        <option value="transfer">Virement</option>
                        <option value="check">Chèque</option>
                        <option value="other">Autre</option>
                      </select>
                    </label>
                    <label>
                      <span className="text-xs font-medium text-foreground">Date</span>
                      <input name="payment_date" type="date" defaultValue={today} required className={modalInputCls} />
                    </label>
                    <label>
                      <span className="text-xs font-medium text-foreground">Référence</span>
                      <input name="reference" placeholder="Optionnel" className={modalInputCls} />
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={savingAction !== null || selectedRemaining <= 0}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {savingAction === 'payment' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Valider le paiement
                  </button>
                </>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

function MiniAmount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold text-foreground">{formatMoney(value)}</p>
    </div>
  )
}

function HeroMetric({
  label,
  value,
  helper,
  tone = 'default',
}: {
  label: string
  value: number | string
  helper: string
  tone?: 'default' | 'success' | 'danger'
}) {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-2 truncate text-xl font-bold leading-none ${
        tone === 'success' ? 'text-emerald-600' : tone === 'danger' ? 'text-red-600' : 'text-foreground'
      }`}>
        {value}
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground">{helper}</p>
    </div>
  )
}

function AttentionMetric({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className: string
}) {
  return (
    <div className={`rounded-xl border p-3 ${className}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-medium">{label}</p>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: number }) {
  if (priority <= 1) {
    return <span title="Urgent" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-700"><AlertTriangle className="h-4 w-4" /></span>
  }
  if (priority <= 3) {
    return <span title="À traiter" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700"><CircleDollarSign className="h-4 w-4" /></span>
  }
  if (priority <= 5) {
    return <span title="À compléter" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700"><ShieldAlert className="h-4 w-4" /></span>
  }
  return <span title="À jour" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-4 w-4" /></span>
}

function TableHead({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${className}`}>
      {children}
    </th>
  )
}

function MoneyCell({
  value,
  tone = 'default',
}: {
  value: number
  tone?: 'default' | 'success' | 'danger' | 'muted'
}) {
  return (
    <td className={`px-4 py-4 text-right text-sm font-bold ${
      tone === 'success'
        ? 'text-emerald-600'
        : tone === 'danger'
          ? 'text-red-600'
          : tone === 'muted'
            ? 'text-muted-foreground'
            : 'text-foreground'
    }`}>
      {formatMoney(value)}
    </td>
  )
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

const selectCls = 'rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25'
const modalInputCls = 'mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25'
