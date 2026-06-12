'use client'

import Link from 'next/link'
import { BookOpen, Users, MapPin, Calendar, GraduationCap, Wallet, Clock, ArrowRight } from 'lucide-react'
import type { AcademicYear, Group, Invoice, Level, Site, StudentStats } from '@/types'
import { SiteSection } from './SiteSection'
import { EmptyState } from '@/components/ui/EmptyState'
import { FadeIn } from '@/components/ui/FadeIn'
import { DAY_LABELS } from '@/types'

interface DashboardContentProps {
  sites: Site[]
  levels: Level[]
  groupsBySite: Record<string, Group[]>
  academicYear: AcademicYear | null
  totalGroups: number
  studentStats: StudentStats | null
  schedulesByDay: Record<number, unknown[]>
  invoices: Invoice[]
}

export function DashboardContent({
  sites,
  levels,
  groupsBySite,
  academicYear,
  totalGroups,
  studentStats,
  schedulesByDay,
  invoices,
}: DashboardContentProps) {
  if (sites.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          illustration="sites"
          title="Aucun site configuré"
          description="Commencez par créer votre premier site (Maison-Alfort, Champigny…) pour pouvoir organiser vos groupes et générer des résumés."
          action={{ label: 'Créer un site', href: '/settings/sites' }}
          secondaryAction={{ label: 'En savoir plus', href: '/settings/groups', variant: 'secondary' }}
        />
      </div>
    )
  }

  // Aujourd'hui (0=Lundi … 6=Dimanche)
  const jsDay = new Date().getDay()
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1
  const todaySlots = (schedulesByDay[todayIdx] ?? []) as Array<{ start_time: string; end_time: string; group?: { name?: string } }>

  // Finances
  const totalPaid = invoices.reduce((s, i) => s + i.amount_paid, 0)
  const overdueCount = invoices.filter(i => i.status === 'overdue').length

  return (
    <div className="p-6 space-y-8">

      {/* ── Bloc 1 : Stats pédagogie ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <MapPin className="h-4 w-4" />,    label: 'Sites actifs',    value: sites.length,              color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-300' },
          { icon: <Users className="h-4 w-4" />,     label: 'Groupes totaux',  value: totalGroups,               color: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-300' },
          { icon: <BookOpen className="h-4 w-4" />,  label: 'Niveaux',         value: levels.length,             color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300' },
          { icon: <Calendar className="h-4 w-4" />,  label: 'Année scolaire',  value: academicYear?.name ?? '—', color: 'text-violet-600 bg-violet-50 dark:bg-violet-950 dark:text-violet-300', isText: true },
        ].map((stat, i) => (
          <FadeIn key={stat.label} delay={i * 50} from="bottom">
            <StatCard {...stat} />
          </FadeIn>
        ))}
      </div>

      {/* ── Bloc 2 : KPIs École (élèves + finances + planning today) ── */}
      {(studentStats || invoices.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Élèves */}
          {studentStats && (
            <FadeIn delay={80} from="bottom">
              <Link href="/eleves" className="block rounded-2xl border border-border bg-card p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-300 flex items-center justify-center">
                      <GraduationCap className="h-4.5 w-4.5" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Élèves</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">{studentStats.active}</p>
                <p className="text-xs text-muted-foreground">élèves actifs</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 py-2">
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{studentStats.trial}</p>
                    <p className="text-xs text-muted-foreground">essai</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 py-2">
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{studentStats.departed}</p>
                    <p className="text-xs text-muted-foreground">partis</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 py-2">
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{studentStats.total}</p>
                    <p className="text-xs text-muted-foreground">total</p>
                  </div>
                </div>
              </Link>
            </FadeIn>
          )}

          {/* Finances */}
          {invoices.length > 0 && (
            <FadeIn delay={120} from="bottom">
              <Link href="/finances" className="block rounded-2xl border border-border bg-card p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                      <Wallet className="h-4.5 w-4.5" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Finances</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">{totalPaid.toFixed(0)} €</p>
                <p className="text-xs text-muted-foreground">encaissé cette année</p>
                {overdueCount > 0 && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 px-3 py-2.5">
                    <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                    <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                      {overdueCount} facture{overdueCount > 1 ? 's' : ''} en retard
                    </p>
                  </div>
                )}
                {overdueCount === 0 && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 px-3 py-2.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                      Aucun impayé en cours
                    </p>
                  </div>
                )}
              </Link>
            </FadeIn>
          )}

          {/* Planning aujourd'hui */}
          <FadeIn delay={160} from="bottom">
            <Link href="/planning" className="block rounded-2xl border border-border bg-card p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-300 flex items-center justify-center">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Planning — {DAY_LABELS[todayIdx]}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              {todaySlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">Pas de cours aujourd&apos;hui.</p>
              ) : (
                <div className="space-y-2">
                  {todaySlots.slice(0, 4).map((slot, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2">
                      <span className="text-xs font-mono font-semibold text-sky-700 dark:text-sky-300 shrink-0">
                        {slot.start_time.slice(0, 5)}
                      </span>
                      <span className="text-xs text-foreground truncate">
                        {(slot.group as { name?: string } | undefined)?.name ?? 'Cours'}
                      </span>
                    </div>
                  ))}
                  {todaySlots.length > 4 && (
                    <p className="text-xs text-muted-foreground pl-1">+{todaySlots.length - 4} autres créneaux</p>
                  )}
                </div>
              )}
              {todaySlots.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">{todaySlots.length} créneau{todaySlots.length > 1 ? 'x' : ''} au total</p>
              )}
            </Link>
          </FadeIn>
        </div>
      )}

      {/* ── Sections par site (groupes) ── */}
      {sites.map((site, i) => (
        <FadeIn key={site.id} delay={250 + i * 80} from="bottom">
          <SiteSection
            site={site}
            levels={levels}
            groups={groupsBySite[site.id] ?? []}
          />
        </FadeIn>
      ))}
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  color: string
  isText?: boolean
}

function StatCard({ icon, label, value, color, isText }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3 transition-shadow hover:shadow-sm">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={`font-semibold truncate ${isText ? 'text-base mt-0.5' : 'text-2xl'}`}>
          {value}
        </p>
      </div>
    </div>
  )
}
