'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ChevronRight,
  Download,
  MapPin,
  Search,
  Sparkles,
  TrendingDown,
  UserPlus,
  Users,
} from 'lucide-react'
import type { Level, Site, Student, StudentStats } from '@/types'
import { FadeIn } from '@/components/ui/FadeIn'

interface Props {
  sites: Site[]
  levels: Level[]
  students: Student[]
  stats: StudentStats | null
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Actif', color: 'text-emerald-700', bg: 'bg-emerald-50 ring-emerald-200' },
  trial: { label: 'Essai', color: 'text-amber-700', bg: 'bg-amber-50 ring-amber-200' },
  suspended: { label: 'Suspendu', color: 'text-orange-700', bg: 'bg-orange-50 ring-orange-200' },
  departed: { label: 'Parti', color: 'text-slate-500', bg: 'bg-slate-100 ring-slate-200' },
}

export function ElevesContent({ sites, levels, students, stats }: Props) {
  const s = stats ?? {
    total: 0,
    active: 0,
    trial: 0,
    departed: 0,
    suspended: 0,
    bySite: [],
    byLevel: [],
    byDay: [],
    monthlyEvolution: [],
  }
  const [search, setSearch] = useState('')
  const [filterSite, setFilterSite] = useState('all')
  const [filterStatus, setFilterStatus] = useState('active')
  const [filterLevel, setFilterLevel] = useState('all')

  const filtered = useMemo(() => students.filter((student) => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || student.first_name.toLowerCase().includes(q)
      || student.last_name.toLowerCase().includes(q)
      || (student.family?.parent1_last ?? '').toLowerCase().includes(q)
      || (student.family?.parent1_first ?? '').toLowerCase().includes(q)
    const matchSite = filterSite === 'all' || student.site_id === filterSite
    const matchStatus = filterStatus === 'all' || student.status === filterStatus
    const matchLevel = filterLevel === 'all' || student.level_id === filterLevel
    return matchSearch && matchSite && matchStatus && matchLevel
  }), [students, search, filterSite, filterStatus, filterLevel])

  const followUpCount = s.trial + s.suspended
  function exportStudentsCsv() {
    const rows = filtered.map((student) => ({
      prenom: student.first_name,
      nom: student.last_name,
      niveau: student.level?.name ?? '',
      site: student.site?.name ?? '',
      statut: STATUS_LABELS[student.status]?.label ?? student.status,
      famille: student.family?.parent1_last ?? '',
      inscription: student.enrollment_date,
    }))
    const headers = ['prenom', 'nom', 'niveau', 'site', 'statut', 'famille', 'inscription']
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
    link.download = 'eleves-teacher-khati.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="border-b border-border bg-card px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Eleves</h1>
              <p className="text-sm text-muted-foreground">
                {s.active + s.trial} actifs ou en essai - {s.departed} partis
              </p>
            </div>
          </div>
          <Link
            href="/eleves/new"
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700"
          >
            <UserPlus className="h-4 w-4" />
            Inscrire un eleve
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl space-y-6 px-6 py-6">
        <FadeIn>
          <section className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Suivi intelligent</p>
                  <h2 className="mt-1 text-lg font-semibold text-violet-950">Priorite eleves</h2>
                  <p className="mt-1 text-sm text-violet-800/80">
                    {followUpCount > 0
                      ? `${followUpCount} eleve${followUpCount > 1 ? 's' : ''} a suivre en priorite: essais ou suspensions.`
                      : 'Aucun signal sensible: la base eleves est stable.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={exportStudentsCsv}
                  className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                <Link
                  href="/finances"
                  className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
                >
                  <AlertCircle className="h-4 w-4" />
                  Voir paiements
                </Link>
              </div>
            </div>
          </section>
        </FadeIn>

        <FadeIn>
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard
              label="Eleves actifs"
              value={s.active + s.trial}
              sub={`dont ${s.trial} en essai`}
              icon={<Users className="h-5 w-5" />}
              color="violet"
            />
            <KpiCard
              label="Sites"
              value={sites.length}
              sub={sites.length > 0 ? 'configures' : 'a configurer'}
              icon={<MapPin className="h-5 w-5" />}
              color="blue"
            />
            <KpiCard
              label="Departs"
              value={s.departed}
              sub="depuis la rentree"
              icon={<TrendingDown className="h-5 w-5" />}
              color="slate"
            />
          </div>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Repartition par niveau</h2>
                <p className="text-xs text-muted-foreground">Pour reperer rapidement les groupes a equilibrer.</p>
              </div>
              <Link href="/settings/groups" className="text-xs font-medium text-violet-600 hover:underline">
                Ajuster les groupes
              </Link>
            </div>
            <div className="flex flex-wrap gap-3">
              {s.byLevel.map(({ level, count }) => (
                <div key={level.id} className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5">
                  <span className="text-lg">{level.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{level.name}</p>
                    <p className="text-xs text-muted-foreground">{count} eleve{count > 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un eleve ou parent..."
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>

            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectCls}>
              <option value="all">Tous statuts</option>
              <option value="active">Actifs</option>
              <option value="trial">En essai</option>
              <option value="suspended">Suspendus</option>
              <option value="departed">Partis</option>
            </select>

            <select value={filterSite} onChange={(e) => setFilterSite(e.target.value)} className={selectCls}>
              <option value="all">Tous sites</option>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>

            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className={selectCls}>
              <option value="all">Tous niveaux</option>
              {levels.map((level) => <option key={level.id} value={level.id}>{level.emoji} {level.name}</option>)}
            </select>

            <span className="ml-auto text-sm text-muted-foreground">
              {filtered.length} resultat{filtered.length > 1 ? 's' : ''}
            </span>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card py-20 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Aucun eleve trouve</p>
              <p className="mt-1 text-sm text-muted-foreground">Modifiez les filtres ou inscrivez un nouvel eleve.</p>
              <Link
                href="/eleves/new"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700"
              >
                <UserPlus className="h-4 w-4" />
                Inscrire un eleve
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Eleve</th>
                    <th className="hidden px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Niveau</th>
                    <th className="hidden px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Site</th>
                    <th className="hidden px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">Inscription</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((student) => {
                    const st = STATUS_LABELS[student.status] ?? STATUS_LABELS.active!
                    return (
                      <tr key={student.id} className="group transition-colors hover:bg-background">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                              {student.first_name[0]}{student.last_name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{student.first_name} {student.last_name}</p>
                              {student.family && <p className="text-xs text-muted-foreground">Famille {student.family.parent1_last}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-5 py-4 sm:table-cell">
                          {student.level ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                              <span>{student.level.emoji}</span>
                              {student.level.name}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="hidden px-5 py-4 md:table-cell">
                          <span className="text-sm text-foreground">{student.site?.name ?? '-'}</span>
                        </td>
                        <td className="hidden px-5 py-4 lg:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {new Date(student.enrollment_date).toLocaleDateString('fr-FR')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${st.bg} ${st.color}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link href={`/eleves/${student.id}`} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-violet-600 transition-colors hover:bg-violet-50">
                            Fiche
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
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
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string
  value: number
  sub: string
  icon: React.ReactNode
  color: string
}) {
  const colors: Record<string, string> = {
    violet: 'bg-violet-50 text-violet-600',
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    slate: 'bg-slate-100 text-slate-500',
  }
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none text-foreground">{value}</p>
        <p className="mt-1 text-sm font-medium leading-tight text-foreground">{label}</p>
        <p className="text-xs leading-tight text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}

const selectCls = 'rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30'
