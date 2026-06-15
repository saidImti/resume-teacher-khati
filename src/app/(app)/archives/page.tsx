import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Archive, CheckCircle2, Clock3, FileText, Search, Send, Sparkles } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/ui/EmptyState'
import { FadeIn } from '@/components/ui/FadeIn'
import type { Level, Site } from '@/types'

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

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Brouillon', color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300', icon: Clock3 },
  reviewed: { label: 'Revise', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300', icon: CheckCircle2 },
  approved: { label: 'Approuve', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', icon: CheckCircle2 },
  sent: { label: 'Envoye', color: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300', icon: Send },
}

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

  const [sitesRes, levelsRes] = await Promise.all([
    supabase.from('sites').select('*').eq('is_active', true).order('name'),
    supabase.from('levels').select('*').order('sort_order'),
  ])

  const sites = (sitesRes.data ?? []) as Site[]
  const levels = (levelsRes.data ?? []) as Level[]

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
    .limit(150)

  if (filters.status) query = query.eq('status', filters.status)

  const { data: rawResumes } = await query
  let resumes = (rawResumes ?? []) as unknown as ResumeRow[]

  if (filters.siteId) resumes = resumes.filter((r) => r.session?.group?.site?.id === filters.siteId)
  if (filters.levelSlug) resumes = resumes.filter((r) => r.session?.group?.level?.slug === filters.levelSlug)
  if (filters.q) {
    const q = filters.q.toLowerCase()
    resumes = resumes.filter((r) =>
      r.title.toLowerCase().includes(q)
      || r.session?.group?.name.toLowerCase().includes(q)
      || r.session?.group?.site?.name.toLowerCase().includes(q)
    )
  }

  const hasFilters = Object.values(filters).some(Boolean)
  const sentCount = resumes.filter((resume) => resume.status === 'sent').length
  const draftCount = resumes.filter((resume) => resume.status === 'draft').length
  const approvedCount = resumes.filter((resume) => resume.status === 'approved').length

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Archives" subtitle={`${resumes.length} resume${resumes.length !== 1 ? 's' : ''}`} />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl space-y-5">
          <FadeIn>
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Memoire pedagogique</p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">Retrouver, verifier, reutiliser</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Les archives deviennent un vrai centre de recherche pour les anciens cours.
                  </p>
                </div>
                <Link
                  href="/resumes/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  <Sparkles className="h-4 w-4" />
                  Nouveau resume
                </Link>
              </div>

              <form className="mt-5 flex flex-wrap gap-3" action="/archives">
                <div className="relative min-w-[240px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    name="q"
                    defaultValue={filters.q ?? ''}
                    placeholder="Rechercher un titre, groupe, site..."
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {filters.siteId && <input type="hidden" name="siteId" value={filters.siteId} />}
                {filters.levelSlug && <input type="hidden" name="levelSlug" value={filters.levelSlug} />}
                {filters.status && <input type="hidden" name="status" value={filters.status} />}
                <button className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background">
                  Rechercher
                </button>
                {hasFilters && (
                  <Link href="/archives" className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent">
                    Effacer
                  </Link>
                )}
              </form>
            </section>
          </FadeIn>

          <FadeIn delay={40}>
            <section className="grid gap-3 md:grid-cols-4">
              <ArchiveStat label="Total" value={resumes.length} helper="archives visibles" icon={Archive} />
              <ArchiveStat label="Envoyes" value={sentCount} helper="partages aux parents" icon={Send} />
              <ArchiveStat label="Approuves" value={approvedCount} helper="prets a envoyer" icon={CheckCircle2} />
              <ArchiveStat label="Brouillons" value={draftCount} helper="a finaliser" icon={Clock3} />
            </section>
          </FadeIn>

          <FadeIn delay={70}>
            <FilterBar sites={sites} levels={levels} current={filters} />
          </FadeIn>

          {resumes.length === 0 ? (
            <FadeIn delay={100}>
              <EmptyState
                illustration={hasFilters ? 'search' : 'archives'}
                title={hasFilters ? 'Aucun resume trouve' : 'Aucun resume archive'}
                description={hasFilters
                  ? 'Essayez de modifier vos filtres pour voir plus de resultats.'
                  : 'Les resumes generes apparaitront ici apres validation.'}
                action={!hasFilters ? { label: 'Creer un resume', href: '/resumes/new' } : undefined}
                secondaryAction={hasFilters ? { label: 'Effacer les filtres', href: '/archives', variant: 'secondary' as const } : undefined}
              />
            </FadeIn>
          ) : (
            <div className="space-y-2">
              {resumes.map((resume, index) => (
                <FadeIn key={resume.id} delay={index * 25}>
                  <ResumeCard resume={resume} />
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterBar({
  sites,
  levels,
  current,
}: {
  sites: Site[]
  levels: Level[]
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
    <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap gap-1.5">
        <FilterLink href="/archives" active={!current.siteId && !current.levelSlug && !current.status} label="Tout" />
        {sites.map((site) => (
          <FilterLink key={site.id} href={buildHref('siteId', current.siteId === site.id ? '' : site.id)} active={current.siteId === site.id} label={site.name} />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {levels.map((level) => (
          <FilterLink key={level.id} href={buildHref('levelSlug', current.levelSlug === level.slug ? '' : level.slug)} active={current.levelSlug === level.slug} label={`${level.emoji} ${level.name}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(STATUS_LABELS).map(([status, meta]) => (
          <FilterLink key={status} href={buildHref('status', current.status === status ? '' : status)} active={current.status === status} label={meta.label} />
        ))}
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

function ArchiveStat({
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

function ResumeCard({ resume }: { resume: ResumeRow }) {
  const group = resume.session?.group
  const statusMeta = STATUS_LABELS[resume.status] ?? STATUS_LABELS.draft!
  const StatusIcon = statusMeta.icon
  const date = resume.session?.session_date
    ? new Date(resume.session.session_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '-'

  return (
    <Link
      href={`/archives/${resume.id}`}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:border-primary/20 hover:bg-accent/40"
      aria-label={`Voir le resume : ${resume.title}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl" aria-hidden="true">
        {group?.level?.emoji ?? <FileText className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{resume.title}</p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {group?.name ?? 'Groupe inconnu'}
          {group?.site && <span className="ml-1.5 opacity-70">- {group.site.name}</span>}
          <span className="ml-1.5 opacity-70">- {date}</span>
        </p>
      </div>
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta.color}`}>
        <StatusIcon className="h-3 w-3" />
        {statusMeta.label}
      </span>
      <span className="shrink-0 text-muted-foreground/40 transition group-hover:text-muted-foreground" aria-hidden="true">
        →
      </span>
    </Link>
  )
}
