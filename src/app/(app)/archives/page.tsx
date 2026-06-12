import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/ui/EmptyState'
import { FadeIn } from '@/components/ui/FadeIn'
import type { Site, Level } from '@/types'

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface ResumeRow {
  id: string
  title: string
  status: string
  created_at: string
  session: {
    session_date: string
    group: {
      id: string
      name: string
      site: Site
      level: Level
    } | null
  } | null
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:    { label: 'Brouillon',  color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
  reviewed: { label: 'Révisé',     color: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' },
  approved: { label: 'Approuvé',   color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' },
  sent:     { label: 'Envoyé',     color: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400' },
}

// ─── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    siteId?: string
    levelSlug?: string
    status?: string
    q?: string
  }>
}

export default async function ArchivesPage({ searchParams }: PageProps) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const filters = await searchParams

  // Charger les données de filtre
  const [sitesRes] = await Promise.all([
    supabase.from('sites').select('*').eq('is_active', true).order('name'),
  ])

  const sites = (sitesRes.data ?? []) as Site[]

  // Charger les résumés avec jointures
  let query = supabase
    .from('resumes')
    .select(`
      id,
      title,
      status,
      created_at,
      session:sessions(
        session_date,
        group:groups(
          id,
          name,
          site:sites(*),
          level:levels(*)
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters.status) query = query.eq('status', filters.status)

  const { data: rawResumes } = await query
  let resumes = (rawResumes ?? []) as unknown as ResumeRow[]

  // Filtres côté client pour les relations imbriquées
  if (filters.siteId) {
    resumes = resumes.filter((r) => r.session?.group?.site?.id === filters.siteId)
  }
  if (filters.levelSlug) {
    resumes = resumes.filter((r) => r.session?.group?.level?.slug === filters.levelSlug)
  }
  if (filters.q) {
    const q = filters.q.toLowerCase()
    resumes = resumes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.session?.group?.name.toLowerCase().includes(q)
    )
  }

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Archives" subtitle={`${resumes.length} résumé${resumes.length !== 1 ? 's' : ''}`} />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Filtres */}
        <FadeIn delay={0}>
          <FilterBar sites={sites} current={filters} />
        </FadeIn>

        {/* Liste */}
        {resumes.length === 0 ? (
          <FadeIn delay={100}>
            <EmptyState
              illustration={hasFilters ? 'search' : 'archives'}
              title={hasFilters ? 'Aucun résumé trouvé' : 'Aucun résumé archivé'}
              description={
                hasFilters
                  ? 'Essayez de modifier vos filtres pour voir plus de résultats.'
                  : 'Les résumés générés apparaîtront ici après validation et approbation.'
              }
              action={
                !hasFilters
                  ? { label: '✨ Créer un résumé', href: '/resumes/new' }
                  : undefined
              }
              secondaryAction={
                hasFilters
                  ? { label: 'Effacer les filtres', href: '/archives', variant: 'secondary' as const }
                  : undefined
              }
            />
          </FadeIn>
        ) : (
          <div className="mt-4 space-y-2">
            {resumes.map((resume, i) => (
              <FadeIn key={resume.id} delay={i * 40}>
                <ResumeCard resume={resume} />
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

function FilterBar({
  sites,
  current,
}: {
  sites: Site[]
  current: { siteId?: string; levelSlug?: string; status?: string; q?: string }
}) {
  const buildHref = (key: string, value: string) => {
    const params = new URLSearchParams()
    if (current.siteId && key !== 'siteId') params.set('siteId', current.siteId)
    if (current.levelSlug && key !== 'levelSlug') params.set('levelSlug', current.levelSlug)
    if (current.status && key !== 'status') params.set('status', current.status)
    if (current.q && key !== 'q') params.set('q', current.q)
    if (value) params.set(key, value)
    const qs = params.toString()
    return `/archives${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {/* Site */}
      <div className="flex gap-1.5 flex-wrap">
        <Link
          href="/archives"
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition btn-press ${
            !current.siteId ? 'bg-primary text-primary-foreground' : 'bg-accent hover:bg-accent/80 text-muted-foreground'
          }`}
        >
          Tous les sites
        </Link>
        {sites.map((s) => (
          <Link
            key={s.id}
            href={buildHref('siteId', s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition btn-press ${
              current.siteId === s.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-accent hover:bg-accent/80 text-muted-foreground'
            }`}
          >
            {s.name}
          </Link>
        ))}
      </div>

      {/* Séparateur */}
      <div className="h-6 w-px bg-border self-center" />

      {/* Statut */}
      {Object.entries(STATUS_LABELS).map(([status, meta]) => (
        <Link
          key={status}
          href={buildHref('status', current.status === status ? '' : status)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition btn-press ${
            current.status === status
              ? 'bg-primary text-primary-foreground'
              : 'bg-accent hover:bg-accent/80 text-muted-foreground'
          }`}
        >
          {meta.label}
        </Link>
      ))}
    </div>
  )
}

// ─── ResumeCard ───────────────────────────────────────────────────────────────

function ResumeCard({ resume }: { resume: ResumeRow }) {
  const group = resume.session?.group
  const statusMeta = STATUS_LABELS[resume.status] ?? STATUS_LABELS['draft']!
  const date = resume.session?.session_date
    ? new Date(resume.session.session_date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—'

  return (
    <Link
      href={`/archives/${resume.id}`}
      className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-card
        hover:bg-accent/40 hover:border-primary/20 transition-all group btn-press"
      aria-label={`Voir le résumé : ${resume.title}`}
    >
      {/* Emoji niveau */}
      <span className="text-xl shrink-0" aria-hidden="true">{group?.level?.emoji ?? '📄'}</span>

      {/* Infos principales */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{resume.title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {group?.name ?? 'Groupe inconnu'}
          {group?.site && <span className="ml-1.5 opacity-60">· {group.site.name}</span>}
          <span className="ml-1.5 opacity-60">· {date}</span>
        </p>
      </div>

      {/* Badge statut */}
      <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${statusMeta.color}`}>
        {statusMeta.label}
      </span>

      {/* Chevron */}
      <span className="text-muted-foreground/40 group-hover:text-muted-foreground transition shrink-0" aria-hidden="true">
        →
      </span>
    </Link>
  )
}
