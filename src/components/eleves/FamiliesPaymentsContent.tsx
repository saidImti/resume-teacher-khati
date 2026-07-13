'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Archive, BadgeEuro, ChevronDown, ChevronRight, Loader2,
  Search, Settings2, Users, X, AlertTriangle, Sparkles, GraduationCap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FadeIn } from '@/components/ui/FadeIn'
import { buildSchoolRegister } from '@/lib/school-register'
import { useOrgRole } from '@/contexts/OrgRoleContext'
import type { Family, Invoice, PricingRule, Site, Student, StudentStatus } from '@/types'

interface Props {
  sites: Site[]
  students: Student[]
  families: Family[]
  pricingRules: PricingRule[]
  invoices: Invoice[]
  currentMonth: number
  currentYear: number
}

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
// « Présent » prêtait à confusion avec l'appel de présence — le vrai appel se fait sur /presences.
const STUDENT_STATUS: Record<StudentStatus, string> = {
  active: 'Actif',
  trial: 'Essai',
  suspended: 'Suspendu',
  departed: 'Parti',
}

type MonthStatus = 'paid' | 'partial' | 'overdue' | 'pending' | 'missing'

const MONTH_STATUS_CONFIG: Record<MonthStatus, { label: string; chip: string; dot: string }> = {
  paid:    { label: 'Payé',    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900', dot: 'bg-emerald-500 text-white' },
  partial: { label: 'Partiel', chip: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:ring-orange-900',       dot: 'bg-orange-400 text-white' },
  overdue: { label: 'Retard',  chip: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900',                         dot: 'bg-red-500 text-white' },
  pending: { label: 'À payer', chip: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900',             dot: 'bg-amber-400 text-white' },
  missing: { label: '—',       chip: 'bg-muted text-muted-foreground ring-border',                                                                          dot: 'bg-muted text-muted-foreground' },
}

export function FamiliesPaymentsContent({
  sites, students, families, pricingRules, invoices, currentMonth, currentYear,
}: Props) {
  // Paiements = admin ; archivage famille = admin+teacher (matrice RLS)
  const { canWrite, isAdmin } = useOrgRole()
  const [localStudents, setLocalStudents] = useState(students)
  const [localFamilies, setLocalFamilies] = useState(families)
  const [localInvoices, setLocalInvoices] = useState(invoices)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [siteFilter, setSiteFilter] = useState('all')
  const [saving, setSaving] = useState(false)
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const academicStartYear = currentMonth >= 9 ? currentYear : currentYear - 1
  const academicMonths = Array.from({ length: 12 }, (_, index) => {
    const month = ((8 + index) % 12) + 1
    return { month, year: month >= 9 ? academicStartYear : academicStartYear + 1 }
  })
  const currentPeriod = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
  const [bulkPeriod, setBulkPeriod] = useState(currentPeriod)

  const register = useMemo(() => buildSchoolRegister({
    families: localFamilies,
    students: localStudents,
    pricingRules,
    invoices: localInvoices,
    sites,
    month: currentMonth,
    year: currentYear,
  }), [localFamilies, localStudents, pricingRules, localInvoices, sites, currentMonth, currentYear])

  const rows = useMemo(() => register.filter(row => {
    const q = search.trim().toLowerCase()
    const matchSearch = !q || `${row.familyName} ${row.parentPhone ?? ''} ${row.students.map(student => `${student.first_name} ${student.last_name}`).join(' ')}`.toLowerCase().includes(q)
    return matchSearch && (siteFilter === 'all' || row.siteIds.includes(siteFilter))
  }), [register, search, siteFilter])

  const selectedRows = rows.filter(row => selectedIds.includes(row.id) && row.family)
  const editingRow = register.find(row => row.id === editingFamilyId) ?? null
  const allVisibleSelected = rows.length > 0 && rows.every(row => selectedIds.includes(row.id))

  function monthInvoice(familyId: string, month: number, year: number) {
    return localInvoices.find(invoice =>
      invoice.family_id === familyId && invoice.period_month === month &&
      invoice.period_year === year && invoice.status !== 'cancelled'
    )
  }

  function monthStatus(familyId: string | undefined, month: number, year: number): { status: MonthStatus; paid: number; due: number } {
    const invoice = familyId ? monthInvoice(familyId, month, year) : undefined
    const due = Number(invoice?.amount_due ?? 0)
    const paid = Number(invoice?.amount_paid ?? 0)
    const status: MonthStatus = !invoice ? 'missing' : paid >= due ? 'paid' : paid > 0 ? 'partial' : invoice.status === 'overdue' ? 'overdue' : 'pending'
    return { status, paid, due }
  }

  const overdueFamilies = register.filter(row =>
    row.family && academicMonths.some(period => monthStatus(row.family!.id, period.month, period.year).status === 'overdue')
  ).length
  const totalStudentsActive = register.reduce((sum, row) => sum + row.students.filter(s => s.status === 'active' || s.status === 'trial').length, 0)

  async function bulkAction(action: 'paid' | 'pending' | 'overdue') {
    if (selectedRows.length === 0) return
    const [year, month] = bulkPeriod.split('-').map(Number)
    setSaving(true)
    try {
      const response = await fetch('/api/billing/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          year,
          action,
          entries: selectedRows.map(row => ({
            family_id: row.family!.id,
            site_id: row.family!.primary_site_id ?? row.siteIds[0] ?? null,
            amount_due: row.expectedMonthly,
          })),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Action collective impossible')
      const changed = data.invoices as Invoice[]
      setLocalInvoices(current => {
        const changedIds = new Set(changed.map(invoice => invoice.id))
        return [...changed, ...current.filter(invoice => !changedIds.has(invoice.id))]
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur collective')
    } finally {
      setSaving(false)
    }
  }

  async function updateStudentStatus(studentId: string, status: StudentStatus) {
    const response = await fetch(`/api/students/${studentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await response.json()
    if (!response.ok) return alert(data.error ?? 'Modification impossible')
    setLocalStudents(current => current.map(student => student.id === studentId ? data as Student : student))
  }

  async function archiveFamily(family: Family) {
    if (!confirm(`Archiver la famille ${family.parent1_first} ${family.parent1_last} ?\n\nLes factures et paiements seront conservés.`)) return
    const response = await fetch(`/api/families/${family.id}/archive`, { method: 'PATCH' })
    const data = await response.json()
    if (!response.ok) return alert(data.error ?? 'Archivage impossible')
    setLocalFamilies(current => current.filter(item => item.id !== family.id))
    setSelectedIds(current => current.filter(id => id !== family.id))
  }

  async function saveRate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingRow?.family) return
    const form = new FormData(event.currentTarget)
    const mode = String(form.get('rate_mode'))
    setSaving(true)
    try {
      const response = await fetch(`/api/families/${editingRow.family.id}/rate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_site_id: editingRow.family.primary_site_id ?? editingRow.siteIds[0] ?? null,
          custom_monthly_rate: mode === 'special' ? form.get('custom_monthly_rate') : null,
          custom_rate_note: mode === 'special' ? String(form.get('custom_rate_note') ?? '') || null : null,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Tarif impossible à modifier')
      setLocalFamilies(current => current.map(family => family.id === data.id ? data as Family : family))
      setEditingFamilyId(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur tarif')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-6">

        {/* ─── Hero ──────────────────────────────────────────── */}
        <FadeIn from="bottom">
          <section className="overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-2xl">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Administration financière
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Familles & paiements
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Année scolaire {academicStartYear}-{academicStartYear + 1} · l&apos;année entière de chaque famille en un coup d&apos;œil —
                  cliquer sur une famille pour ouvrir le détail mois par mois.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <HeroMetric icon={Users} label="Familles" value={register.length} helper="au registre" />
                <HeroMetric icon={GraduationCap} label="Élèves" value={totalStudentsActive} helper="actifs · essai" />
                <HeroMetric icon={Sparkles} label="Tarifs spéciaux" value={register.filter(row => row.hasSpecialRate).length} helper="familles" />
                <HeroMetric
                  icon={AlertTriangle}
                  label="En retard"
                  value={overdueFamilies}
                  helper={overdueFamilies > 0 ? 'à relancer' : 'aucun retard'}
                  alert={overdueFamilies > 0}
                />
              </div>
            </div>
          </section>
        </FadeIn>

        {/* ─── Barre d'outils sticky ─────────────────────────── */}
        <FadeIn delay={45} from="bottom">
          <section className="sticky top-0 z-20 rounded-xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Famille, parent ou enfant…" className={inputCls + ' w-full pl-10'} />
              </div>
              <select value={siteFilter} onChange={event => setSiteFilter(event.target.value)} className={inputCls} aria-label="Filtrer par site">
                <option value="all">Tous les sites</option>
                {sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
              {isAdmin && (
                <>
                  <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={event => setSelectedIds(event.target.checked ? rows.map(row => row.id) : [])}
                        aria-label="Tout sélectionner"
                      />
                      Tout ({selectedRows.length})
                    </label>
                  </div>
                  <select value={bulkPeriod} onChange={event => setBulkPeriod(event.target.value)} className={inputCls} aria-label="Mois de l'action collective">
                    {academicMonths.map(period => <option key={`${period.year}-${period.month}`} value={`${period.year}-${String(period.month).padStart(2, '0')}`}>{MONTHS[period.month - 1]} {period.year}</option>)}
                  </select>
                  <button disabled={!selectedRows.length || saving} onClick={() => bulkAction('paid')} className="btn-press rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40">Payé</button>
                  <button disabled={!selectedRows.length || saving} onClick={() => bulkAction('pending')} className="btn-press rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-40">À payer</button>
                  <button disabled={!selectedRows.length || saving} onClick={() => bulkAction('overdue')} className="btn-press rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-40">Retard</button>
                  {saving && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </>
              )}
            </div>
          </section>
        </FadeIn>

        {/* ─── Légende ───────────────────────────────────────── */}
        <FadeIn delay={70} from="bottom">
          <div className="flex flex-wrap items-center gap-3 px-1 text-xs text-muted-foreground">
            <span className="font-medium">Année :</span>
            {(['paid', 'partial', 'pending', 'overdue', 'missing'] as MonthStatus[]).map(status => (
              <span key={status} className="inline-flex items-center gap-1.5">
                <span className={cn('h-3 w-3 rounded', MONTH_STATUS_CONFIG[status].dot)} />
                {status === 'missing' ? 'Pas de facture' : MONTH_STATUS_CONFIG[status].label}
              </span>
            ))}
          </div>
        </FadeIn>

        {/* ─── Registre des familles ─────────────────────────── */}
        <div className="space-y-2">
          {rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-sm font-medium text-foreground">Aucune famille ne correspond</p>
              <p className="mt-1 text-xs text-muted-foreground">Modifie la recherche ou le filtre de site.</p>
            </div>
          )}

          {rows.map((row, index) => {
            const isExpanded = expandedId === row.id
            const current = monthStatus(row.family?.id, currentMonth, currentYear)
            const currentCfg = MONTH_STATUS_CONFIG[current.status]
            return (
              <FadeIn key={row.id} delay={Math.min(index, 8) * 35} from="bottom">
                <article className={cn(
                  'rounded-xl border bg-card transition',
                  isExpanded ? 'border-primary/40 shadow-sm' : 'border-border hover:border-primary/30'
                )}>
                  {/* Ligne compacte */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-3 sm:p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={event => setSelectedIds(current => event.target.checked ? [...new Set([...current, row.id])] : current.filter(id => id !== row.id))}
                      onClick={event => event.stopPropagation()}
                      aria-label={`Sélectionner ${row.familyName}`}
                    />

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : row.id)}
                      className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 text-left"
                      aria-expanded={isExpanded}
                    >
                      {/* Famille */}
                      <div className="w-44 min-w-0 shrink-0">
                        <p className="truncate text-sm font-semibold text-foreground">{row.familyName}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.siteNames.join(', ') || 'Sans site'}</p>
                      </div>

                      {/* Enfants (aperçu) */}
                      <div className="hidden min-w-0 flex-1 md:block">
                        <p className="truncate text-xs text-muted-foreground">
                          {row.students.map(student => `${student.first_name} (${STUDENT_STATUS[student.status]})`).join(' · ') || 'Aucun enfant'}
                        </p>
                      </div>

                      {/* Tarif */}
                      <div className="w-20 shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums text-foreground">{money(row.expectedMonthly)}</p>
                        {row.hasSpecialRate && <p className="text-[10px] font-semibold text-violet-600">Spécial</p>}
                      </div>

                      {/* Heatmap 12 mois */}
                      <div className="flex shrink-0 items-center gap-0.5" aria-label="Statut des 12 mois de l'année scolaire">
                        {academicMonths.map(period => {
                          const cell = monthStatus(row.family?.id, period.month, period.year)
                          const cfg = MONTH_STATUS_CONFIG[cell.status]
                          const isCurrent = period.month === currentMonth && period.year === currentYear
                          return (
                            <span
                              key={`${period.year}-${period.month}`}
                              title={`${MONTHS[period.month - 1]} ${period.year} : ${cell.status === 'missing' ? 'pas de facture' : `${cfg.label} ${cell.paid.toFixed(0)}/${cell.due.toFixed(0)}€`}`}
                              className={cn(
                                'flex h-6 w-5 items-center justify-center rounded text-[9px] font-bold',
                                cfg.dot,
                                isCurrent && 'ring-2 ring-primary ring-offset-1 ring-offset-card'
                              )}
                            >
                              {MONTHS[period.month - 1]![0]}
                            </span>
                          )
                        })}
                      </div>

                      {/* Mois courant + chevron */}
                      <span className={cn('hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 lg:inline-flex', currentCfg.chip)}>
                        {currentCfg.label}
                      </span>
                      <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                    </button>
                  </div>

                  {/* Détail déplié */}
                  {isExpanded && (
                    <div className="space-y-4 border-t border-border p-4">
                      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                        {/* Enfants & statuts */}
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Enfants & statut d&apos;inscription</p>
                          <div className="space-y-2">
                            {row.students.map(student => (
                              <div key={student.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background p-2.5">
                                <Link href={`/eleves/${student.id}`} className="min-w-0 text-sm font-medium text-foreground hover:text-primary">
                                  <span className="truncate">{student.first_name} {student.last_name}</span>
                                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">{student.level?.name}</span>
                                </Link>
                                <select
                                  value={student.status}
                                  onChange={event => updateStudentStatus(student.id, event.target.value as StudentStatus)}
                                  className="shrink-0 rounded-lg border border-border bg-background px-2 py-1 text-xs"
                                  aria-label={`Statut de ${student.first_name}`}
                                >
                                  {Object.entries(STUDENT_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                              </div>
                            ))}
                            {row.students.length === 0 && <p className="text-xs text-muted-foreground">Aucun enfant rattaché.</p>}
                          </div>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            ℹ️ L&apos;appel de présence quotidien se fait depuis la page <Link href="/presences" className="font-medium text-primary hover:underline">Présences</Link>.
                          </p>
                        </div>

                        {/* Grille 12 mois détaillée */}
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Paiements {academicStartYear}-{academicStartYear + 1}</p>
                          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                            {academicMonths.map(period => {
                              const cell = monthStatus(row.family?.id, period.month, period.year)
                              const cfg = MONTH_STATUS_CONFIG[cell.status]
                              return (
                                <div key={`${period.year}-${period.month}`} className={cn('rounded-lg p-2 text-center ring-1', cfg.chip)}>
                                  <p className="text-[10px] font-semibold uppercase">{MONTHS[period.month - 1]}</p>
                                  <p className="text-[11px] font-bold">{cfg.label}</p>
                                  {cell.due > 0 && <p className="text-[10px] tabular-nums opacity-80">{cell.paid.toFixed(0)}/{cell.due.toFixed(0)}€</p>}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Infos + actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground">{row.parentPhone || 'Sans téléphone'}</p>
                        <div className="flex flex-wrap gap-2">
                          {isAdmin && (
                            <button disabled={!row.family} onClick={() => setEditingFamilyId(row.id)} className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-accent disabled:opacity-40">
                              <BadgeEuro className="h-3.5 w-3.5" /> Modifier le tarif
                            </button>
                          )}
                          {row.students[0] && (
                            <Link href={`/eleves/${row.students[0].id}`} className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-accent">
                              Dossier élève <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                          {row.family && canWrite && (
                            <button onClick={() => archiveFamily(row.family!)} className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30">
                              <Archive className="h-3.5 w-3.5" /> Archiver
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              </FadeIn>
            )
          })}
        </div>
      </div>

      {/* ─── Modal tarif ─────────────────────────────────────── */}
      {editingRow?.family && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <form onSubmit={saveRate} className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Tarification</p><h2 className="mt-1 text-lg font-semibold">{editingRow.familyName}</h2></div>
              <button type="button" onClick={() => setEditingFamilyId(null)} aria-label="Fermer"><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <label className="mt-5 block text-sm font-medium">Mode tarifaire
              <select name="rate_mode" defaultValue={editingRow.hasSpecialRate ? 'special' : 'standard'} className={inputCls + ' mt-1.5 w-full'}>
                <option value="standard">Tarif standard du site</option>
                <option value="special">Tarif spécial famille</option>
              </select>
            </label>
            <label className="mt-4 block text-sm font-medium">Montant spécial mensuel
              <input name="custom_monthly_rate" type="number" min="0" step="0.01" defaultValue={editingRow.family.custom_monthly_rate ?? ''} className={inputCls + ' mt-1.5 w-full'} />
            </label>
            <label className="mt-4 block text-sm font-medium">Justification
              <textarea name="custom_rate_note" rows={3} defaultValue={editingRow.family.custom_rate_note ?? ''} className={inputCls + ' mt-1.5 w-full'} />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingFamilyId(null)} className="rounded-lg border border-border px-3 py-2 text-sm">Annuler</button>
              <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Settings2 className="h-4 w-4" /> Enregistrer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function HeroMetric({
  icon: Icon, label, value, helper, alert = false,
}: {
  icon: React.ElementType; label: string; value: number | string; helper: string; alert?: boolean
}) {
  return (
    <div className={cn('rounded-xl border p-3', alert ? 'border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20' : 'border-border bg-background/70')}>
      <div className={cn('mb-2 flex items-center gap-2 text-xs font-medium', alert ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className={cn('text-2xl font-bold tabular-nums', alert ? 'text-red-700 dark:text-red-300' : 'text-foreground')}>{value}</p>
        <p className="pb-1 text-[11px] text-muted-foreground">{helper}</p>
      </div>
    </div>
  )
}

function money(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}
const inputCls = 'rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25'
