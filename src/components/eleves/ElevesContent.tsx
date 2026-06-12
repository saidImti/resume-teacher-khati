'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Users, UserPlus, Search, TrendingDown,
  ChevronRight, MapPin,
} from 'lucide-react'
import type { Site, Level, Student, StudentStats } from '@/types'
import { FadeIn } from '@/components/ui/FadeIn'

interface Props {
  sites: Site[]
  levels: Level[]
  students: Student[]
  stats: StudentStats | null
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Actif',    color: 'text-emerald-700', bg: 'bg-emerald-50 ring-emerald-200' },
  trial:     { label: 'Essai',    color: 'text-amber-700',   bg: 'bg-amber-50 ring-amber-200'     },
  suspended: { label: 'Suspendu', color: 'text-orange-700',  bg: 'bg-orange-50 ring-orange-200'   },
  departed:  { label: 'Parti',    color: 'text-slate-500',   bg: 'bg-slate-100 ring-slate-200'    },
}

export function ElevesContent({ sites, levels, students, stats }: Props) {
  const s = stats ?? { total: 0, active: 0, trial: 0, departed: 0, suspended: 0, bySite: [], byLevel: [], byDay: [], monthlyEvolution: [] }
  const [search,       setSearch]       = useState('')
  const [filterSite,   setFilterSite]   = useState('all')
  const [filterStatus, setFilterStatus] = useState('active')
  const [filterLevel,  setFilterLevel]  = useState('all')

  const filtered = useMemo(() => {
    return students.filter(s => {
      const q = search.toLowerCase()
      const matchSearch = !q
        || s.first_name.toLowerCase().includes(q)
        || s.last_name.toLowerCase().includes(q)
        || (s.family?.parent1_last ?? '').toLowerCase().includes(q)
      const matchSite   = filterSite   === 'all' || s.site_id === filterSite
      const matchStatus = filterStatus === 'all' || s.status  === filterStatus
      const matchLevel  = filterLevel  === 'all' || s.level_id === filterLevel
      return matchSearch && matchSite && matchStatus && matchLevel
    })
  }, [students, search, filterSite, filterStatus, filterLevel])

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--color-text)]">Élèves</h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                {s.active + s.trial} actifs · {s.departed} partis
              </p>
            </div>
          </div>
          <Link
            href="/eleves/new"
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-700 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Inscrire un élève
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl w-full px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <FadeIn>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard
              label="Élèves actifs"
              value={s.active + s.trial}
              sub={`dont ${s.trial} en essai`}
              icon={<Users className="h-5 w-5" />}
              color="violet"
            />
            <KpiCard
              label="Maison-Alfort"
              value={s.bySite.find(b => b.site.slug === 'maison-alfort')?.active ?? 0}
              sub="élèves actifs"
              icon={<MapPin className="h-5 w-5" />}
              color="blue"
            />
            <KpiCard
              label="Champigny"
              value={s.bySite.find(b => b.site.slug === 'champigny')?.active ?? 0}
              sub="élèves actifs"
              icon={<MapPin className="h-5 w-5" />}
              color="indigo"
            />
            <KpiCard
              label="Départs (année)"
              value={s.departed}
              sub="depuis la rentrée"
              icon={<TrendingDown className="h-5 w-5" />}
              color="slate"
            />
          </div>
        </FadeIn>

        {/* Stats par niveau */}
        <FadeIn delay={0.05}>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Répartition par niveau</h2>
            <div className="flex flex-wrap gap-3">
              {s.byLevel.map(({ level, count }) => (
                <div
                  key={level.id}
                  className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5"
                >
                  <span className="text-lg">{level.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{level.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{count} élève{count > 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Filtres + recherche */}
        <FadeIn delay={0.08}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un élève ou parent…"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] pl-10 pr-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            >
              <option value="all">Tous statuts</option>
              <option value="active">Actifs</option>
              <option value="trial">En essai</option>
              <option value="suspended">Suspendus</option>
              <option value="departed">Partis</option>
            </select>

            <select
              value={filterSite}
              onChange={e => setFilterSite(e.target.value)}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            >
              <option value="all">Tous sites</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            >
              <option value="all">Tous niveaux</option>
              {levels.map(l => (
                <option key={l.id} value={l.id}>{l.emoji} {l.name}</option>
              ))}
            </select>

            <span className="ml-auto text-sm text-[var(--color-text-muted)]">
              {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
            </span>
          </div>
        </FadeIn>

        {/* Liste */}
        <FadeIn delay={0.1}>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-20 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-[var(--color-text-muted)]" />
              <p className="text-sm font-medium text-[var(--color-text)]">Aucun élève trouvé</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">Modifiez les filtres ou inscrivez un nouvel élève</p>
              <Link
                href="/eleves/new"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Inscrire un élève
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Élève</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hidden sm:table-cell">Niveau</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hidden md:table-cell">Site</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hidden lg:table-cell">Inscription</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Statut</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filtered.map(student => {
                    const st = STATUS_LABELS[student.status] ?? STATUS_LABELS['active']!
                    return (
                      <tr key={student.id} className="group hover:bg-[var(--color-bg)] transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700 shrink-0">
                              {student.first_name[0]}{student.last_name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[var(--color-text)]">
                                {student.first_name} {student.last_name}
                              </p>
                              {student.family && (
                                <p className="text-xs text-[var(--color-text-muted)]">
                                  Famille {student.family.parent1_last}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          {student.level ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text)]">
                              <span>{student.level.emoji}</span>
                              {student.level.name}
                            </span>
                          ) : (
                            <span className="text-sm text-[var(--color-text-muted)]">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className="text-sm text-[var(--color-text)]">
                            {student.site?.name ?? '—'}
                          </span>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <span className="text-sm text-[var(--color-text-muted)]">
                            {new Date(student.enrollment_date).toLocaleDateString('fr-FR')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${st!.bg} ${st!.color}`}>
                            {st!.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/eleves/${student.id}`}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 transition-colors"
                          >
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
  label, value, sub, icon, color,
}: {
  label: string; value: number; sub: string; icon: React.ReactNode; color: string
}) {
  const colors: Record<string, string> = {
    violet: 'bg-violet-50 text-violet-600',
    blue:   'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    slate:  'bg-slate-100 text-slate-500',
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
