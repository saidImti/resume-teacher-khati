import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BarChart3, BookOpen, Clock3, Plus, Search, Sparkles, Target } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ActivityCard, SKILL_LABELS } from '@/components/activites/ActivityCard'
import type { Activity, Level } from '@/types'

interface PageProps {
  searchParams: Promise<{
    levelId?: string
    skill?: string
    q?: string
  }>
}

export default async function ActivitesPage({ searchParams }: PageProps) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const filters = await searchParams

  const { data: levels } = await supabase
    .from('levels')
    .select('id, name, emoji, slug')
    .order('sort_order')

  let query = supabase
    .from('activities')
    .select('*')
    .order('usage_count', { ascending: false })
    .order('name')

  if (filters.skill) query = query.contains('skills', [filters.skill])
  if (filters.levelId) query = query.contains('level_ids', [filters.levelId])
  if (filters.q) query = query.ilike('name', `%${filters.q}%`)

  const { data: activities } = await query
  const items = (activities ?? []) as Activity[]
  const levelsList = (levels ?? []) as Level[]
  const hasFilters = Object.values(filters).some(Boolean)
  const avgDuration = Math.round(
    items.reduce((sum, item) => sum + (item.duration_min ?? 0), 0) / Math.max(items.filter((item) => item.duration_min).length, 1)
  )
  const topSkill = Object.keys(SKILL_LABELS)
    .map((skill) => ({ skill, count: items.filter((item) => item.skills.includes(skill as Activity['skills'][number])).length }))
    .sort((a, b) => b.count - a.count)[0]

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header
        title="Activites"
        subtitle={`${items.length} activite${items.length !== 1 ? 's' : ''}`}
        action={{ label: 'Nouvelle activite', href: '/activites/new' }}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Bibliotheque pedagogique</p>
                <h2 className="mt-1 text-xl font-semibold text-foreground">Choisir vite la bonne activite</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Recherchez par niveau ou competence pour construire un cours plus naturellement.
                </p>
              </div>
              <Link
                href="/activites/new"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Ajouter une activite
              </Link>
            </div>

            <form className="mt-5 flex flex-wrap gap-3" action="/activites">
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  name="q"
                  defaultValue={filters.q ?? ''}
                  placeholder="Rechercher une activite..."
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              {filters.levelId && <input type="hidden" name="levelId" value={filters.levelId} />}
              {filters.skill && <input type="hidden" name="skill" value={filters.skill} />}
              <button className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background">
                Rechercher
              </button>
              {hasFilters && (
                <Link href="/activites" className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent">
                  Effacer
                </Link>
              )}
            </form>
          </section>

          <section className="grid gap-3 md:grid-cols-4">
            <LibraryStat label="Activites" value={items.length} helper="dans la selection" icon={BookOpen} />
            <LibraryStat label="Duree moyenne" value={avgDuration || 0} helper="minutes" icon={Clock3} />
            <LibraryStat label="Top competence" value={topSkill?.count ?? 0} helper={topSkill ? SKILL_LABELS[topSkill.skill]?.label ?? topSkill.skill : 'aucune'} icon={Target} />
            <LibraryStat label="Usage" value={items.reduce((sum, item) => sum + item.usage_count, 0)} helper="utilisations" icon={BarChart3} />
          </section>

          <FilterBar levels={levelsList} current={filters} />

          {items.length === 0 ? (
            <EmptyState hasFilters={hasFilters} />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((activity) => <ActivityCard key={activity.id} activity={activity} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterBar({
  levels,
  current,
}: {
  levels: Level[]
  current: { levelId?: string; skill?: string; q?: string }
}) {
  const skills = Object.keys(SKILL_LABELS)

  const buildHref = (key: string, value: string) => {
    const params = new URLSearchParams()
    if (current.levelId && key !== 'levelId') params.set('levelId', current.levelId)
    if (current.skill && key !== 'skill') params.set('skill', current.skill)
    if (current.q && key !== 'q') params.set('q', current.q)
    if (value) params.set(key, value)
    const qs = params.toString()
    return `/activites${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap gap-1.5">
        <FilterLink href="/activites" active={!current.levelId && !current.skill} label="Tous" />
        {levels.map((level) => (
          <FilterLink
            key={level.id}
            href={buildHref('levelId', current.levelId === level.id ? '' : level.id)}
            active={current.levelId === level.id}
            label={`${level.emoji} ${level.name}`}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => {
          const meta = SKILL_LABELS[skill]
          if (!meta) return null
          return (
            <FilterLink
              key={skill}
              href={buildHref('skill', current.skill === skill ? '' : skill)}
              active={current.skill === skill}
              label={meta.label}
            />
          )
        })}
      </div>
    </div>
  )
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
        active ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground hover:bg-accent/80 hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  )
}

function LibraryStat({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string
  value: number
  helper: string
  icon: React.ElementType
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{helper}</p>
    </div>
  )
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">
        {hasFilters ? 'Aucune activite trouvee' : 'Bibliotheque vide'}
      </h3>
      <p className="mb-6 max-w-xs text-sm text-muted-foreground">
        {hasFilters
          ? 'Essayez de modifier vos filtres.'
          : 'Creez votre premiere activite pour enrichir vos resumes.'}
      </p>
      {!hasFilters && (
        <Link href="/activites/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Nouvelle activite
        </Link>
      )}
    </div>
  )
}
