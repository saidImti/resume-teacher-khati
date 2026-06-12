'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Sparkles, CheckSquare, Square, ExternalLink,
  Check, ChevronDown, ChevronUp, Tag, LayoutList, Plus, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { LessonItem, LevelSlug, LessonContentType } from '@/types'
import type { GroupOption, FetchedBoard } from './PadletManager'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PadletViewerProps {
  board:           FetchedBoard
  groups:          GroupOption[]
  selectedGroupId: string
  sessionDate:     string
  onGroupChange:   (id: string) => void
  onDateChange:    (date: string) => void
  onBack:          () => void
}

type ViewMode = 'split' | 'level'

interface ManualItem {
  id:       string
  name:     string
  type:     LessonContentType
  link?:    string
  selected: boolean
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const LEVEL_ORDER: LevelSlug[] = ['preschoolers', 'kids', 'juniors', 'tweens', 'teenagers']

const LEVEL_META: Record<string, { emoji: string; label: string; color: string; text: string }> = {
  preschoolers: { emoji: '🌟', label: 'Preschoolers (3-5)',  color: 'border-yellow-400/60 bg-yellow-100 dark:border-yellow-600/50 dark:bg-yellow-950/60', text: 'text-yellow-900 dark:text-yellow-200' },
  kids:         { emoji: '🚀', label: 'Kids (6-8)',          color: 'border-blue-400/60 bg-blue-100 dark:border-blue-600/50 dark:bg-blue-950/60',          text: 'text-blue-900 dark:text-blue-200'    },
  juniors:      { emoji: '📖', label: 'Juniors (9-11)',      color: 'border-green-400/60 bg-green-100 dark:border-green-600/50 dark:bg-green-950/60',       text: 'text-green-900 dark:text-green-200'  },
  tweens:       { emoji: '⚡', label: 'Tweens (12-14)',      color: 'border-violet-400/60 bg-violet-100 dark:border-violet-600/50 dark:bg-violet-950/60',   text: 'text-violet-900 dark:text-violet-200'},
  teenagers:    { emoji: '🎓', label: 'Teenagers (15-18)',   color: 'border-rose-400/60 bg-rose-100 dark:border-rose-600/50 dark:bg-rose-950/60',           text: 'text-rose-900 dark:text-rose-200'    },
  all:          { emoji: '🌈', label: 'Tous niveaux',        color: 'border-gray-400/60 bg-gray-100 dark:border-gray-600/50 dark:bg-gray-900/60',           text: 'text-gray-900 dark:text-gray-200'    },
}

interface CatMeta {
  emoji:    string
  label:    string
  sublabel: string
  hasLink:  boolean
}

const CAT_META: Record<LessonContentType, CatMeta> = {
  activity: { emoji: '📝', label: 'Activités',            sublabel: 'Exercices et travaux pratiques',    hasLink: false },
  song:     { emoji: '🎵', label: 'Comptines & Chansons', sublabel: 'Chansons éducatives et comptines',  hasLink: true  },
  video:    { emoji: '🎬', label: 'Vidéos & Audios',      sublabel: 'Vidéos pédagogiques et audios',     hasLink: true  },
  game:     { emoji: '🎮', label: 'Jeux',                 sublabel: 'Activités ludiques et jeux',        hasLink: false },
  roleplay: { emoji: '🎭', label: 'Role Play',            sublabel: 'Jeux de rôle et dialogues',         hasLink: false },
}

// Tailwind class strings — must be literals for JIT to include them
const CAT_HEADER: Record<LessonContentType, string> = {
  activity: 'from-blue-50 to-sky-50 border-blue-100',
  song:     'from-violet-50 to-purple-50 border-violet-100',
  video:    'from-rose-50 to-pink-50 border-rose-100',
  game:     'from-amber-50 to-orange-50 border-amber-100',
  roleplay: 'from-emerald-50 to-teal-50 border-emerald-100',
}
const CAT_BADGE: Record<LessonContentType, string> = {
  activity: 'bg-blue-100 text-blue-700 border-blue-200',
  song:     'bg-violet-100 text-violet-700 border-violet-200',
  video:    'bg-rose-100 text-rose-700 border-rose-200',
  game:     'bg-amber-100 text-amber-700 border-amber-200',
  roleplay: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}
const CAT_BAR: Record<LessonContentType, string> = {
  activity: 'bg-blue-500',
  song:     'bg-violet-500',
  video:    'bg-rose-500',
  game:     'bg-amber-500',
  roleplay: 'bg-emerald-500',
}
const CAT_ICON: Record<LessonContentType, string> = {
  activity: 'bg-blue-100/80 text-blue-600',
  song:     'bg-violet-100/80 text-violet-600',
  video:    'bg-rose-100/80 text-rose-600',
  game:     'bg-amber-100/80 text-amber-600',
  roleplay: 'bg-emerald-100/80 text-emerald-600',
}

const CAT_ORDER: LessonContentType[] = ['activity', 'song', 'video', 'game', 'roleplay']

// ─── Helpers ───────────────────────────────────────────────────────────────────

function safeType(t: string | undefined): LessonContentType {
  if (t === 'activity' || t === 'song' || t === 'video' || t === 'game' || t === 'roleplay') return t
  return 'activity'
}

function getYoutubeId(url?: string): string | null {
  if (!url) return null
  const m1 = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (m1) return m1[1]!
  const m2 = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  return m2?.[1] ?? null
}

function detectType(url: string): LessonContentType | null {
  const u = url.toLowerCase()
  if (u.includes('youtube') || u.includes('youtu.be') || u.includes('vimeo') || u.includes('dailymotion')) return 'video'
  if (u.includes('spotify') || u.includes('soundcloud') || u.includes('deezer')) return 'song'
  if (u.includes('wordwall')) return 'game'
  return null
}

function expandItems(raw: LessonItem[]): LessonItem[] {
  const result: LessonItem[] = []
  for (const item of raw) {
    if (!item?.id) continue
    const safe = { ...item, type: safeType(item.type) }
    const lvls = item.levels?.length ? item.levels : ['all' as LevelSlug]
    if (lvls.length === 1) { result.push(safe); continue }
    for (const lv of lvls) {
      result.push({ ...safe, id: `${item.id}__${lv}`, levels: [lv] })
    }
  }
  return result
}

// ─── LinkBadge ─────────────────────────────────────────────────────────────────

function LinkBadge({ url }: { url: string }) {
  const domain = (() => {
    try { return new URL(url).hostname.replace('www.', '') }
    catch { return url.slice(0, 18) }
  })()
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5
        px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors shrink-0">
      <ExternalLink className="h-2.5 w-2.5 shrink-0" />
      <span className="max-w-[72px] truncate">{domain}</span>
    </a>
  )
}

// ─── CategoryBadge ─────────────────────────────────────────────────────────────

function CategoryBadge({ type, onClick }: { type: LessonContentType; onClick?: () => void }) {
  const m    = CAT_META[type]
  const badge = CAT_BADGE[type] ?? ''
  return (
    <button type="button"
      onClick={onClick ? e => { e.stopPropagation(); onClick() } : undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border select-none transition-all',
        badge,
        onClick ? 'cursor-pointer hover:opacity-75' : 'cursor-default pointer-events-none'
      )}>
      {m.emoji} {m.label}
      {onClick && <span className="opacity-40 ml-0.5 text-[8px]">✏</span>}
    </button>
  )
}

// ─── RecategorizePopover — click-outside (NO fixed overlay) ───────────────────

function RecategorizePopover({ currentType, onSelect, onClose }: {
  currentType: LessonContentType
  onSelect:    (t: LessonContentType) => void
  onClose:     () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    // Delay by one tick so the opening click is not caught
    const tid = setTimeout(() => document.addEventListener('mousedown', handle), 0)
    return () => { clearTimeout(tid); document.removeEventListener('mousedown', handle) }
  }, [onClose])

  return (
    <div ref={ref}
      className="absolute z-50 top-full left-0 mt-1 w-52 rounded-xl border bg-background shadow-2xl overflow-hidden">
      <p className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground bg-muted/30 border-b">
        Déplacer vers…
      </p>
      {CAT_ORDER.map(t => {
        const m = CAT_META[t]
        return (
          <button key={t} type="button"
            onClick={() => { onSelect(t); onClose() }}
            className={cn(
              'flex w-full items-center gap-2.5 px-3 py-2.5 text-xs transition-colors hover:bg-muted/40',
              t === currentType && 'bg-primary/[0.07] font-bold text-primary'
            )}>
            <span className="text-base">{m.emoji}</span>
            <span className="flex-1 text-left">{m.label}</span>
            {t === currentType && <Check className="h-3 w-3 text-primary" />}
          </button>
        )
      })}
    </div>
  )
}

// ─── LeftPanelItem ─────────────────────────────────────────────────────────────

function LeftPanelItem({ item, effType, recatOpen, onToggle, onOpenRecat, onRecat, onCloseRecat }: {
  item:         LessonItem
  effType:      LessonContentType
  recatOpen:    boolean
  onToggle:     () => void
  onOpenRecat:  () => void
  onRecat:      (t: LessonContentType) => void
  onCloseRecat: () => void
}) {
  return (
    <div onClick={onToggle}
      className={cn(
        'relative flex items-start gap-2 rounded-xl px-2.5 py-2 cursor-pointer transition-all border mb-0.5',
        item.selected
          ? 'bg-primary/[0.06] border-primary/20'
          : 'border-transparent hover:bg-muted/40 hover:border-border/40'
      )}>
      <div className="mt-0.5 shrink-0 pointer-events-none">
        {item.selected
          ? <CheckSquare className="h-3.5 w-3.5 text-primary" />
          : <Square className="h-3.5 w-3.5 text-muted-foreground/40" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium leading-snug',
          item.selected ? 'text-foreground' : 'text-muted-foreground')}>
          {item.name}
        </p>
        <div className="relative mt-0.5" onClick={e => e.stopPropagation()}>
          <CategoryBadge type={effType} onClick={onOpenRecat} />
          {recatOpen && (
            <RecategorizePopover currentType={effType} onSelect={onRecat} onClose={onCloseRecat} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ManualAddForm ─────────────────────────────────────────────────────────────

function ManualAddForm({ defaultType, onAdd }: {
  defaultType: LessonContentType
  onAdd:       (item: Omit<ManualItem, 'id' | 'selected'>) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [link, setLink] = useState('')
  const [type, setType] = useState<LessonContentType>(defaultType)

  function handleLink(v: string) {
    setLink(v)
    const det = detectType(v)
    if (det) setType(det)
  }

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd({ name: trimmed, type, link: link.trim() || undefined })
    setName(''); setLink(''); setType(defaultType); setOpen(false)
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-muted-foreground/20
          px-3 py-2 text-xs text-muted-foreground/50 hover:border-primary/40 hover:text-primary
          hover:bg-primary/[0.02] transition-all">
        <Plus className="h-3.5 w-3.5 shrink-0" />
        Ajouter un élément manuellement…
      </button>
    )
  }

  const detectedMeta = link ? (() => { const t = detectType(link); return t ? CAT_META[t] : null })() : null

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-primary/60">Ajout manuel</p>
        <button type="button" onClick={() => setOpen(false)}
          className="text-muted-foreground/40 hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <input value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Nom de l'activité…"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs
          placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/25" />
      <input value={link} onChange={e => handleLink(e.target.value)}
        placeholder="Lien (YouTube, Wordwall, Spotify…)"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs
          placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/25" />
      {detectedMeta && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
          <Check className="h-3 w-3" />
          Type détecté : {detectedMeta.emoji} {detectedMeta.label}
        </p>
      )}
      <div className="flex gap-1.5 flex-wrap">
        {CAT_ORDER.map(t => {
          const m = CAT_META[t]
          return (
            <button key={t} type="button" onClick={() => setType(t)}
              className={cn(
                'rounded-lg px-2 py-1 text-xs font-semibold border transition-all',
                type === t
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background border-border text-muted-foreground hover:border-primary/30'
              )}>
              {m.emoji} {m.label}
            </button>
          )
        })}
      </div>
      <Button size="sm" onClick={submit} className="w-full h-8 text-xs rounded-lg gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Ajouter
      </Button>
    </div>
  )
}

// ─── CategoryCard ─────────────────────────────────────────────────────────────

function CategoryCard({
  type, items, manualItems,
  onToggleItem, onToggleAll, onAddManual, onRemoveManual,
}: {
  type:           LessonContentType
  items:          LessonItem[]
  manualItems:    ManualItem[]
  onToggleItem:   (id: string) => void
  onToggleAll:    (select: boolean) => void
  onAddManual:    (item: Omit<ManualItem, 'id' | 'selected'>) => void
  onRemoveManual: (id: string) => void
}) {
  const m         = CAT_META[type]
  const header    = CAT_HEADER[type]
  const badge     = CAT_BADGE[type]
  const bar       = CAT_BAR[type]
  const icon      = CAT_ICON[type]
  const [collapsed, setCollapsed] = useState(false)

  const allItems    = [...items, ...manualItems]
  const selCount    = allItems.filter(i => i.selected).length
  const total       = allItems.length
  const allSelected = total > 0 && selCount === total
  const pct         = total > 0 ? Math.round((selCount / total) * 100) : 0

  return (
    <div className="rounded-2xl border border-border/70 bg-background overflow-hidden shadow-sm hover:shadow-md transition-shadow">

      {/* ── Header ── */}
      <div className={cn('bg-gradient-to-r px-4 py-3 border-b border-border/40', header)}>
        <div className="flex items-center gap-3">

          {/* Emoji icon */}
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl shadow-sm border border-white/60',
            icon
          )}>
            {m.emoji}
          </div>

          {/* Title + progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold leading-tight">{m.label}</span>
              <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-extrabold border', badge)}>
                {selCount} / {total}
              </span>
            </div>
            {total > 0 ? (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-black/[0.08] overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all duration-300', bar)}
                    style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-bold text-muted-foreground/50 shrink-0 tabular-nums">{pct}%</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">{m.sublabel}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {total > 0 && (
              <button type="button" onClick={() => onToggleAll(!allSelected)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-bold border transition-all whitespace-nowrap',
                  allSelected
                    ? 'bg-white/70 text-muted-foreground border-border/60 hover:bg-white'
                    : 'bg-white/70 text-primary border-primary/30 hover:bg-white hover:border-primary/60'
                )}>
                {allSelected ? '✓ Tout' : 'Tout ✓'}
              </button>
            )}
            <button type="button" onClick={() => setCollapsed(v => !v)}
              className="rounded-lg p-1.5 text-muted-foreground/50 hover:text-foreground hover:bg-black/5 transition-colors">
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      {!collapsed && (
        <div>
          {/* Empty state (no padlet items, no manual) */}
          {total === 0 && (
            <div className="px-4 py-6 text-center border-b border-dashed border-border/40">
              <p className="text-3xl mb-2 opacity-30">{m.emoji}</p>
              <p className="text-xs font-medium text-muted-foreground/50">{m.sublabel}</p>
              <p className="text-xs text-muted-foreground/35 mt-1">
                Aucun élément dans cette catégorie
              </p>
            </div>
          )}

          {/* Padlet items */}
          {items.length > 0 && (
            <div className="divide-y divide-border/40">
              {items.map(item => {
                const ytId    = getYoutubeId(item.link)
                const lvlSlug = item.levels?.[0]
                const lm      = lvlSlug ? LEVEL_META[lvlSlug] : null
                return (
                  <label key={item.id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group',
                      item.selected ? 'bg-primary/[0.04]' : 'hover:bg-muted/20'
                    )}>
                    <input type="checkbox" className="sr-only"
                      checked={item.selected} onChange={() => onToggleItem(item.id)} />
                    <div className="shrink-0">
                      {item.selected
                        ? <CheckSquare className="h-4 w-4 text-primary" />
                        : <Square className="h-4 w-4 text-muted-foreground/25 group-hover:text-muted-foreground/50 transition-colors" />}
                    </div>
                    {ytId && (
                      <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} alt=""
                        className="h-9 w-14 shrink-0 rounded-lg object-cover border border-border/40"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    )}
                    <p className={cn(
                      'flex-1 min-w-0 text-sm font-medium leading-snug',
                      item.selected ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.link && m.hasLink && <LinkBadge url={item.link} />}
                      {lm && (
                        <span title={lm.label}
                          className={cn(
                            'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border',
                            badge
                          )}>
                          {lm.emoji}
                        </span>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          {/* Manual items */}
          {manualItems.length > 0 && (
            <div className="border-t border-dashed border-border/50 divide-y divide-border/30">
              {manualItems.map(mi => (
                <div key={mi.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 transition-colors',
                    mi.selected ? 'bg-primary/[0.04]' : 'hover:bg-muted/20'
                  )}>
                  <div className="shrink-0 cursor-pointer" onClick={() => onToggleItem(mi.id)}>
                    {mi.selected
                      ? <CheckSquare className="h-4 w-4 text-primary" />
                      : <Square className="h-4 w-4 text-muted-foreground/25" />}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onToggleItem(mi.id)}>
                    <p className="text-xs font-medium">{mi.name}</p>
                    <p className="text-xs text-muted-foreground/40 italic">Ajouté manuellement</p>
                  </div>
                  {mi.link && CAT_META[mi.type]?.hasLink && <LinkBadge url={mi.link} />}
                  <button type="button" onClick={() => onRemoveManual(mi.id)}
                    className="shrink-0 p-1 rounded-lg text-muted-foreground/30 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add manual */}
          <div className="px-4 py-3 border-t border-dashed border-border/40">
            <ManualAddForm defaultType={type} onAdd={onAddManual} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function PadletViewer({
  board, groups, selectedGroupId, sessionDate, onGroupChange, onDateChange, onBack,
}: PadletViewerProps) {
  const router = useRouter()

  const [items,             setItems]             = useState<LessonItem[]>(() => {
    // Auto-sélectionner les items du niveau du groupe par défaut
    const expanded = expandItems(board.items)
    const group    = groups.find(g => g.id === selectedGroupId)
    const slug     = group?.levelSlug ?? ''
    if (!slug) return expanded
    return expanded.map(i => ({ ...i, selected: (i.levels?.[0] ?? 'all') === slug }))
  })
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, LessonContentType>>({})
  const [manualItems,       setManualItems]       = useState<ManualItem[]>([])
  const [recatOpen,         setRecatOpen]         = useState<string | null>(null)
  const [viewMode,          setViewMode]          = useState<ViewMode>('split')

  // Quand le groupe change → re-sélectionner automatiquement les items du bon niveau
  useEffect(() => {
    const group = groups.find(g => g.id === selectedGroupId)
    const slug  = group?.levelSlug ?? ''
    if (!slug) return
    setItems(prev => prev.map(i => ({ ...i, selected: (i.levels?.[0] ?? 'all') === slug })))
    setManualItems([])
  }, [selectedGroupId]) // eslint-disable-line react-hooks/exhaustive-deps

  function effType(item: LessonItem): LessonContentType {
    return categoryOverrides[item.id] ?? item.type
  }

  function toggleItem(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i))
    setManualItems(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i))
  }

  function recategorize(id: string, type: LessonContentType) {
    setCategoryOverrides(prev => ({ ...prev, [id]: type }))
  }

  function addManualItem(item: Omit<ManualItem, 'id' | 'selected'>) {
    setManualItems(prev => [...prev, { ...item, id: `manual_${Date.now()}`, selected: true }])
  }

  function removeManualItem(id: string) {
    setManualItems(prev => prev.filter(i => i.id !== id))
  }

  function toggleCategory(type: LessonContentType, select: boolean) {
    const ids  = new Set(items.filter(i => effType(i) === type).map(i => i.id))
    const mIds = new Set(manualItems.filter(i => i.type === type).map(i => i.id))
    setItems(prev => prev.map(i => ids.has(i.id) ? { ...i, selected: select } : i))
    setManualItems(prev => prev.map(i => mIds.has(i.id) ? { ...i, selected: select } : i))
  }

  const byLevel = useMemo(() => {
    const map = new Map<string, LessonItem[]>()
    for (const item of items) {
      const lvl = item.levels?.[0] ?? 'all'
      if (!map.has(lvl)) map.set(lvl, [])
      map.get(lvl)!.push(item)
    }
    return [...LEVEL_ORDER, 'all'].filter(s => map.has(s)).map(s => ({ slug: s, items: map.get(s)! }))
  }, [items])

  const byCategory = useMemo(() => {
    const map = new Map<LessonContentType, LessonItem[]>()
    for (const item of items) {
      const t = categoryOverrides[item.id] ?? item.type
      if (!map.has(t)) map.set(t, [])
      map.get(t)!.push(item)
    }
    return CAT_ORDER.map(t => ({
      type:        t,
      items:       map.get(t) ?? [],
      manualItems: manualItems.filter(mi => mi.type === t),
    }))
  }, [items, manualItems, categoryOverrides])

  const selectedCount = useMemo(
    () => items.filter(i => i.selected).length + manualItems.filter(i => i.selected).length,
    [items, manualItems]
  )

  // Overview stats for the right panel header bar
  const catStats = useMemo(
    () => CAT_ORDER.map(t => ({
      type: t,
      total: (byCategory.find(c => c.type === t)?.items.length ?? 0) +
             (byCategory.find(c => c.type === t)?.manualItems.length ?? 0),
    })).filter(s => s.total > 0),
    [byCategory]
  )

  function handleGenerate() {
    if (!selectedGroupId) { toast.error('Sélectionnez un groupe'); return }
    if (!sessionDate)     { toast.error('Sélectionnez une date');  return }
    if (!selectedCount)   { toast.error('Cochez au moins un élément'); return }

    const selectedPadlet = items.filter(i => i.selected).map(i => ({
      ...i,
      id:   i.id.replace(/__[a-z]+$/, ''),
      type: effType(i),
    }))
    const selectedManual: LessonItem[] = manualItems.filter(i => i.selected).map(i => ({
      id: i.id, name: i.name, type: i.type, link: i.link, selected: true, levels: [],
    }))

    const groupOption = groups.find(g => g.id === selectedGroupId)

    sessionStorage.setItem('padlet_prefill_lesson',  JSON.stringify({ theme: board.theme, items: [...selectedPadlet, ...selectedManual] }))
    sessionStorage.setItem('padlet_prefill_groupId', selectedGroupId)
    sessionStorage.setItem('padlet_prefill_date',    sessionDate)
    sessionStorage.setItem('padlet_prefill_group',   JSON.stringify({
      id:        selectedGroupId,
      name:      groupOption?.name      ?? 'Groupe',
      levelName: groupOption?.levelName ?? 'Niveau',
      levelSlug: groupOption?.levelSlug ?? '',
    }))
    router.push(`/resumes/new?groupId=${selectedGroupId}&from=padlet`)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5 rounded-xl shrink-0">
          <ChevronLeft className="h-4 w-4" /> Mes Padlets
        </Button>
        <div className="flex-1 min-w-0 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-violet-50 px-4 py-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Padlet ouvert</p>
          <p className="text-sm font-extrabold text-primary truncate">{board.board.title}</p>
        </div>
        <span className="shrink-0 rounded-xl border bg-background px-3 py-2 text-xs font-bold text-muted-foreground whitespace-nowrap">
          {items.length + manualItems.length} éléments
        </span>
      </div>

      {/* ── Groupe + Date ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Groupe</label>
          <select value={selectedGroupId} onChange={e => onGroupChange(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium
              focus:outline-none focus:ring-2 focus:ring-primary/30">
            {groups.map(g => <option key={g.id} value={g.id}>{g.name} — {g.levelName}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Date du cours</label>
          <input type="date" value={sessionDate} onChange={e => onDateChange(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium
              focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      {/* ── Stat bar + Toggle vue ── */}
      <div className="flex items-center justify-between rounded-2xl border bg-background/80 px-4 py-2.5 gap-3">
        <div>
          <p className="text-sm font-bold">
            {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
            <span className="font-normal text-muted-foreground"> / {items.length + manualItems.length}</span>
          </p>
          <div className="flex gap-2 text-xs mt-0.5">
            <button type="button"
              onClick={() => setItems(prev => prev.map(i => ({ ...i, selected: true })))}
              className="text-primary hover:underline">Tout cocher</button>
            <span className="text-muted-foreground">·</span>
            <button type="button"
              onClick={() => setItems(prev => prev.map(i => ({ ...i, selected: false })))}
              className="text-muted-foreground hover:text-foreground hover:underline">Tout décocher</button>
          </div>
        </div>
        <div className="flex rounded-xl border p-1 bg-muted/20 gap-1 shrink-0">
          <button type="button" onClick={() => setViewMode('split')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all',
              viewMode === 'split'
                ? 'bg-background shadow-sm text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground'
            )}>
            <Tag className="h-3 w-3" /> Triage
          </button>
          <button type="button" onClick={() => setViewMode('level')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all',
              viewMode === 'level'
                ? 'bg-background shadow-sm text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground'
            )}>
            <LayoutList className="h-3 w-3" /> Niveaux
          </button>
        </div>
      </div>

      {/* ── SPLIT VIEW ── */}
      {viewMode === 'split' && (
        <div className="grid grid-cols-[5fr_7fr] gap-3 items-start">

          {/* LEFT — Source Padlet */}
          <div className="sticky top-4 max-h-[calc(100vh-260px)] overflow-y-auto rounded-2xl border bg-background/60 p-2">
            <p className="px-1 pb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              📌 Source Padlet
            </p>
            {byLevel.map(({ slug, items: lvItems }) => {
              const lm      = LEVEL_META[slug] ?? { emoji: '📌', label: slug, color: 'border-gray-200 bg-gray-50', text: 'text-gray-900 dark:text-gray-200' }
              const lvSel   = lvItems.filter(i => i.selected).length
              return (
                <div key={slug} className="mb-3">
                  <div className={cn('flex items-center gap-2 rounded-xl px-3 py-2.5 mb-2 border-2', lm.color)}>
                    <span className="text-lg">{lm.emoji}</span>
                    <span className={cn('text-sm font-extrabold flex-1 tracking-tight', lm.text)}>{lm.label}</span>
                    <span className={cn('text-xs font-bold opacity-70', lm.text)}>{lvSel}/{lvItems.length}</span>
                  </div>
                  {lvItems.map(item => (
                    <LeftPanelItem key={item.id}
                      item={item}
                      effType={effType(item)}
                      recatOpen={recatOpen === item.id}
                      onToggle={() => toggleItem(item.id)}
                      onOpenRecat={() => setRecatOpen(item.id)}
                      onRecat={t => { recategorize(item.id, t); setRecatOpen(null) }}
                      onCloseRecat={() => setRecatOpen(null)}
                    />
                  ))}
                </div>
              )
            })}
          </div>

          {/* RIGHT — Organisation par catégorie */}
          <div className="space-y-3">
            {/* Mini overview bar */}
            <div className="flex items-center gap-2 flex-wrap px-1">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                🗂️ Organisation
              </span>
              {catStats.map(s => {
                const m = CAT_META[s.type]
                return (
                  <span key={s.type}
                    className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold border', CAT_BADGE[s.type])}>
                    {m.emoji} {s.total}
                  </span>
                )
              })}
            </div>
            {byCategory.map(({ type, items: catItems, manualItems: catManual }) => (
              <CategoryCard
                key={type}
                type={type}
                items={catItems}
                manualItems={catManual}
                onToggleItem={toggleItem}
                onToggleAll={select => toggleCategory(type, select)}
                onAddManual={addManualItem}
                onRemoveManual={removeManualItem}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── LEVEL VIEW ── */}
      {viewMode === 'level' && (
        <div className="space-y-3">
          {byLevel.map(({ slug, items: lvItems }) => {
            const lm     = LEVEL_META[slug] ?? { emoji: '📌', label: slug, color: 'border-gray-200 bg-gray-50', text: 'text-gray-900 dark:text-gray-200' }
            const lvSel  = lvItems.filter(i => i.selected).length
            const allSel = lvSel === lvItems.length
            return (
              <div key={slug} className={cn('rounded-2xl border-2 overflow-hidden', lm.color)}>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span className="text-2xl">{lm.emoji}</span>
                  <span className={cn('flex-1 text-sm font-extrabold tracking-tight', lm.text)}>{lm.label}</span>
                  <span className={cn('text-xs font-bold opacity-70', lm.text)}>{lvSel}/{lvItems.length}</span>
                  <button type="button"
                    onClick={() => {
                      const ids = new Set(lvItems.map(i => i.id))
                      setItems(prev => prev.map(i => ids.has(i.id) ? { ...i, selected: !allSel } : i))
                    }}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-bold border transition-all',
                      allSel
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background text-primary border-primary/30 hover:bg-primary/5'
                    )}>
                    {allSel ? <span className="flex items-center gap-1"><Check className="h-3 w-3" />Tout</span> : 'Tout ✓'}
                  </button>
                </div>
                <div className="border-t border-current/10 bg-background/60 divide-y divide-border/40">
                  {lvItems.map(item => (
                    <div key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-all',
                        item.selected && 'bg-primary/[0.04]'
                      )}>
                      <div className="shrink-0">
                        {item.selected
                          ? <CheckSquare className="h-4 w-4 text-primary" />
                          : <Square className="h-4 w-4 text-muted-foreground/40" />}
                      </div>
                      <p className={cn('flex-1 min-w-0 text-sm font-medium truncate',
                        item.selected ? 'text-foreground' : 'text-muted-foreground')}>
                        {item.name}
                      </p>
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <CategoryBadge type={effType(item)} onClick={() => setRecatOpen(item.id)} />
                        {recatOpen === item.id && (
                          <RecategorizePopover
                            currentType={effType(item)}
                            onSelect={t => { recategorize(item.id, t); setRecatOpen(null) }}
                            onClose={() => setRecatOpen(null)}
                          />
                        )}
                      </div>
                    </div>
                           ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Bouton Générer ── */}
      <div className="sticky bottom-4 pt-2">
        <Button onClick={handleGenerate} disabled={selectedCount === 0} size="lg"
          className="w-full shadow-lg gap-2 rounded-2xl">
          <Sparkles className="h-4 w-4" />
          Générer le résumé
          {selectedCount > 0 && (
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">
              {selectedCount} élément{selectedCount > 1 ? 's' : ''}
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
