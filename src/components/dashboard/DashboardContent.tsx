'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  MapPin,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import type { AcademicYear, Group, Invoice, Level, Schedule, Site, StudentStats } from '@/types'
import { DAY_LABELS } from '@/types'
import { SiteSection } from './SiteSection'
import { EmptyState } from '@/components/ui/EmptyState'
import { FadeIn } from '@/components/ui/FadeIn'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

type QuickAction = {
  label: string
  description: string
  href: string
  icon: React.ElementType
  tone: string
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
  const jsDay = new Date().getDay()
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1
  const todayLabel = DAY_LABELS[todayIdx] ?? 'Jour'
  const todaySlots = ((schedulesByDay[todayIdx] ?? []) as Schedule[])
    .slice()
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  const activeStudents = studentStats?.active ?? 0
  const trialStudents = studentStats?.trial ?? 0
  const totalStudents = studentStats?.total ?? 0
  const activeOrTrialStudents = activeStudents + trialStudents
  const studentFill = totalStudents > 0
    ? Math.min(100, Math.round((activeOrTrialStudents / totalStudents) * 100))
    : 0

  const totalDue = invoices.reduce((sum, invoice) => sum + invoice.amount_due, 0)
  const totalPaid = invoices.reduce((sum, invoice) => sum + invoice.amount_paid, 0)
  const overdueCount = invoices.filter((invoice) => invoice.status === 'overdue').length
  const pendingCount = invoices.filter((invoice) => invoice.status === 'pending' || invoice.status === 'partial').length
  const financeFill = totalDue > 0 ? Math.min(100, Math.round((totalPaid / totalDue) * 100)) : 100

  const siteLoad = sites.map((site) => ({
    site,
    groups: groupsBySite[site.id]?.length ?? 0,
    students: studentStats?.bySite.find((entry) => entry.site.id === site.id)?.active ?? 0,
  }))

  const quickActions: QuickAction[] = [
    {
      label: 'Nouveau résumé',
      description: 'Créer le compte-rendu du cours',
      href: '/resumes/new',
      icon: Sparkles,
      tone: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900',
    },
    {
      label: 'Ajouter un élève',
      description: 'Inscription, famille, niveau',
      href: '/eleves/new',
      icon: GraduationCap,
      tone: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900',
    },
    {
      label: 'Planning',
      description: 'Voir les créneaux de la semaine',
      href: '/planning',
      icon: Calendar,
      tone: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900',
    },
    {
      label: 'Finances',
      description: 'Suivre factures et paiements',
      href: '/finances',
      icon: Wallet,
      tone: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900',
    },
  ]

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <FadeIn from="bottom">
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
              <div className="p-5 sm:p-6">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Ecole en pilotage
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                    {academicYear?.name ?? 'Année scolaire à configurer'}
                  </span>
                </div>

                <div className="max-w-3xl">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    Tableau de bord Teacher Khati
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Une vue claire pour lancer les cours, suivre les élèves, garder les finances sous contrôle et retrouver les groupes sans perdre de temps.
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <HeroMetric icon={MapPin} label="Sites" value={sites.length} helper="lieux actifs" />
                  <HeroMetric icon={Users} label="Groupes" value={totalGroups} helper="classes suivies" />
                  <HeroMetric icon={BookOpen} label="Niveaux" value={levels.length} helper="parcours" />
                  <HeroMetric icon={Clock3} label="Aujourd'hui" value={todaySlots.length} helper="créneaux" />
                </div>
              </div>

              <div className="border-t border-border bg-muted/30 p-5 sm:p-6 lg:border-l lg:border-t-0">
                <div className="flex h-full flex-col justify-between gap-5">
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <LayoutDashboard className="h-4 w-4 text-primary" />
                      Prochain mouvement
                    </div>
                    {todaySlots.length > 0 ? (
                      <TodayMiniCard slot={todaySlots[0]!} />
                    ) : (
                      <div className="rounded-xl border border-dashed border-border bg-background/70 p-4">
                        <p className="text-sm font-medium">Pas de cours aujourd'hui</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Profitez-en pour préparer les prochains résumés ou ranger les groupes.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href="/resumes/new">
                        <Plus className="h-4 w-4" />
                        Nouveau cours
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/archives">Archives</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </FadeIn>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action, index) => (
            <FadeIn key={action.href} delay={index * 45} from="bottom">
              <QuickActionCard action={action} />
            </FadeIn>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <FadeIn delay={80} from="bottom">
            <Panel title="Rythme du jour" icon={Clock3} actionLabel="Voir planning" href="/planning">
              {todaySlots.length === 0 ? (
                <EmptyPanelText
                  title={`Aucun cours ce ${todayLabel.toLowerCase()}`}
                  description="Le planning est calme. Vous pouvez anticiper les supports ou vérifier les prochaines factures."
                />
              ) : (
                <div className="space-y-2">
                  {todaySlots.slice(0, 5).map((slot) => (
                    <ScheduleRow key={slot.id} slot={slot} />
                  ))}
                  {todaySlots.length > 5 && (
                    <Link href="/planning" className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-primary">
                      +{todaySlots.length - 5} autres créneaux
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}
            </Panel>
          </FadeIn>

          <FadeIn delay={120} from="bottom">
            <Panel title="Santé de l'école" icon={TrendingUp}>
              <div className="space-y-4">
                <ProgressSummary
                  label="Élèves actifs ou en essai"
                  value={`${activeOrTrialStudents}/${totalStudents || 0}`}
                  percent={studentFill}
                  tone="bg-emerald-500"
                  helper={studentStats ? `${studentStats.departed} départ${studentStats.departed > 1 ? 's' : ''}, ${studentStats.suspended} suspendu${studentStats.suspended > 1 ? 's' : ''}` : 'Aucune donnée élève'}
                />
                <ProgressSummary
                  label="Encaissement annuel"
                  value={`${formatMoney(totalPaid)} / ${formatMoney(totalDue)}`}
                  percent={financeFill}
                  tone={overdueCount > 0 ? 'bg-rose-500' : 'bg-sky-500'}
                  helper={overdueCount > 0 ? `${overdueCount} facture${overdueCount > 1 ? 's' : ''} en retard` : `${pendingCount} facture${pendingCount > 1 ? 's' : ''} à suivre`}
                />
              </div>
            </Panel>
          </FadeIn>
        </section>

        {sites.length === 0 && (
          <FadeIn delay={130} from="bottom">
            <section className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-5 sm:p-6">
              <EmptyState
                illustration="sites"
                title="Premier paramétrage de l'école"
                description="Créez vos sites, ajoutez les groupes, puis le dashboard se remplira automatiquement avec le planning, les élèves et les finances."
                action={{ label: 'Créer un site', href: '/settings/sites' }}
                secondaryAction={{ label: 'Préparer les groupes', href: '/settings/groups', variant: 'secondary' }}
              />
            </section>
          </FadeIn>
        )}

        <section className="grid gap-4 xl:grid-cols-3">
          <FadeIn delay={150} from="bottom">
            <Panel title="Élèves par niveau" icon={GraduationCap} actionLabel="Voir élèves" href="/eleves">
              {studentStats && studentStats.byLevel.some((entry) => entry.count > 0) ? (
                <div className="space-y-3">
                  {studentStats.byLevel
                    .filter((entry) => entry.count > 0)
                    .map(({ level, count }) => (
                      <LevelLoadRow key={level.id} level={level} count={count} max={activeOrTrialStudents || count} />
                    ))}
                </div>
              ) : (
                <EmptyPanelText title="Aucun élève classé" description="Les niveaux apparaîtront ici dès que les élèves seront renseignés." />
              )}
            </Panel>
          </FadeIn>

          <FadeIn delay={190} from="bottom">
            <Panel title="Sites et charge" icon={MapPin} actionLabel="Configurer" href="/settings/sites">
              <div className="space-y-3">
                {siteLoad.map(({ site, groups, students }) => (
                  <SiteLoadRow key={site.id} site={site} groups={groups} students={students} />
                ))}
              </div>
            </Panel>
          </FadeIn>

          <FadeIn delay={230} from="bottom">
            <Panel title="Points d'attention" icon={AlertTriangle}>
              <div className="space-y-2">
                <AttentionItem
                  good={overdueCount === 0}
                  label={overdueCount === 0 ? 'Aucun impaye critique' : `${overdueCount} facture${overdueCount > 1 ? 's' : ''} en retard`}
                  href="/finances"
                />
                <AttentionItem
                  good={todaySlots.length > 0}
                  label={todaySlots.length > 0 ? `${todaySlots.length} cours au programme` : 'Journée sans cours'}
                  href="/planning"
                />
                <AttentionItem
                  good={totalGroups > 0}
                  label={totalGroups > 0 ? `${totalGroups} groupes organises` : 'Aucun groupe actif'}
                  href="/settings/groups"
                />
              </div>
            </Panel>
          </FadeIn>
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Organisation pedagogique
              </p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Groupes par site</h2>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/groups/new">
                <Plus className="h-4 w-4" />
                Nouveau groupe
              </Link>
            </Button>
          </div>

          {sites.length > 0 ? (
            sites.map((site, index) => (
              <FadeIn key={site.id} delay={260 + index * 65} from="bottom">
                <SiteSection
                  site={site}
                  levels={levels}
                  groups={groupsBySite[site.id] ?? []}
                />
              </FadeIn>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              Les groupes apparaîtront ici dès qu'un site sera configuré.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function HeroMetric({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  helper: string
}) {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="pb-1 text-[11px] text-muted-foreground">{helper}</p>
      </div>
    </div>
  )
}

function QuickActionCard({ action }: { action: QuickAction }) {
  const Icon = action.icon

  return (
    <Link
      href={action.href}
      className="group flex h-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', action.tone)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{action.label}</p>
          <p className="truncate text-xs text-muted-foreground">{action.description}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  )
}

function Panel({
  title,
  icon: Icon,
  children,
  actionLabel,
  href,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  actionLabel?: string
  href?: string
}) {
  return (
    <div className="h-full rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {href && actionLabel && (
          <Link href={href} className="shrink-0 text-xs font-medium text-primary hover:underline">
            {actionLabel}
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

function TodayMiniCard({ slot }: { slot: Schedule }) {
  return (
    <Link href="/planning" className="block rounded-xl border border-border bg-background p-4 transition hover:border-primary/40">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Prochain cours</p>
      <p className="mt-2 text-lg font-semibold text-foreground">
        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
      </p>
      <p className="mt-1 truncate text-sm text-muted-foreground">
        {slot.group?.name ?? 'Cours planifie'}
        {slot.room ? ` - ${slot.room}` : ''}
      </p>
    </Link>
  )
}

function ScheduleRow({ slot }: { slot: Schedule }) {
  return (
    <Link
      href="/planning"
      className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 transition hover:border-primary/40"
    >
      <div className="w-16 shrink-0 rounded-lg bg-sky-50 px-2 py-1 text-center text-xs font-semibold text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
        {slot.start_time.slice(0, 5)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{slot.group?.name ?? 'Cours'}</p>
        <p className="truncate text-xs text-muted-foreground">
          {slot.end_time.slice(0, 5)}
          {slot.room ? ` - ${slot.room}` : ''}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

function ProgressSummary({
  label,
  value,
  percent,
  tone,
  helper,
}: {
  label: string
  value: string
  percent: number
  tone: string
  helper: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
    </div>
  )
}

function LevelLoadRow({ level, count, max }: { level: Level; count: number; max: number }) {
  const percent = Math.max(8, Math.round((count / Math.max(max, 1)) * 100))

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: level.color }} />
          <span className="truncate text-sm text-foreground">{level.name}</span>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: level.color }} />
      </div>
    </div>
  )
}

function SiteLoadRow({ site, groups, students }: { site: Site; groups: number; students: number }) {
  return (
    <Link href="/settings/groups" className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-primary/40">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${site.color}22`, color: site.color }}>
          <MapPin className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{site.name}</p>
          <p className="text-xs text-muted-foreground">{groups} groupe{groups > 1 ? 's' : ''}</p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-foreground">{students}</p>
        <p className="text-xs text-muted-foreground">élèves</p>
      </div>
    </Link>
  )
}

function AttentionItem({ good, label, href }: { good: boolean; label: string; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-primary/40">
      <div className="flex min-w-0 items-center gap-2">
        {good ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
        )}
        <span className="truncate text-sm text-foreground">{label}</span>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

function EmptyPanelText({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-background/60 p-4">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  )
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}
