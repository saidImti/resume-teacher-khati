'use client'

import { useState, useMemo } from 'react'
import {
  ChevronLeft, Plus, X, Loader2, AlertCircle, CheckSquare,
  Square, ExternalLink, Pencil,
  Check, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LessonContentType, LessonItem, StructuredLesson } from '@/types'

export type Step2Data = StructuredLesson

interface Step2ContentProps {
  groupName:      string
  levelName:      string
  sessionDate:    string
  initialLesson?: StructuredLesson
  onNext: (data: Step2Data) => void
  onBack: () => void
}

type Mode = 'manual' | 'padlet'

const CATEGORIES: Array<{
  type:            LessonContentType
  label:           string
  sublabel:        string
  hasLink:         boolean
  placeholder:     string
  linkPlaceholder: string
  color:           string
  iconBg:          string
}> = [
  { type: 'activity', label: 'Activites',            sublabel: 'Exercices et travaux pratiques',    hasLink: false, placeholder: 'Ex: Coral Reef Label And Color',      linkPlaceholder: '',                     color: 'border-blue-200 bg-blue-50/50',    iconBg: 'bg-blue-100 text-blue-600'    },
  { type: 'song',     label: 'Comptines & Chansons',  sublabel: 'Chansons educatives et comptines', hasLink: true,  placeholder: 'Ex: Head Shoulders Knees and Toes',  linkPlaceholder: 'https://youtube.com/...', color: 'border-violet-200 bg-violet-50/50', iconBg: 'bg-violet-100 text-violet-600' },
  { type: 'video',    label: 'Videos & Audios',       sublabel: 'Videos pedagogiques et audios',    hasLink: true,  placeholder: 'Ex: The Great Barrier Reef',           linkPlaceholder: 'https://youtube.com/...', color: 'border-rose-200 bg-rose-50/50',    iconBg: 'bg-rose-100 text-rose-600'    },
  { type: 'game',     label: 'Jeux',                  sublabel: 'Jeux et activites ludiques',        hasLink: false, placeholder: 'Ex: Wheel of Fortune Animals',        linkPlaceholder: '',                     color: 'border-amber-200 bg-amber-50/50',  iconBg: 'bg-amber-100 text-amber-600'  },
  { type: 'roleplay', label: 'Role Play',             sublabel: 'Jeux de role et dialogues',         hasLink: false, placeholder: 'Ex: At the restaurant dialogue',      linkPlaceholder: '',                     color: 'border-emerald-200 bg-emerald-50/50', iconBg: 'bg-emerald-100 text-emerald-600' },
]

const CAT_EMOJIS: Record<LessonContentType, string> = {
  activity: '📝', song: '🎵', video: '🎬', game: '🎮', roleplay: '🎭',
}

function LinkBadge({ url }: { url: string }) {
  const domain = (() => {
    try { return new URL(url).hostname.replace('www.', '') } catch { return url.slice(0, 28) }
  })()
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5
        px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
      <ExternalLink className="h-2.5 w-2.5" />
      {domain}
    </a>
  )
}

function CategoryCheckList({ cat, items, onToggle, onToggleAll }: {
  cat:         (typeof CATEGORIES)[number]
  items:       LessonItem[]
  onToggle:    (id: string) => void
  onToggleAll: (type: LessonContentType, select: boolean) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  if (!items.length) return null
  const selectedCount = items.filter((i) => i.selected).length
  const allSelected   = selectedCount === items.length

  return (
    <div className={cn('rounded-2xl border-2 overflow-hidden', cat.color)}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xl leading-none">{CAT_EMOJIS[cat.type]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{cat.label}</span>
            <span className="rounded-full bg-background border px-2 py-0.5 text-xs font-bold text-muted-foreground">
              {selectedCount}/{items.length}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{cat.sublabel}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button"
            onClick={() => onToggleAll(cat.type, !allSelected)}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all border',
              allSelected
                ? 'bg-primary text-white border-primary'
                : 'bg-background text-primary border-primary/30 hover:bg-primary/5'
            )}>
            {allSelected ? <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Tout</span> : 'Tout selectionner'}
          </button>
          <button type="button" onClick={() => setCollapsed((v) => !v)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-background/70 transition-colors">
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="border-t border-current/10 bg-background/60 divide-y divide-border/40">
          {items.map((item) => (
            <label key={item.id}
              className={cn(
                'flex cursor-pointer items-start gap-3 px-4 py-3 transition-all hover:bg-muted/30',
                item.selected && 'bg-primary/[0.03]'
              )}>
              <input type="checkbox" checked={item.selected}
                onChange={() => onToggle(item.id)} className="sr-only" />
              <div className="mt-0.5 shrink-0">
                {item.selected
                  ? <CheckSquare className="h-4 w-4 text-primary" />
                  : <Square className="h-4 w-4 text-muted-foreground/40" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium leading-snug',
                  item.selected ? 'text-foreground' : 'text-muted-foreground')}>
                  {item.name}
                </p>
                {item.link && cat.hasLink && (
                  <div className="mt-1"><LinkBadge url={item.link} /></div>
                )}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function ManualCategorySection({ cat, items, onAdd, onRemove, newName, onNewNameChange, newLink, onNewLinkChange }: {
  cat:             (typeof CATEGORIES)[number]
  items:           LessonItem[]
  onAdd:           () => void
  onRemove:        (id: string) => void
  newName:         string
  onNewNameChange: (v: string) => void
  newLink:         string
  onNewLinkChange: (v: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={cn('rounded-2xl border-2 overflow-hidden', cat.color)}>
      <button type="button" onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className="text-xl leading-none">{CAT_EMOJIS[cat.type]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{cat.label}</span>
            {items.length > 0 && (
              <span className="rounded-full bg-primary text-white px-2 py-0.5 text-xs font-bold">{items.length}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{cat.sublabel}</p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-current/10 bg-background/60 p-3 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-2 rounded-xl border bg-background px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.name}</p>
                {item.link && cat.hasLink && <div className="mt-1"><LinkBadge url={item.link} /></div>}
              </div>
              <button type="button" onClick={() => onRemove(item.id)}
                className="mt-0.5 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <div className="flex items-start gap-2 pt-1">
            <div className="flex-1 space-y-1.5">
              <input type="text" value={newName}
                onChange={(e) => onNewNameChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd() } }}
                placeholder={cat.placeholder}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm
                  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              {cat.hasLink && (
                <input type="url" value={newLink}
                  onChange={(e) => onNewLinkChange(e.target.value)}
                  placeholder={cat.linkPlaceholder}
                  className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs
                    placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              )}
            </div>
            <Button type="button" size="sm" variant="outline"
              onClick={onAdd} disabled={!newName.trim()}
              className="mt-0.5 shrink-0 rounded-xl">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Step2Content({ groupName, levelName, sessionDate, initialLesson, onNext, onBack }: Step2ContentProps) {
  const [mode,  setMode]  = useState<Mode>('manual')
  const [theme, setTheme] = useState(initialLesson?.theme ?? '')
  const [items, setItems] = useState<LessonItem[]>(initialLesson?.items ?? [])

  const [newName, setNewName] = useState<Partial<Record<LessonContentType, string>>>({})
  const [newLink, setNewLink] = useState<Partial<Record<LessonContentType, string>>>({})

  const [padletUrl,      setPadletUrl]      = useState('')
  const [padletLoading,  setPadletLoading]  = useState(false)
  const [padletError,    setPadletError]    = useState<string | null>(null)
  const [padletImported, setPadletImported] = useState(false)
  const [formError,      setFormError]      = useState<string | null>(null)

  function addItem(type: LessonContentType) {
    const name = newName[type]?.trim()
    if (!name) return
    const link = newLink[type]?.trim() || undefined
    setItems((prev) => [...prev, { id: Math.random().toString(36).slice(2, 9), type, name, link, selected: true }])
    setNewName((p) => ({ ...p, [type]: '' }))
    setNewLink((p) => ({ ...p, [type]: '' }))
  }

  function removeItem(id: string) { setItems((prev) => prev.filter((i) => i.id !== id)) }
  function toggleItem(id: string) { setItems((prev) => prev.map((i) => i.id === id ? { ...i, selected: !i.selected } : i)) }
  function toggleAll(type: LessonContentType, select: boolean) {
    setItems((prev) => prev.map((i) => i.type === type ? { ...i, selected: select } : i))
  }

  async function importPadlet() {
    if (!padletUrl.trim()) return
    setPadletLoading(true)
    setPadletError(null)
    try {
      const res  = await fetch('/api/padlet/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: padletUrl.trim() }),
      })
      const data = await res.json() as { error?: string; structuredItems?: LessonItem[]; boardTitle?: string }
      if (!res.ok) { setPadletError(data.error ?? "Erreur lors de l'import Padlet."); return }
      setItems(data.structuredItems ?? [])
      setPadletImported(true)
      if (!theme && data.boardTitle) setTheme(data.boardTitle)
    } catch { setPadletError('Impossible de contacter le serveur.') }
    finally { setPadletLoading(false) }
  }

  const selectedItems = useMemo(() => items.filter((i) => i.selected), [items])

  function handleNext() {
    setFormError(null)
    if (selectedItems.length === 0) { setFormError('Selectionnez au moins un element avant de continuer.'); return }
    onNext({ theme, items })
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3 rounded-2xl border bg-gradient-to-br from-primary/5 to-violet-50 px-5 py-4">
        <span className="text-3xl leading-none">{levelName.split(' ')[0]}</span>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Niveau</p>
          <p className="text-base font-extrabold text-primary leading-tight">{levelName.replace(/^[^\s]+ /, '')}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Groupe</p>
          <p className="text-sm font-bold">{groupName}</p>
        </div>
        <div className="text-right border-l pl-4">
          <p className="text-sm text-muted-foreground">Seance du</p>
          <p className="text-sm font-semibold">
            {new Date(sessionDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border p-1.5 bg-muted/20">
        {(['manual', 'padlet'] as Mode[]).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all',
              mode === m ? 'bg-white shadow-sm text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground'
            )}>
            {m === 'manual'
              ? <><Pencil className="h-3.5 w-3.5" /> Saisie manuelle</>
              : <><Sparkles className="h-3.5 w-3.5" /> Import Padlet</>
            }
          </button>
        ))}
      </div>

      {/* Theme */}
      <div className="space-y-1.5">
        <label className="text-sm font-bold">Theme du cours</label>
        <input type="text" value={theme} onChange={(e) => setTheme(e.target.value)}
          placeholder="Ex: Traditional Tales 2026"
          className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm
            placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {/* PADLET MODE */}
      {mode === 'padlet' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input type="url" value={padletUrl}
              onChange={(e) => { setPadletUrl(e.target.value); setPadletError(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void importPadlet() } }}
              placeholder="https://padlet.com/teacher_khati/..."
              className="flex-1 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm
                placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <Button type="button" onClick={() => void importPadlet()}
              disabled={padletLoading || !padletUrl.trim()} className="rounded-2xl shrink-0 gap-2">
              {padletLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {padletLoading ? 'Extraction...' : 'Extraire'}
            </Button>
          </div>

          {padletError && (
            <div className="flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" /> {padletError}
            </div>
          )}

          {padletImported && items.length > 0 && (
            <div className="space-y-3">
              {/* Barre selection globale */}
              <div className="flex items-center justify-between rounded-2xl border bg-background/80 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                    <CheckSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">
                      {selectedItems.length} selectionne{selectedItems.length > 1 ? 's' : ''}
                      <span className="font-normal text-muted-foreground"> / {items.length}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">Cochez ce que vous avez enseigne aujourd&apos;hui</p>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm"
                  onClick={() => setItems((prev) => prev.map((i) => ({ ...i, selected: true })))}
                  className="rounded-xl gap-1.5 text-xs">
                  <Check className="h-3 w-3" /> Tout selectionner
                </Button>
              </div>

              {CATEGORIES.map((cat) => (
                <CategoryCheckList key={cat.type}
                  cat={cat}
                  items={items.filter((i) => i.type === cat.type)}
                  onToggle={toggleItem}
                  onToggleAll={toggleAll}
                />
              ))}
            </div>
          )}

          {padletImported && items.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed py-12 text-center">
              <span className="text-4xl">&#128219;</span>
              <p className="text-sm font-semibold text-muted-foreground">Aucun contenu detecte dans ce Padlet.</p>
            </div>
          )}
        </div>
      )}

      {/* MANUAL MODE */}
      {mode === 'manual' && (
        <div className="space-y-3">
          {CATEGORIES.map((cat) => (
            <ManualCategorySection key={cat.type}
              cat={cat}
              items={items.filter((i) => i.type === cat.type)}
              onAdd={() => addItem(cat.type)}
              onRemove={removeItem}
              newName={newName[cat.type] ?? ''}
              onNewNameChange={(v) => setNewName((p) => ({ ...p, [cat.type]: v }))}
              newLink={newLink[cat.type] ?? ''}
              onNewLinkChange={(v) => setNewLink((p) => ({ ...p, [cat.type]: v }))}
            />
          ))}
        </div>
      )}

      {formError && (
        <div className="flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {formError}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="gap-1.5 rounded-xl">
          <ChevronLeft className="h-4 w-4" /> Retour
        </Button>
        <Button type="button" onClick={handleNext} disabled={selectedItems.length === 0} className="gap-2 rounded-xl">
          <Sparkles className="h-4 w-4" />
          Generer le resume
          {selectedItems.length > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">{selectedItems.length}</span>
          )}
        </Button>
      </div>

    </div>
  )
}
