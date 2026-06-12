'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, FileText, Calendar, Filter, Loader2,
  ChevronRight, RefreshCw, BookMarked, ExternalLink,
  CheckCircle2, Edit3, Clock, Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Level, Site } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResumeListItem {
  id: string
  title: string
  intro: string | null
  body_text: string | null
  status: string
  version: number
  created_at: string
  updated_at: string
  session: {
    id: string
    session_date: string
    title: string | null
    theme: string | null
    group: {
      id: string
      name: string
      level: { id: string; name: string; slug: string; emoji: string; color: string }
      site:  { id: string; name: string; slug: string; color: string }
    }
  } | null
}

interface TabBibliothequeProps {
  levels: Level[]
  sites:  Site[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  draft:    { label: 'Brouillon', icon: Edit3,         color: 'bg-slate-100 text-slate-600 border-slate-200' },
  reviewed: { label: 'Relu',      icon: Clock,         color: 'bg-amber-50 text-amber-700 border-amber-200'  },
  approved: { label: 'Approuvé',  icon: CheckCircle2,  color: 'bg-green-50 text-green-700 border-green-200'  },
  sent:     { label: 'Envoyé',    icon: Send,          color: 'bg-blue-50 text-blue-700 border-blue-200'     },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function relativeDate(iso: string): string {
  const diff   = Date.now() - new Date(iso).getTime()
  const days   = Math.floor(diff / 86_400_000)
  const weeks  = Math.floor(days / 7)
  const months = Math.floor(days / 30.44)
  if (days === 0)   return 'Aujourd\'hui'
  if (days === 1)   return 'Hier'
  if (days < 7)     return `Il y a ${days}j`
  if (weeks < 5)    return `Il y a ${weeks} sem.`
  if (months < 12)  return `Il y a ${months} mois`
  return new Date(iso).getFullYear().toString()
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function TabBibliotheque({ levels, sites }: TabBibliothequeProps) {
  const [resumes, setResumes]     = useState<ResumeListItem[]>([])
  const [total, setTotal]         = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)

  // Filtres
  const [search, setSearch]       = useState('')
  const [levelId, setLevelId]     = useState('')
  const [siteId, setSiteId]       = useState('')
  const [status, setStatus]       = useState('')
  const [page, setPage]           = useState(1)

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setIsLoading(true); setError(null)
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (levelId)         params.set('levelId', levelId)
    if (siteId)          params.set('siteId', siteId)
    if (status)          params.set('status', status)
    params.set('page', String(page))
    params.set('limit', '20')

    try {
      const res  = await fetch(`/api/resumes/list?${params.toString()}`)
      const data = await res.json() as {
        resumes?: ResumeListItem[]; total?: number; error?: string
      }
      if (!res.ok) { setError(data.error ?? 'Erreur de chargement.'); return }
      setResumes(data.resumes ?? [])
      setTotal(data.total ?? 0)
    } catch { setError('Erreur réseau.') }
    finally  { setIsLoading(false) }
  }, [debouncedSearch, levelId, siteId, status, page])

  useEffect(() => { void load() }, [load])

  // Reset page on filter change
  function setFilter(fn: () => void) { fn(); setPage(1) }

  return (
    <div className="space-y-6">

      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-2xl shrink-0">
          📚
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Bibliothèque des résumés</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Retrouvez tous vos résumés de cours par niveau, site ou statut.
              </p>
            </div>
            <button type="button" onClick={() => void load()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <RefreshCw className="h-3.5 w-3.5" />Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* ── Barre de recherche + stats ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un résumé…"
            className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2.5 text-sm
              placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
        {!isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
            <BookMarked className="h-4 w-4" />
            <span><strong className="text-foreground">{total}</strong> résumé{total !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* ── Filtres ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

        {/* Niveaux */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter(() => setLevelId(''))}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-all border',
              !levelId ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-transparent hover:border-border'
            )}>
            Tous les niveaux
          </button>
          {levels.map((lvl) => (
            <button key={lvl.id} type="button"
              onClick={() => setFilter(() => setLevelId(levelId === lvl.id ? '' : lvl.id))}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all border',
                levelId === lvl.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-transparent hover:border-border'
              )}>
              {lvl.emoji} {lvl.name}
            </button>
          ))}
        </div>

        {/* Séparateur */}
        <div className="h-5 w-px bg-border" />

        {/* Sites */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter(() => setSiteId(''))}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-all border',
              !siteId ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-transparent hover:border-border'
            )}>
            Tous les sites
          </button>
          {sites.filter((s) => s.is_active).map((site) => (
            <button key={site.id} type="button"
              onClick={() => setFilter(() => setSiteId(siteId === site.id ? '' : site.id))}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all border',
                siteId === site.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-transparent hover:border-border'
              )}>
              📍 {site.name}
            </button>
          ))}
        </div>

        {/* Statuts */}
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button key={key} type="button"
              onClick={() => setFilter(() => setStatus(status === key ? '' : key))}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all border',
                status === key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-transparent hover:border-border'
              )}>
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu ─────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Chargement de la bibliothèque…</span>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          {error}
        </div>
      ) : resumes.length === 0 ? (
        <EmptyState search={debouncedSearch} />
      ) : (
        <div className="space-y-2">
          {resumes.map((resume) => (
            <ResumeCard key={resume.id} resume={resume} />
          ))}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {!isLoading && total > 20 && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40 hover:bg-muted/50 transition-colors">
            ← Précédent
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {Math.ceil(total / 20)}
          </span>
          <button
            type="button"
            disabled={page * 20 >= total}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40 hover:bg-muted/50 transition-colors">
            Suivant →
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Carte résumé ─────────────────────────────────────────────────────────────

function ResumeCard({ resume }: { resume: ResumeListItem }) {
  const session   = resume.session
  const group     = session?.group
  const level     = group?.level
  const site      = group?.site
  const statusCfg = STATUS_CONFIG[resume.status] ?? STATUS_CONFIG.draft!
  const StatusIcon = statusCfg.icon

  return (
    <a href={`/resumes/${resume.id}`}
      className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4
        hover:border-primary/30 hover:shadow-sm hover:bg-muted/20 transition-all group">

      {/* Icône */}
      <div className="h-10 w-10 rounded-xl bg-primary/8 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/12 transition-colors">
        <FileText className="h-4 w-4" />
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
            {resume.title}
          </p>
          <span className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', statusCfg.color)}>
            <StatusIcon className="h-3 w-3" />
            {statusCfg.label}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {level && (
            <span className="text-xs text-muted-foreground">
              {level.emoji} {level.name}
            </span>
          )}
          {group && (
            <span className="text-xs text-muted-foreground">
              · {group.name}
            </span>
          )}
          {site && (
            <span className="text-xs text-muted-foreground">
              · 📍 {site.name}
            </span>
          )}
          {session?.session_date && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDate(session.session_date)}
            </span>
          )}
        </div>

        {resume.intro && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {resume.intro}
          </p>
        )}
      </div>

      {/* Date relative + flèche */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {relativeDate(resume.updated_at)}
        </span>
        <div className="flex items-center gap-1">
          {resume.version > 1 && (
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
              v{resume.version}
            </span>
          )}
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
        </div>
      </div>
    </a>
  )
}

// ─── État vide ────────────────────────────────────────────────────────────────

function EmptyState({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">
        📚
      </div>
      {search ? (
        <>
          <p className="text-sm font-semibold">Aucun résumé trouvé</p>
          <p className="text-sm text-muted-foreground">
            Aucun résumé ne correspond à &quot;{search}&quot;.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold">Votre bibliothèque est vide</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Les résumés de cours que vous générez apparaîtront ici. Importez votre premier Padlet dans l&apos;onglet&nbsp;
            <strong>Mes Padlets</strong> pour commencer.
          </p>
          <a href="/mes-padlets"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            Importer un Padlet <ChevronRight className="h-4 w-4" />
          </a>
        </>
      )}
    </div>
  )
}
