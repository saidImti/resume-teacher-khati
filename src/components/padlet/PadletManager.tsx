'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Trash2, Loader2, AlertCircle, ChevronLeft,
  Sparkles, RefreshCw, Search, X, ArrowUpDown, Calendar,
  Pin, Wifi, FolderOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { PadletViewer } from './PadletViewer'
import type { LessonItem } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GroupOption {
  id: string; name: string; levelName: string
  levelSlug: string; siteId: string; siteName: string
}

interface ApiBoard {
  id: string; title: string; webUrl: string
  createdAt?: string | null; updatedAt?: string | null
}

export interface SavedBoard {
  id: string; padletId?: string; url: string; title: string; savedAt: string
}

export interface FetchedBoard {
  board: { id: string; title: string; url: string }
  items: LessonItem[]
  theme: string
}

interface DisplayBoard {
  key: string; padletId?: string; url: string; title: string
  date?: string; source: 'api' | 'manual'; localId?: string
}

interface TimeGroup { label: string; emoji: string; boards: DisplayBoard[] }

type SortKey = 'recent' | 'oldest' | 'az' | 'za' | 'grouped'

interface PadletManagerProps { groups: GroupOption[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'teacher_khati_padlets_v1'

function loadBoards(): SavedBoard[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as SavedBoard[] }
  catch { return [] }
}
function persistBoards(b: SavedBoard[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(b)) }
function todayISO() { return new Date().toISOString().split('T')[0]! }

function relativeDate(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  const weeks = Math.floor(days / 7)
  const months= Math.floor(days / 30.44)
  const years = Math.floor(days / 365.25)
  if (mins < 2)    return "à l'instant"
  if (mins < 60)   return `il y a ${mins} min`
  if (hours < 24)  return `il y a ${hours}h`
  if (days < 7)    return `il y a ${days}j`
  if (weeks < 5)   return `il y a ${weeks} sem.`
  if (months < 12) return `il y a ${months} mois`
  return `il y a ${years} an${years > 1 ? 's' : ''}`
}

function getTimeGroup(iso: string): { label: string; emoji: string; order: number } {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days < 1)   return { label: "Aujourd'hui",    emoji: '⚡', order: 0 }
  if (days < 7)   return { label: 'Cette semaine',  emoji: '📅', order: 1 }
  if (days < 30)  return { label: 'Ce mois-ci',     emoji: '🗓️',  order: 2 }
  if (days < 90)  return { label: 'Il y a 3 mois',  emoji: '📆', order: 3 }
  if (days < 180) return { label: 'Il y a 6 mois',  emoji: '🗃️',  order: 4 }
  if (days < 365) return { label: 'Cette année',    emoji: '📂', order: 5 }
  const year = new Date(iso).getFullYear()
  return { label: String(year), emoji: '🗄️', order: 6 + (new Date().getFullYear() - year) }
}

const GRADIENTS = [
  'from-rose-400 to-pink-600',    'from-orange-400 to-amber-600',
  'from-amber-400 to-yellow-500', 'from-lime-400 to-green-600',
  'from-emerald-400 to-teal-600', 'from-teal-400 to-cyan-600',
  'from-cyan-400 to-sky-600',     'from-sky-400 to-blue-600',
  'from-blue-400 to-indigo-600',  'from-indigo-400 to-violet-600',
  'from-violet-400 to-purple-600','from-purple-400 to-fuchsia-600',
  'from-fuchsia-400 to-pink-600', 'from-red-400 to-rose-600',
  'from-orange-300 to-red-500',   'from-yellow-400 to-orange-600',
  'from-green-400 to-emerald-600','from-teal-300 to-green-500',
  'from-sky-300 to-teal-500',     'from-blue-300 to-sky-500',
  'from-indigo-300 to-blue-500',  'from-violet-300 to-indigo-500',
  'from-purple-300 to-violet-500','from-pink-300 to-purple-500',
  'from-rose-300 to-pink-500',    'from-amber-300 to-lime-500',
]
const getGradient = (t: string) => GRADIENTS[t.toUpperCase().charCodeAt(0) % GRADIENTS.length]!

// ─── Composant principal ──────────────────────────────────────────────────────

export function PadletManager({ groups }: PadletManagerProps) {
  const [savedBoards, setSavedBoards]     = useState<SavedBoard[]>([])
  const [apiBoards, setApiBoards]         = useState<ApiBoard[]>([])
  const [apiConfigured, setApiConfigured] = useState(false)
  const [isLoadingApi, setIsLoadingApi]   = useState(true)
  const [apiError, setApiError]           = useState<string | null>(null)

  const [searchQuery, setSearchQuery]     = useState('')
  const [sortKey, setSortKey]             = useState<SortKey>('grouped')
  const [selectedYear, setSelectedYear]   = useState<number | null>(null)

  const [addUrl, setAddUrl]               = useState('')
  const [isAdding, setIsAdding]           = useState(false)
  const [showAddForm, setShowAddForm]     = useState(false)

  const [activeBoard, setActiveBoard]     = useState<FetchedBoard | null>(null)
  const [isFetching, setIsFetching]       = useState(false)
  const [fetchError, setFetchError]       = useState<string | null>(null)

  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? '')
  const [sessionDate, setSessionDate]         = useState(todayISO)

  useEffect(() => {
    setSavedBoards(loadBoards())
    void loadApiBoards()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadApiBoards() {
    setIsLoadingApi(true); setApiError(null)
    try {
      const data = await fetch('/api/padlet/my-boards').then((r) => r.json()) as {
        configured?: boolean; boards?: ApiBoard[]; apiError?: string
      }
      setApiConfigured(data.configured ?? false)
      setApiBoards(data.boards ?? [])
      if (data.apiError) setApiError(data.apiError)
    } catch { setApiConfigured(false) }
    finally  { setIsLoadingApi(false) }
  }

  // ── Données unifiées ─────────────────────────────────────────────────────────
  const allBoards = useMemo((): DisplayBoard[] => [
    ...apiBoards.map((b) => ({
      key: `api-${b.id}`, padletId: b.id, url: b.webUrl, title: b.title,
      date: b.updatedAt ?? b.createdAt ?? undefined, source: 'api' as const,
    })),
    ...savedBoards.map((b) => ({
      key: `manual-${b.id}`, padletId: b.padletId, url: b.url, title: b.title,
      date: b.savedAt, source: 'manual' as const, localId: b.id,
    })),
  ], [apiBoards, savedBoards])

  const availableYears = useMemo(() => {
    const s = new Set<number>()
    allBoards.forEach((b) => { if (b.date) s.add(new Date(b.date).getFullYear()) })
    return [...s].sort((a, b) => b - a)
  }, [allBoards])

  const filtered = useMemo((): DisplayBoard[] =>
    allBoards.filter((b) => {
      const q = searchQuery.trim().toLowerCase()
      if (q && !b.title.toLowerCase().includes(q) && !b.url.toLowerCase().includes(q)) return false
      if (selectedYear !== null) {
        if (!b.date || new Date(b.date).getFullYear() !== selectedYear) return false
      }
      return true
    }), [allBoards, searchQuery, selectedYear])

  const sorted = useMemo((): DisplayBoard[] =>
    [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'az': return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' })
        case 'za': return b.title.localeCompare(a.title, 'fr', { sensitivity: 'base' })
        case 'oldest':
          if (!a.date && !b.date) return a.title.localeCompare(b.title, 'fr')
          if (!a.date) return 1; if (!b.date) return -1
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        default:
          if (!a.date && !b.date) return a.title.localeCompare(b.title, 'fr')
          if (!a.date) return 1; if (!b.date) return -1
          return new Date(b.date).getTime() - new Date(a.date).getTime()
      }
    }), [filtered, sortKey])

  const timeGroups = useMemo((): TimeGroup[] => {
    if (sortKey !== 'grouped') return []
    const map = new Map<string, { emoji: string; order: number; boards: DisplayBoard[] }>()
    for (const b of sorted) {
      const { label, emoji, order } = b.date ? getTimeGroup(b.date) : { label: 'Sans date', emoji: '📌', order: 99 }
      if (!map.has(label)) map.set(label, { emoji, order, boards: [] })
      map.get(label)!.boards.push(b)
    }
    return [...map.entries()].sort(([, a], [, b]) => a.order - b.order)
      .map(([label, { emoji, boards }]) => ({ label, emoji, boards }))
  }, [sorted, sortKey])

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function handleOpen(board: DisplayBoard) {
    if (board.padletId) {
      await openViaApi({ id: board.padletId, title: board.title, webUrl: board.url })
    } else {
      const saved = savedBoards.find((b) => b.id === board.localId)
      if (saved) await openViaScraping(saved)
    }
  }

  async function openViaApi(b: { id: string; title: string; webUrl: string }) {
    setIsFetching(true); setFetchError(null); setActiveBoard(null)
    try {
      const res  = await fetch(`/api/padlet/board/${b.id}`)
      const data = await res.json() as { error?: string; structuredItems?: LessonItem[]; boardTitle?: string }
      if (!res.ok) { setFetchError(data.error ?? 'Impossible de charger ce Padlet.'); return }
      setActiveBoard({ board: { id: b.id, title: data.boardTitle ?? b.title, url: b.webUrl },
        items: (data.structuredItems ?? []).map((i) => ({ ...i, selected: true })), theme: data.boardTitle ?? b.title })
    } catch { setFetchError('Erreur réseau.') } finally { setIsFetching(false) }
  }

  async function openViaScraping(b: SavedBoard) {
    setIsFetching(true); setFetchError(null); setActiveBoard(null)
    try {
      const res  = await fetch('/api/padlet/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: b.url }),
      })
      const data = await res.json() as { error?: string; structuredItems?: LessonItem[]; boardTitle?: string }
      if (!res.ok) { setFetchError(data.error ?? 'Impossible de charger ce Padlet.'); return }
      setActiveBoard({ board: { id: b.id, title: data.boardTitle ?? b.title, url: b.url },
        items: (data.structuredItems ?? []).map((i) => ({ ...i, selected: true })), theme: data.boardTitle ?? b.title })
    } catch { setFetchError('Erreur réseau.') } finally { setIsFetching(false) }
  }

  async function handleAdd() {
    const url = addUrl.trim(); if (!url) return
    setIsAdding(true)
    try {
      const res  = await fetch('/api/padlet/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }),
      })
      const data = await res.json() as { error?: string; boardTitle?: string }
      if (!res.ok) { toast.error(data.error ?? "Padlet inaccessible."); return }
      const nb: SavedBoard = { id: Math.random().toString(36).slice(2, 10), url,
        title: data.boardTitle ?? 'Padlet sans titre', savedAt: new Date().toISOString() }
      const upd = [nb, ...savedBoards]; setSavedBoards(upd); persistBoards(upd)
      setAddUrl(''); setShowAddForm(false)
      toast.success(`✅ "${nb.title}" ajouté !`)
    } catch { toast.error('Erreur réseau.') } finally { setIsAdding(false) }
  }

  function handleRemove(localId: string, title: string) {
    const upd = savedBoards.filter((b) => b.id !== localId)
    setSavedBoards(upd); persistBoards(upd); toast.success(`"${title}" supprimé`)
  }

  function handleYearSelect(year: number | null) {
    setSelectedYear(year)
    if (year !== null && sortKey === 'grouped') setSortKey('recent')
  }

  // ── États spéciaux ───────────────────────────────────────────────────────────
  if (isFetching) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="relative">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">📌</div>
        <Loader2 className="absolute -bottom-1 -right-1 h-6 w-6 animate-spin text-primary bg-background rounded-full p-0.5" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">Chargement du Padlet…</p>
        <p className="text-sm text-muted-foreground mt-0.5">Récupération du contenu en cours</p>
      </div>
    </div>
  )

  if (fetchError) return (
    <div className="space-y-4 max-w-2xl">
      <Button variant="outline" size="sm" onClick={() => setFetchError(null)}>
        <ChevronLeft className="h-4 w-4" />Retour
      </Button>
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-destructive">{fetchError}</p>
          <p className="text-sm text-destructive/70 mt-1">Vérifiez que vous êtes administrateur de ce Padlet.</p>
        </div>
      </div>
    </div>
  )

  if (activeBoard) return (
    <PadletViewer
      board={activeBoard} groups={groups}
      selectedGroupId={selectedGroupId} sessionDate={sessionDate}
      onGroupChange={setSelectedGroupId} onDateChange={setSessionDate}
      onBack={() => setActiveBoard(null)}
    />
  )

  // ── Variables d'affichage ────────────────────────────────────────────────────
  const totalCount  = allBoards.length
  const apiCount    = apiBoards.length
  const manualCount = savedBoards.length
  const isSearching = searchQuery.trim().length > 0
  const hasFilter   = isSearching || selectedYear !== null

  const ALL_SORT: { key: SortKey; label: string }[] = [
    { key: 'grouped', label: '📅 Par période' },
    { key: 'recent',  label: '🕐 Plus récent' },
    { key: 'oldest',  label: '🕰️ Plus ancien'  },
    { key: 'az',      label: '🔤 A → Z'       },
    { key: 'za',      label: '🔤 Z → A'       },
  ]
  const SORT_OPTIONS = selectedYear !== null
    ? ALL_SORT.filter((o) => o.key !== 'grouped')
    : ALL_SORT

  // ── Card ─────────────────────────────────────────────────────────────────────
  function BoardCard({ board }: { board: DisplayBoard }) {
    const gradient = getGradient(board.title)
    const initial  = board.title.charAt(0).toUpperCase() || '?'
    return (
      <div
        className="group relative flex flex-col rounded-xl border border-border bg-card
          overflow-hidden hover:border-primary/40 hover:shadow-xl transition-all duration-200 cursor-pointer"
        onClick={() => void handleOpen(board)}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') void handleOpen(board) }}
      >
        {/* Bandeau visuel gradient */}
        <div className={`relative h-[88px] bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 overflow-hidden`}>
          {/* Motif décoratif */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-2 right-4 h-16 w-16 rounded-full bg-white/30" />
            <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-white/20" />
          </div>
          {/* Grande lettre */}
          <span className="relative text-5xl font-black text-white/25 select-none tracking-tight">{initial}</span>
          {/* Overlay hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">Ouvrir</span>
            </div>
          </div>
          {/* Badge source */}
          <div className="absolute top-2.5 right-2.5">
            {board.source === 'api' ? (
              <span className="flex items-center gap-1 rounded-full bg-black/30 backdrop-blur-sm text-white text-xs font-semibold px-1.5 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />API
              </span>
            ) : (
              <span className="rounded-full bg-black/25 backdrop-blur-sm text-white/80 text-xs font-medium px-1.5 py-0.5">Manuel</span>
            )}
          </div>
        </div>

        {/* Contenu */}
        <div className="flex flex-col flex-1 p-3.5 gap-2">
          <p className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {board.title}
          </p>
          <div className="flex items-center justify-between gap-2 mt-auto">
            {board.date ? (
              <span className="text-sm text-muted-foreground">{relativeDate(board.date)}</span>
            ) : (
              <span className="text-xs text-muted-foreground/50">—</span>
            )}
            {board.source === 'manual' && board.localId && (
              <button type="button" title="Supprimer"
                onClick={(e) => { e.stopPropagation(); handleRemove(board.localId!, board.title) }}
                className="text-muted-foreground/30 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {board.url && (
            <p className="text-xs text-muted-foreground/50 truncate -mt-1">
              {board.url.replace('https://padlet.com/', '').replace('https://', '')}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Rendu principal ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Erreur API ────────────────────────────────────────────────────── */}
      {apiError && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>{apiError}</span>
          <button onClick={() => setApiError(null)} className="ml-auto"><X className="h-3 w-3" /></button>
        </div>
      )}

      {/* ── Barre de stats (style Dashboard) ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Pin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Padlets</p>
            {isLoadingApi
              ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-0.5" />
              : <p className="text-2xl font-bold text-foreground">{totalCount}</p>}
          </div>
        </div>

        {/* API */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Wifi className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Via API Padlet</p>
            {isLoadingApi
              ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-0.5" />
              : <p className="text-2xl font-bold text-foreground">{apiCount}</p>}
          </div>
        </div>

        {/* Manuel */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <FolderOpen className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ajoutés manuellement</p>
            <p className="text-2xl font-bold text-foreground">{manualCount}</p>
          </div>
        </div>

        {/* Filtre actif / action rapide */}
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/3 p-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">Ajouter un Padlet</p>
            <p className="text-sm text-muted-foreground/70 mt-0.5">URL publique</p>
          </div>
          <Button size="sm" onClick={() => setShowAddForm((v) => !v)} className="shrink-0">
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddForm ? 'Annuler' : 'Ajouter'}
          </Button>
        </div>
      </div>

      {/* ── Formulaire ajout ───────────────────────────────────────────────── */}
      {showAddForm && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Entrez l&apos;URL d&apos;un Padlet public — ex&nbsp;:&nbsp;
            <code className="text-primary">https://padlet.com/khatijateach/mon-padlet</code>
          </p>
          <div className="flex gap-2">
            <input type="url" value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleAdd() } }}
              placeholder="https://padlet.com/khatijateach/..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm
                placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
            <Button onClick={() => void handleAdd()} disabled={isAdding || !addUrl.trim()}>
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Ajouter
            </Button>
          </div>
        </div>
      )}

      {/* ── Barre contrôles : recherche + tri + années + refresh ──────────── */}
      {totalCount > 0 && (
        <div className="space-y-3">
          {/* Ligne 1 : recherche + refresh */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input type="text" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un Padlet par titre…"
                className="w-full rounded-xl border border-border bg-background pl-9 pr-9 py-2.5 text-sm
                  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {apiConfigured && (
              <button type="button" onClick={() => void loadApiBoards()}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground
                  border border-border rounded-xl px-3 py-2.5 bg-background hover:bg-accent transition-all">
                <RefreshCw className="h-3.5 w-3.5" />
                Actualiser
              </button>
            )}
            {hasFilter && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {sorted.length} résultat{sorted.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Ligne 2 : tri */}
          <div className="flex items-center gap-2 flex-wrap">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {SORT_OPTIONS.map((opt) => (
              <button key={opt.key} type="button"
                onClick={() => {
                  setSortKey(opt.key)
                  if (opt.key === 'grouped') setSelectedYear(null)
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all whitespace-nowrap ${
                  sortKey === opt.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Ligne 3 : filtre par année (affiché si ≥ 2 années) */}
          {availableYears.length >= 2 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Année :</span>
              <button type="button" onClick={() => handleYearSelect(null)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  selectedYear === null
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}>
                Toutes
              </button>
              {availableYears.map((year) => {
                const count = allBoards.filter((b) => b.date && new Date(b.date).getFullYear() === year).length
                return (
                  <button key={year} type="button" onClick={() => handleYearSelect(year)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all flex items-center gap-1 ${
                      selectedYear === year
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    }`}>
                    {year}
                    <span className={`text-xs ${selectedYear === year ? 'opacity-70' : 'opacity-50'}`}>
                      ({count})
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Galerie ───────────────────────────────────────────────────────── */}
      {totalCount === 0 && !isLoadingApi ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center text-4xl">📌</div>
          <div>
            <p className="font-semibold text-foreground">Aucun Padlet enregistré</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiConfigured
                ? 'Vos Padlets API apparaîtront ici automatiquement.'
                : 'Ajoutez un Padlet via le bouton "Ajouter" ci-dessus.'}
            </p>
          </div>
        </div>
      ) : sorted.length === 0 && hasFilter ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Aucun résultat</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {selectedYear ? `Aucun Padlet en ${selectedYear}` : `Aucun résultat pour « ${searchQuery} »`}
            </p>
          </div>
          <button onClick={() => { setSearchQuery(''); setSelectedYear(null) }}
            className="text-xs text-primary hover:underline">
            Effacer les filtres
          </button>
        </div>
      ) : sortKey === 'grouped' && timeGroups.length > 0 ? (
        /* Mode groupé par période */
        <div className="space-y-8">
          {timeGroups.map((group) => (
            <div key={group.label} className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{group.emoji}</span>
                <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">
                  {group.boards.length} Padlet{group.boards.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {group.boards.map((b) => <BoardCard key={b.key} board={b} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Mode liste plat */
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {sorted.map((b) => <BoardCard key={b.key} board={b} />)}
        </div>
      )}

      {/* ── Guide clé API ─────────────────────────────────────────────────── */}
      {!isLoadingApi && !apiConfigured && (
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/3 px-5 py-4 flex items-center gap-4">
          <span className="text-2xl">🔑</span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Connectez l&apos;API Padlet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ajoutez <code className="bg-muted rounded px-1 font-mono text-primary">PADLET_API_TOKEN=votre_clé</code> dans{' '}
              <code className="bg-muted rounded px-1">.env.local</code> puis redémarrez.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
