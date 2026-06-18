'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ChevronRight,
  Download,
  Search,
  Sparkles,
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
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-5 sm:px-6">
        <FadeIn>
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid lg:grid-cols-[1fr_340px]">
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Vie scolaire</p>
                    <h1 className="mt-2 text-2xl font-semibold text-foreground">Pilotage des élèves</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      Effectifs, familles, niveaux et situations à suivre dans un registre unique, clair et immédiatement actionnable.
                    </p>
                  </div>
                  <Link
                    href="/eleves/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
                  >
                    <UserPlus className="h-4 w-4" />
                    Inscrire un élève
                  </Link>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <HeroMetric label="Effectif suivi" value={s.active + s.trial} helper={`${s.trial} en essai`} />
                  <HeroMetric label="Élèves actifs" value={s.active} helper="inscriptions actives" />
                  <HeroMetric label="Sites couverts" value={sites.length} helper="lieux d'enseignement" />
                  <HeroMetric label="Départs" value={s.departed} helper="depuis la rentrée" />
                </div>
              </div>
              <div className="border-t border-border bg-muted/30 p-5 sm:p-6 lg:border-l lg:border-t-0">
                <div className="flex h-full flex-col justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Priorité du moment
                    </div>
                    <div className="mt-3 rounded-xl border border-border bg-background/80 p-4">
                      <p className="text-lg font-semibold text-foreground">{followUpCount}</p>
                      <p className="mt-1 text-sm font-medium text-foreground">dossier{followUpCount > 1 ? 's' : ''} à surveiller</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {followUpCount > 0
                          ? 'Élèves en essai ou suspendus nécessitant une décision.'
                          : 'Aucun essai ni suspension en attente.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={exportStudentsCsv}
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent">
                      <Download className="h-3.5 w-3.5" /> Exporter
                    </button>
                    <Link href="/finances"
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent">
                      <AlertCircle className="h-3.5 w-3.5" /> Paiements
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="rounded-xl border border-border bg-card p-5">
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
                <div key={level.id} className="flex min-w-[150px] flex-1 items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
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
            <div className="relative min-w-[260px] flex-1">
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
            <div className="overflow-hidden rounded-xl border border-border bg-card">
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

function HeroMetric({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-2xl font-bold leading-none text-foreground">{value}</p>
        <p className="pb-0.5 text-right text-[11px] text-muted-foreground">{helper}</p>
      </div>
    </div>
  )
}

const selectCls = 'rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30'
