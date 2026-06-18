'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Archive, BadgeEuro, ChevronRight, Loader2,
  Search, Settings2, X,
} from 'lucide-react'
import { buildSchoolRegister } from '@/lib/school-register'
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
const STUDENT_STATUS: Record<StudentStatus, string> = {
  active: 'Présent',
  trial: 'Essai',
  suspended: 'Suspendu',
  departed: 'Parti',
}

export function FamiliesPaymentsContent({
  sites, students, families, pricingRules, invoices, currentMonth, currentYear,
}: Props) {
  const [localStudents, setLocalStudents] = useState(students)
  const [localFamilies, setLocalFamilies] = useState(families)
  const [localInvoices, setLocalInvoices] = useState(invoices)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [siteFilter, setSiteFilter] = useState('all')
  const [saving, setSaving] = useState(false)
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null)
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
      <div className="mx-auto max-w-[1800px] space-y-4 px-4 py-5 sm:px-6">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Administration financière</p>
              <h1 className="mt-2 text-2xl font-semibold text-foreground">Familles & paiements</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Année scolaire {academicStartYear}-{academicStartYear + 1} · chaque nouvelle inscription apparaît automatiquement.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Summary label="Familles" value={register.length} />
              <Summary label="Sélection" value={selectedRows.length} />
              <Summary label="Tarifs spéciaux" value={register.filter(row => row.hasSpecialRate).length} />
            </div>
          </div>
        </section>

        <section className="sticky top-0 z-20 rounded-xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[260px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Famille, parent ou enfant…" className={inputCls + ' pl-10'} />
            </div>
            <select value={siteFilter} onChange={event => setSiteFilter(event.target.value)} className={inputCls}>
              <option value="all">Tous les sites</option>
              {sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
            <select value={bulkPeriod} onChange={event => setBulkPeriod(event.target.value)} className={inputCls}>
              {academicMonths.map(period => <option key={`${period.year}-${period.month}`} value={`${period.year}-${String(period.month).padStart(2, '0')}`}>{MONTHS[period.month - 1]} {period.year}</option>)}
            </select>
            <button disabled={!selectedRows.length || saving} onClick={() => bulkAction('paid')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Sélection payée</button>
            <button disabled={!selectedRows.length || saving} onClick={() => bulkAction('pending')} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">À payer</button>
            <button disabled={!selectedRows.length || saving} onClick={() => bulkAction('overdue')} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">En retard</button>
            {saving && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="min-w-[1900px] w-full">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-3"><input type="checkbox" checked={allVisibleSelected} onChange={event => setSelectedIds(event.target.checked ? rows.map(row => row.id) : [])} /></th>
                  <Head>Famille</Head><Head>Enfants & présence</Head><Head>Tarif</Head>
                  {academicMonths.map(period => <Head key={`${period.year}-${period.month}`} center>{MONTHS[period.month - 1]}</Head>)}
                  <Head>Actions</Head>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(row => (
                  <tr key={row.id} className="align-top hover:bg-muted/20">
                    <td className="px-3 py-4"><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={event => setSelectedIds(current => event.target.checked ? [...new Set([...current, row.id])] : current.filter(id => id !== row.id))} /></td>
                    <td className="px-3 py-4">
                      <p className="text-sm font-semibold text-foreground">{row.familyName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.parentPhone || 'Sans téléphone'}</p>
                      <p className="text-xs text-muted-foreground">{row.siteNames.join(', ')}</p>
                    </td>
                    <td className="px-3 py-4">
                      <div className="space-y-2">
                        {row.students.map(student => (
                          <div key={student.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background p-2">
                            <Link href={`/eleves/${student.id}`} className="text-xs font-semibold text-foreground hover:text-primary">
                              {student.first_name} {student.last_name}
                              <span className="ml-1 font-normal text-muted-foreground">{student.level?.name}</span>
                            </Link>
                            <select value={student.status} onChange={event => updateStudentStatus(student.id, event.target.value as StudentStatus)} className="rounded border border-border bg-background px-1.5 py-1 text-[10px]">
                              {Object.entries(STUDENT_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <p className="text-sm font-bold text-foreground">{money(row.expectedMonthly)}</p>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.hasSpecialRate ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                        {row.hasSpecialRate ? 'Spécial' : 'Standard'}
                      </span>
                    </td>
                    {academicMonths.map(period => {
                      const invoice = row.family ? monthInvoice(row.family.id, period.month, period.year) : undefined
                      const due = Number(invoice?.amount_due ?? 0)
                      const paid = Number(invoice?.amount_paid ?? 0)
                      const status = !invoice ? 'missing' : paid >= due ? 'paid' : paid > 0 ? 'partial' : invoice.status === 'overdue' ? 'overdue' : 'pending'
                      return <MonthCell key={`${period.year}-${period.month}`} status={status} paid={paid} due={due} />
                    })}
                    <td className="px-3 py-4">
                      <div className="flex flex-col gap-1.5">
                        <button disabled={!row.family} onClick={() => setEditingFamilyId(row.id)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-40"><BadgeEuro className="h-3.5 w-3.5" /> Tarif</button>
                        {row.family && <button onClick={() => archiveFamily(row.family!)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"><Archive className="h-3.5 w-3.5" /> Archiver</button>}
                        {row.students[0] && <Link href={`/eleves/${row.students[0].id}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary">Dossier <ChevronRight className="h-3 w-3" /></Link>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {editingRow?.family && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <form onSubmit={saveRate} className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Tarification</p><h2 className="mt-1 text-lg font-semibold">{editingRow.familyName}</h2></div>
              <button type="button" onClick={() => setEditingFamilyId(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
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

function MonthCell({ status, paid, due }: { status: string; paid: number; due: number }) {
  const config = status === 'paid'
    ? ['Payé', 'bg-emerald-50 text-emerald-700']
    : status === 'partial' ? ['Partiel', 'bg-orange-50 text-orange-700']
      : status === 'overdue' ? ['Retard', 'bg-red-50 text-red-700']
        : status === 'pending' ? ['À payer', 'bg-amber-50 text-amber-700']
          : ['—', 'bg-muted text-muted-foreground']
  return <td className="px-2 py-4 text-center"><span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-semibold ${config[1]}`}>{config[0]}</span>{due > 0 && <p className="mt-1 text-[10px] text-muted-foreground">{paid.toFixed(0)}/{due.toFixed(0)}€</p>}</td>
}
function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-border bg-background px-3 py-2 text-center"><p className="text-lg font-bold">{value}</p><p className="text-[10px] text-muted-foreground">{label}</p></div>
}
function Head({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return <th className={`px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${center ? 'text-center' : 'text-left'}`}>{children}</th>
}
function money(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}
const inputCls = 'rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25'
