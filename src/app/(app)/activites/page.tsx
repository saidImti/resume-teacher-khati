import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ActivityCard, SKILL_LABELS } from '@/components/activites/ActivityCard'
import type { Activity, Level } from '@/types'

// ─── Page ──────────────────────────────────────────────────────────────────────

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

  // Charger les niveaux pour les filtres
  const { data: levels } = await supabase
    .from('levels')
    .select('id, name, emoji, slug')
    .order('sort_order')

  // Charger les activités
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

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Activités"
        subtitle={`${items.length} activité${items.length !== 1 ? 's' : ''}`}
        action={{ label: 'Nouvelle activité', href: '/activites/new' }}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Filtres */}
        <FilterBar levels={levelsList} current={filters} />

        {/* Grille */}
        {items.length === 0 ? (
          <EmptyState hasFilters={Object.values(filters).some(Boolean)} />
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {items.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

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
    <div className="space-y-2 mb-2">
      {/* Niveaux */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href="/activites"
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            !current.levelId && !current.skill
              ? 'bg-primary text-primary-foreground'
              : 'bg-accent hover:bg-accent/80 text-muted-foreground'
          }`}
        >
          Tous
        </Link>
        {levels.map((level) => (
          <Link
            key={level.id}
            href={buildHref('levelId', current.levelId === level.id ? '' : level.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              current.levelId === level.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-accent hover:bg-accent/80 text-muted-foreground'
            }`}
          >
            {level.emoji} {level.name}
          </Link>
        ))}
      </div>

      {/* Compétences */}
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => {
          const meta = SKILL_LABELS[skill]
          if (!meta) return null
          const isActive = current.skill === skill
          return (
            <Link
              key={skill}
              href={buildHref('skill', isActive ? '' : skill)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                isActive ? meta.color + ' ring-1 ring-current' : 'bg-accent hover:bg-accent/80 text-muted-foreground'
              }`}
            >
              {meta.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center mt-4">
      <div className="text-5xl mb-4">🎯</div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {hasFilters ? 'Aucune activité trouvée' : 'Bibliothèque vide'}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        {hasFilters
          ? 'Essayez de modifier vos filtres.'
          : 'Créez votre première activité pour enrichir vos résumés.'}
      </p>
      {!hasFilters && (
        <Link
          href="/activites/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground
            text-sm font-medium hover:bg-primary/90 transition"
        >
          + Nouvelle activité
        </Link>
      )}
    </div>
  )
}
