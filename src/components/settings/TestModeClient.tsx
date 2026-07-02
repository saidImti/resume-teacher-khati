'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  GraduationCap,
  MapPin,
  Minus,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { FadeIn } from '@/components/ui/FadeIn'
import type { TestDataStatus } from '@/lib/test-data'

interface Props {
  initialStatus: TestDataStatus | null
}

const SITES_COUNT = 3
const LEVELS_COUNT = 5

export function TestModeClient({ initialStatus }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [perGroup, setPerGroup] = useState(10)
  const [generating, setGenerating] = useState(false)
  const [purging, setPurging] = useState(false)

  const isActive = (status?.students ?? 0) > 0
  const totalToGenerate = perGroup * SITES_COUNT * LEVELS_COUNT
  const maxSiteCount = Math.max(1, ...(status?.bySite.map((s) => s.students) ?? [1]))
  const maxLevelCount = Math.max(1, ...(status?.byLevel.map((l) => l.students) ?? [1]))

  async function refresh() {
    try {
      const res = await fetch('/api/test-data')
      if (res.ok) setStatus(await res.json())
    } catch {
      // le statut affiché reste celui déjà connu
    }
  }

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/test-data/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentsPerGroup: perGroup }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Échec de la génération')
        return
      }
      toast.success(`${data.students} élèves créés`, {
        description: `${data.families} familles · ${data.groupsCreated} groupe(s) et ${data.schedulesCreated} créneau(x) ajoutés`,
      })
      await refresh()
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setGenerating(false)
    }
  }

  async function purge() {
    if (!confirm(
      `Supprimer toutes les données de test (${status?.families ?? 0} familles, ${status?.students ?? 0} élèves) ?\n\n` +
      `Les groupes et créneaux Mercredi/Samedi sont conservés — seules les familles fictives disparaissent.`
    )) return

    setPurging(true)
    try {
      const res = await fetch('/api/test-data', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Échec de la purge')
        return
      }
      toast.success('Laboratoire nettoyé', {
        description: `${data.families} familles, ${data.students} élèves et ${data.enrollments} inscriptions supprimés`,
      })
      await refresh()
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setPurging(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Hero : état du laboratoire ─────────────────────── */}
      <FadeIn from="bottom">
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {isActive ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                    <FlaskConical className="h-3.5 w-3.5" />
                    Mode Test actif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Base propre
                  </span>
                )}
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  Données fictives, purgeables à tout moment
                </span>
              </div>

              <div className="max-w-3xl">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Laboratoire de l&apos;école
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Mode Test
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Remplissez l&apos;école d&apos;élèves fictifs pour éprouver chaque module — Élèves, Planning, Présences,
                  numéros d&apos;inscription — puis nettoyez tout en un clic avant la vraie rentrée.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <HeroMetric icon={Users} label="Familles" value={status?.families ?? 0} helper="fictives" />
                <HeroMetric icon={GraduationCap} label="Élèves" value={status?.students ?? 0} helper="en test" />
                <HeroMetric icon={ClipboardCheck} label="Inscriptions" value={status?.enrollments ?? 0} helper="aux groupes" />
              </div>
            </div>

            <div className="border-t border-border bg-muted/30 p-5 sm:p-6 lg:border-l lg:border-t-0">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Explorer avec ces données
              </div>
              <div className="space-y-2">
                <ExploreLink href="/eleves" icon={GraduationCap} title="Élèves" description="Fiches, badges N° d'inscription" />
                <ExploreLink href="/planning" icon={CalendarDays} title="Planning" description="Créneaux Mercredi & Samedi" />
                <ExploreLink href="/presences" icon={ClipboardCheck} title="Présences" description="Appel par groupe" />
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ─── Parcours en 3 étapes ───────────────────────────── */}
      <section className="grid gap-3 lg:grid-cols-3">
        {/* Étape 1 — Générer */}
        <FadeIn delay={45} from="bottom">
          <StepCard
            step="01"
            title="Générer"
            description="Un lot d'élèves fictifs sur les 3 sites et les 5 niveaux, cours le mercredi et le samedi."
            tone="border-primary/20 bg-primary/5"
          >
            <div className="mt-4 space-y-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Élèves par site × niveau</p>
                <div className="inline-flex items-center rounded-lg border border-border bg-background">
                  <button
                    type="button"
                    onClick={() => setPerGroup((v) => Math.max(1, v - 1))}
                    disabled={perGroup <= 1}
                    aria-label="Diminuer"
                    className="btn-press flex h-9 w-9 items-center justify-center rounded-l-lg text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center text-sm font-bold tabular-nums text-foreground">{perGroup}</span>
                  <button
                    type="button"
                    onClick={() => setPerGroup((v) => Math.min(30, v + 1))}
                    disabled={perGroup >= 30}
                    aria-label="Augmenter"
                    className="btn-press flex h-9 w-9 items-center justify-center rounded-r-lg text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void generate()}
                disabled={generating}
                className="btn-press inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {generating ? 'Génération en cours…' : `Générer ${totalToGenerate} élèves`}
              </button>
              <p className="text-center text-[11px] text-muted-foreground">
                {SITES_COUNT} sites × {LEVELS_COUNT} niveaux × {perGroup} — relançable sans doublon
              </p>
            </div>
          </StepCard>
        </FadeIn>

        {/* Étape 2 — Vérifier */}
        <FadeIn delay={90} from="bottom">
          <StepCard
            step="02"
            title="Vérifier"
            description="Parcourez les modules remplis et contrôlez que tout se comporte comme attendu."
            tone="border-border bg-card"
          >
            <div className="mt-4 space-y-2">
              <ChecklistItem done={isActive} label="Des élèves peuplent l'école" />
              <ChecklistItem done={isActive} label="Numéros d'inscription attribués" />
              <ChecklistItem done={isActive} label="Créneaux mercredi & samedi en place" />
            </div>
          </StepCard>
        </FadeIn>

        {/* Étape 3 — Purger */}
        <FadeIn delay={135} from="bottom">
          <StepCard
            step="03"
            title="Purger"
            description="Avant la vraie rentrée : suppression des familles fictives. Groupes et créneaux conservés."
            tone="border-rose-200/60 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/10"
          >
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-border bg-background/70 p-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <p className="text-xs leading-5 text-muted-foreground">
                  Action irréversible sur les données fictives uniquement — les vraies inscriptions ne sont jamais touchées.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void purge()}
                disabled={purging || !isActive}
                className="btn-press inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50"
              >
                <Trash2 className="h-4 w-4" />
                {purging ? 'Purge en cours…' : 'Purger les données de test'}
              </button>
              {!isActive && (
                <p className="text-center text-[11px] text-muted-foreground">Rien à purger — la base est propre.</p>
              )}
            </div>
          </StepCard>
        </FadeIn>
      </section>

      {/* ─── Répartition ────────────────────────────────────── */}
      {isActive && (
        <section className="grid gap-4 lg:grid-cols-2">
          <FadeIn delay={180} from="bottom">
            <Panel title="Répartition par site" icon={MapPin}>
              <div className="space-y-3">
                {status!.bySite.map((row) => (
                  <DistributionRow
                    key={row.site}
                    label={row.site}
                    count={row.students}
                    max={maxSiteCount}
                    color={row.color}
                  />
                ))}
              </div>
            </Panel>
          </FadeIn>

          <FadeIn delay={225} from="bottom">
            <Panel title="Répartition par niveau" icon={GraduationCap}>
              <div className="space-y-3">
                {status!.byLevel.map((row) => (
                  <DistributionRow
                    key={row.level}
                    label={`${row.emoji} ${row.level}`}
                    count={row.students}
                    max={maxLevelCount}
                    color={row.color}
                  />
                ))}
              </div>
            </Panel>
          </FadeIn>
        </section>
      )}
    </div>
  )
}

/* ─── Sous-composants (vocabulaire du dashboard) ─────────── */

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
        <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
        <p className="pb-1 text-[11px] text-muted-foreground">{helper}</p>
      </div>
    </div>
  )
}

function ExploreLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  )
}

function StepCard({
  step,
  title,
  description,
  tone,
  children,
}: {
  step: string
  title: string
  description: string
  tone: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('flex h-full flex-col rounded-xl border p-4 sm:p-5', tone)}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-sm font-bold tabular-nums text-foreground">
          {step}
        </span>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition',
        done
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
          : 'border-border bg-background text-muted-foreground'
      )}
    >
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="h-full rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function DistributionRow({
  label,
  count,
  max,
  color,
}: {
  label: string
  count: number
  max: number
  color: string
}) {
  const percent = Math.max(8, Math.round((count / Math.max(max, 1)) * 100))

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate text-sm text-foreground">{label}</span>
        </div>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
