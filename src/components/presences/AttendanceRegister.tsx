'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowDownAZ, CalendarRange, CheckCircle2, ChevronDown, Clock, Download,
  Info, Loader2, MapPin, Printer, Search, TrendingDown, Users, XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FadeIn } from '@/components/ui/FadeIn'
import type { Site } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroupOption {
  id: string
  name: string
  level: { id: string; name: string; emoji: string; color: string }
  site:  { id: string; name: string }
}

interface ReportRow {
  student: { id: string; first_name: string; last_name: string }
  group: { id: string; name: string; emoji: string; color: string; site: string } | null
  present: number
  absent: number
  late: number
  excused: number
  total: number
  rate: number
  entries: Array<{ date: string; status: string; notes: string | null }>
}

interface ReportPayload {
  from: string
  to: string
  rows: ReportRow[]
  totals: { present: number; absent: number; late: number; excused: number; total: number }
  students: number
}

interface Props {
  groups: GroupOption[]
  sites: Site[]
}

// ─── Périodes scolaires ───────────────────────────────────────────────────────
// Année scolaire : septembre → août. T1 sept-déc · T2 janv-mars · T3 avril-juin.

function academicStartYear(today = new Date()) {
  return today.getMonth() + 1 >= 9 ? today.getFullYear() : today.getFullYear() - 1
}

type PresetKey = 'mois' | 't1' | 't2' | 't3' | 'annee' | 'perso'

function presetRange(preset: PresetKey, today = new Date()): { from: string; to: string } {
  const start = academicStartYear(today)
  const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  switch (preset) {
    case 'mois': {
      const y = today.getFullYear(); const m = today.getMonth() + 1
      const last = new Date(y, m, 0).getDate()
      return { from: iso(y, m, 1), to: iso(y, m, last) }
    }
    case 't1': return { from: iso(start, 9, 1), to: iso(start, 12, 31) }
    case 't2': return { from: iso(start + 1, 1, 1), to: iso(start + 1, 3, 31) }
    case 't3': return { from: iso(start + 1, 4, 1), to: iso(start + 1, 6, 30) }
    case 'annee':
    default: return { from: iso(start, 9, 1), to: iso(start + 1, 8, 31) }
  }
}

const PRESETS: Array<{ key: PresetKey; label: string }> = [
  { key: 'mois', label: 'Ce mois' },
  { key: 't1', label: 'Trimestre 1' },
  { key: 't2', label: 'Trimestre 2' },
  { key: 't3', label: 'Trimestre 3' },
  { key: 'annee', label: 'Année scolaire' },
  { key: 'perso', label: 'Personnalisée' },
]

const STATUS_LABELS: Record<string, string> = { present: 'Présent', absent: 'Absent', late: 'Retard', excused: 'Excusé' }
type SortMode = 'alpha' | 'rate'

function rateTone(rate: number) {
  return rate >= 90 ? 'emerald' : rate >= 75 ? 'amber' : 'red'
}
const TONE_TEXT: Record<string, string> = { emerald: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-600' }
const TONE_BAR: Record<string, string> = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' }

// ─── Composant ────────────────────────────────────────────────────────────────

export function AttendanceRegister({ groups, sites }: Props) {
  const [preset, setPreset] = useState<PresetKey>('mois')
  const initial = presetRange('mois')
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [siteFilter, setSiteFilter] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('alpha')
  const [report, setReport] = useState<ReportPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  function applyPreset(key: PresetKey) {
    setPreset(key)
    if (key !== 'perso') {
      const range = presetRange(key)
      setFrom(range.from)
      setTo(range.to)
    }
  }

  const load = useCallback(async () => {
    if (!from || !to) return
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ from, to })
      if (siteFilter) params.set('siteId', siteFilter)
      if (groupFilter) params.set('groupId', groupFilter)
      const res = await fetch(`/api/attendance/report?${params}`)
      const data = await res.json() as ReportPayload & { error?: string }
      if (!res.ok) { setError(data.error ?? 'Erreur de chargement'); return }
      setReport(data)
    } catch {
      setError('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }, [from, to, siteFilter, groupFilter])

  useEffect(() => { void load() }, [load])

  const filteredGroups = siteFilter ? groups.filter(g => g.site.id === siteFilter) : groups

  const visibleRows = useMemo(() => {
    if (!report) return []
    const q = search.trim().toLowerCase()
    if (!q) return report.rows
    return report.rows.filter(row =>
      `${row.student.first_name} ${row.student.last_name} ${row.group?.name ?? ''}`.toLowerCase().includes(q)
    )
  }, [report, search])

  // ─── Regroupement site → groupe (structure la fiche au lieu d'une liste plate) ───
  const sections = useMemo(() => {
    const bySite = new Map<string, Map<string, { group: ReportRow['group']; rows: ReportRow[] }>>()
    for (const row of visibleRows) {
      const siteKey = row.group?.site ?? 'Sans site'
      const groupKey = row.group?.id ?? 'sans-groupe'
      if (!bySite.has(siteKey)) bySite.set(siteKey, new Map())
      const groups = bySite.get(siteKey)!
      if (!groups.has(groupKey)) groups.set(groupKey, { group: row.group, rows: [] })
      groups.get(groupKey)!.rows.push(row)
    }
    return [...bySite.entries()].map(([site, groupMap]) => ({
      site,
      groups: [...groupMap.values()].map(({ group, rows }) => {
        const sorted = [...rows].sort((a, b) => sortMode === 'rate'
          ? a.rate - b.rate
          : `${a.student.last_name} ${a.student.first_name}`.localeCompare(`${b.student.last_name} ${b.student.first_name}`, 'fr')
        )
        const totals = rows.reduce((acc, r) => ({
          present: acc.present + r.present, late: acc.late + r.late,
          excused: acc.excused + r.excused, absent: acc.absent + r.absent, total: acc.total + r.total,
        }), { present: 0, late: 0, excused: 0, absent: 0, total: 0 })
        const rate = totals.total > 0 ? Math.round(((totals.present + totals.late) / totals.total) * 100) : 0
        return { group, rows: sorted, totals, rate }
      }).sort((a, b) => (a.group?.name ?? '').localeCompare(b.group?.name ?? '', 'fr')),
    })).sort((a, b) => a.site.localeCompare(b.site, 'fr'))
  }, [visibleRows, sortMode])

  const globalRate = report && report.totals.total > 0
    ? Math.round(((report.totals.present + report.totals.late) / report.totals.total) * 100)
    : null

  function exportCsv() {
    if (!report) return
    const header = ['Élève', 'Groupe', 'Site', 'Présent', 'Retard', 'Excusé', 'Absent', 'Total appels', 'Assiduité %']
    const lines = visibleRows.map(row => [
      `${row.student.last_name} ${row.student.first_name}`,
      row.group?.name ?? '',
      row.group?.site ?? '',
      row.present, row.late, row.excused, row.absent, row.total, row.rate,
    ])
    const csv = [header, ...lines]
      .map(cols => cols.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fiche-presence-${from}_${to}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  function openPrint() {
    const params = new URLSearchParams({ from, to })
    if (siteFilter) params.set('siteId', siteFilter)
    if (groupFilter) params.set('groupId', groupFilter)
    window.open(`/presences/rapport/print?${params}`, '_blank')
  }

  function toggleGroupCollapse(key: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">

      {/* ─── Période ─────────────────────────────────────────── */}
      <FadeIn from="bottom">
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarRange className="h-4 w-4" />
              Période de la fiche
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportCsv}
                disabled={!report || visibleRows.length === 0}
                className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-accent disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={openPrint}
                disabled={!report || visibleRows.length === 0}
                className="btn-press inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimer / PDF
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                className={cn(
                  'btn-press rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                  preset === p.key
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-transparent bg-muted text-muted-foreground hover:border-border'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-xs font-medium text-muted-foreground">
              Du
              <input
                type="date"
                value={from}
                onChange={e => { setFrom(e.target.value); setPreset('perso') }}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              Au
              <input
                type="date"
                value={to}
                onChange={e => { setTo(e.target.value); setPreset('perso') }}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              Site
              <select
                value={siteFilter}
                onChange={e => { setSiteFilter(e.target.value); setGroupFilter('') }}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Tous les sites</option>
                {sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              Groupe
              <select
                value={groupFilter}
                onChange={e => setGroupFilter(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Tous les groupes</option>
                {filteredGroups.map(g => <option key={g.id} value={g.id}>{g.level.emoji} {g.name} · {g.site.name}</option>)}
              </select>
            </label>
          </div>
        </section>
      </FadeIn>

      {/* ─── Synthèse ────────────────────────────────────────── */}
      {report && report.totals.total > 0 && (
        <FadeIn delay={45} from="bottom">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <SummaryTile label="Élèves suivis" value={report.students} tone="text-foreground" />
            <SummaryTile label="Présents" value={report.totals.present} tone="text-emerald-600" />
            <SummaryTile label="Retards" value={report.totals.late} tone="text-amber-600" />
            <SummaryTile label="Excusés" value={report.totals.excused} tone="text-blue-600" />
            <SummaryTile label="Absents" value={report.totals.absent} tone="text-red-600" />
          </section>
          {globalRate !== null && (
            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Assiduité globale de la période</span>
                <span className={cn('text-sm font-bold tabular-nums', TONE_TEXT[rateTone(globalRate)])}>
                  {globalRate}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all duration-300', TONE_BAR[rateTone(globalRate)])}
                  style={{ width: `${Math.max(globalRate, 3)}%` }}
                />
              </div>
            </div>
          )}
        </FadeIn>
      )}

      {/* ─── Recherche + tri ─────────────────────────────────── */}
      {report && report.rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Chercher un élève ou un groupe…"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setSortMode('alpha')}
              className={cn('btn-press flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition', sortMode === 'alpha' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}
              title="Trier par ordre alphabétique"
            >
              <ArrowDownAZ className="h-3.5 w-3.5" /> A→Z
            </button>
            <button
              type="button"
              onClick={() => setSortMode('rate')}
              className={cn('btn-press flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition', sortMode === 'rate' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}
              title="Trier par assiduité croissante — repère les cas à surveiller"
            >
              <TrendingDown className="h-3.5 w-3.5" /> Assiduité
            </button>
          </div>
        </div>
      )}

      {/* ─── États ───────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-14 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Construction de la fiche…</span>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-sm text-destructive">{error}</div>
      )}
      {!loading && report && report.rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">Aucun appel enregistré sur cette période</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Chaque appel fait depuis l&apos;onglet « Appel du jour » ou « Par groupe » apparaîtra automatiquement ici.
          </p>
        </div>
      )}

      {/* ─── Registre structuré : site → groupe → élèves ─────── */}
      {!loading && sections.length > 0 && (
        <div className="space-y-5">
          {sections.map((siteSection, siteIndex) => (
            <FadeIn key={siteSection.site} delay={siteIndex * 40} from="bottom">
              <section className="space-y-2">
                <h3 className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {siteSection.site}
                </h3>

                {siteSection.groups.map(({ group, rows, totals, rate }) => {
                  const groupKey = group?.id ?? `${siteSection.site}-sans-groupe`
                  const isCollapsed = collapsedGroups.has(groupKey)
                  return (
                    <div key={groupKey} className="overflow-hidden rounded-xl border border-border bg-card">
                      {/* En-tête de groupe : accent coloré + sous-total */}
                      <button
                        type="button"
                        onClick={() => toggleGroupCollapse(groupKey)}
                        className="flex w-full items-center gap-3 border-l-4 p-3 text-left transition hover:bg-accent/40"
                        style={{ borderLeftColor: group?.color ?? '#8b5cf6' }}
                        aria-expanded={!isCollapsed}
                      >
                        <span className="text-lg">{group?.emoji ?? '📋'}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{group?.name ?? 'Sans groupe'}</p>
                          <p className="text-xs text-muted-foreground">{rows.length} élève{rows.length > 1 ? 's' : ''}</p>
                        </div>
                        <div className="hidden items-center gap-1.5 sm:flex">
                          <CountPill icon={CheckCircle2} count={totals.present} className="bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900" title="Présent" />
                          <CountPill icon={Clock} count={totals.late} className="bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900" title="Retard" />
                          <CountPill icon={Info} count={totals.excused} className="bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900" title="Excusé" />
                          <CountPill icon={XCircle} count={totals.absent} className="bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900" title="Absent" />
                        </div>
                        <span className={cn('w-11 shrink-0 text-right text-sm font-bold tabular-nums', TONE_TEXT[rateTone(rate)])}>{rate}%</span>
                        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', !isCollapsed && 'rotate-180')} />
                      </button>

                      {/* Élèves du groupe */}
                      {!isCollapsed && (
                        <div className="divide-y divide-border border-t border-border">
                          {rows.map(row => {
                            const isOpen = expandedStudent === row.student.id
                            return (
                              <div key={row.student.id}>
                                <button
                                  type="button"
                                  onClick={() => setExpandedStudent(isOpen ? null : row.student.id)}
                                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-left transition hover:bg-accent/30"
                                  aria-expanded={isOpen}
                                >
                                  <Link
                                    href={`/eleves/${row.student.id}`}
                                    onClick={e => e.stopPropagation()}
                                    className="w-40 min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:text-primary sm:flex-none"
                                  >
                                    {row.student.first_name} {row.student.last_name}
                                  </Link>
                                  <div className="flex items-center gap-1.5">
                                    <CountPill icon={CheckCircle2} count={row.present} className="bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900" title="Présent" />
                                    <CountPill icon={Clock} count={row.late} className="bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900" title="Retard" />
                                    <CountPill icon={Info} count={row.excused} className="bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900" title="Excusé" />
                                    <CountPill icon={XCircle} count={row.absent} className="bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900" title="Absent" />
                                  </div>
                                  <div className="ml-auto flex items-center gap-3">
                                    <div className="w-20">
                                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                        <div className={cn('h-full rounded-full', TONE_BAR[rateTone(row.rate)])} style={{ width: `${Math.max(row.rate, 3)}%` }} />
                                      </div>
                                    </div>
                                    <span className={cn('w-11 text-right text-sm font-bold tabular-nums', TONE_TEXT[rateTone(row.rate)])}>{row.rate}%</span>
                                    <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                                  </div>
                                </button>

                                {isOpen && (
                                  <div className="bg-muted/30 px-4 pb-3">
                                    <div className="grid gap-1.5 pt-1 sm:grid-cols-2">
                                      {row.entries.map((entry, i) => (
                                        <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs">
                                          <span className="text-foreground">
                                            {new Date(entry.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                            {entry.notes ? <span className="text-muted-foreground"> · {entry.notes}</span> : null}
                                          </span>
                                          <span className={cn(
                                            'font-semibold',
                                            entry.status === 'present' ? 'text-emerald-600' :
                                            entry.status === 'late' ? 'text-amber-600' :
                                            entry.status === 'excused' ? 'text-blue-600' : 'text-red-600'
                                          )}>
                                            {STATUS_LABELS[entry.status] ?? entry.status}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </section>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className={cn('text-2xl font-bold tabular-nums', tone)}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

function CountPill({ icon: Icon, count, className, title }: { icon: React.ElementType; count: number; className: string; title: string }) {
  return (
    <span title={title} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1', className, count === 0 && 'opacity-40')}>
      <Icon className="h-3 w-3" />
      {count}
    </span>
  )
}

