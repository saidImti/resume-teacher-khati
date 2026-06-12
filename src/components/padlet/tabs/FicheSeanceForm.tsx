'use client'

import { useState } from 'react'
import { Sparkles, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PadletPickerModal } from './PadletPickerModal'
import { FileUploadZone } from './FileUploadZone'
import type { PadletBoard } from './PadletPickerModal'
import type { ProcessedFile } from './FileUploadZone'
import type { Level } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FicheResult {
  theme: string; emoji: string; level: string; date: string
  whatWeDidToday?: string
  vocabulary:  Array<{ en: string; fr: string; phonetic?: string; partOfSpeech?: string; example?: string; emoji?: string }>
  verbs:       Array<{ infinitive: string; french: string; presentSimple?: string; pastSimple?: string; tip?: string }>
  grammar:     Array<{ rule: string; explanation?: string; formula?: string; examples: string[]; tip?: string }>
  spelling:    Array<{ word: string; trick: string }>
  expressions: Array<{ en: string; fr: string; context?: string }>
  phonics?:    Array<{ sound: string; letter?: string; examples: string[] }>
  homeworkSuggestion?: string
  parentNote?: string
  funFact?: string
}

interface FicheSeanceFormProps {
  levels:   Level[]
  onResult: (result: FicheResult) => void
}

// ─── Config niveaux ───────────────────────────────────────────────────────────

const LEVEL_CFG: Record<string, { emoji: string; color: string }> = {
  preschoolers: { emoji: '🌟', color: 'border-yellow-300 text-yellow-700 bg-yellow-50' },
  kids:         { emoji: '🚀', color: 'border-blue-300 text-blue-700 bg-blue-50'       },
  juniors:      { emoji: '📖', color: 'border-green-300 text-green-700 bg-green-50'    },
  tweens:       { emoji: '⚡', color: 'border-violet-300 text-violet-700 bg-violet-50' },
  teenagers:    { emoji: '🎓', color: 'border-rose-300 text-rose-700 bg-rose-50'       },
}
const LEVEL_ORDER = ['preschoolers', 'kids', 'juniors', 'tweens', 'teenagers']

// Années scolaires prédéfinies
const YEAR_PRESETS = ['2023-2024', '2024-2025', '2025-2026', '2026-2027', '2027-2028']

// ─── Composant ────────────────────────────────────────────────────────────────

export function FicheSeanceForm({ levels, onResult }: FicheSeanceFormProps) {
  const [levelSlug,  setLevelSlug]  = useState('kids')
  const [theme,      setTheme]      = useState('')
  const [groupName,  setGroupName]  = useState('')
  const [yearInput,  setYearInput]  = useState('2024-2025')
  const [customYear, setCustomYear] = useState('')
  const [showCustomYear, setShowCustomYear] = useState(false)

  // Sources de contenu
  const [padlet,     setPadlet]     = useState<PadletBoard | null>(null)
  const [files,      setFiles]      = useState<ProcessedFile[]>([])
  const [manualText, setManualText] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const activeYear = showCustomYear && customYear.trim() ? customYear.trim() : yearInput

  // ── Génération ──────────────────────────────────────────────────────────────
  async function generate() {
    setIsLoading(true); setError(null)

    // Assemble le contenu total
    const contentParts: string[] = []
    if (padlet)     contentParts.push(`[PADLET: ${padlet.title}]`) // fetched server-side by boardId
    files.forEach((f) => {
      if (f.extractedText) contentParts.push(`[FICHIER: ${f.name}]\n${f.extractedText}`)
    })
    if (manualText.trim()) contentParts.push(`[NOTES MANUELLES]\n${manualText.trim()}`)

    try {
      const res  = await fetch('/api/fiches/seance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          levelSlug,
          theme:        theme || undefined,
          groupName:    groupName || undefined,
          sessionDate:  new Date().toLocaleDateString('fr-FR'),
          academicYear: activeYear,
          padletBoardId: padlet?.id,
          content:      contentParts.join('\n\n---\n\n') || undefined,
        }),
      })
      const data = await res.json() as { fiche?: FicheResult; error?: string }
      if (!res.ok) { setError(data.error ?? 'Erreur.'); return }
      if (data.fiche) onResult(data.fiche)
    } catch { setError('Erreur réseau.') }
    finally   { setIsLoading(false) }
  }

  const hasContent = !!padlet || files.length > 0 || manualText.trim().length > 0

  return (
    <div className="space-y-4">

      {/* ── Niveau ──────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Niveau</label>
        <div className="flex flex-wrap gap-2">
          {LEVEL_ORDER.map((slug) => {
            const cfg   = LEVEL_CFG[slug]!
            const label = levels.find((l) => l.slug === slug)?.name ?? slug
            return (
              <button key={slug} type="button" onClick={() => setLevelSlug(slug)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all',
                  levelSlug === slug ? cfg.color + ' border-2' : 'border-border text-muted-foreground hover:border-primary/40'
                )}>
                {cfg.emoji} {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Année + Thème + Groupe ───────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Année scolaire</label>
          <div className="flex gap-1.5 flex-wrap">
            {YEAR_PRESETS.map((y) => (
              <button key={y} type="button"
                onClick={() => { setYearInput(y); setShowCustomYear(false) }}
                className={cn(
                  'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all',
                  yearInput === y && !showCustomYear ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                )}>
                {y}
              </button>
            ))}
            <button type="button"
              onClick={() => setShowCustomYear((v) => !v)}
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all',
                showCustomYear ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
              )}>
              + Autre
            </button>
          </div>
          {showCustomYear && (
            <input type="text" value={customYear} onChange={(e) => setCustomYear(e.target.value)}
              placeholder="ex: 2028-2029"
              className="w-full rounded-xl border border-primary/40 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Thème du cours</label>
          <input type="text" value={theme} onChange={(e) => setTheme(e.target.value)}
            placeholder="ex: Animals, Family, Space…"
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Groupe</label>
          <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)}
            placeholder="ex: Kids Lundi 17h"
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      {/* ── Sources de contenu ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
          Sources de contenu
          <span className="ml-2 font-normal normal-case opacity-70">— combinez comme vous voulez</span>
        </label>

        <div className="grid sm:grid-cols-3 gap-3">
          {/* Padlet */}
          <button type="button" onClick={() => setShowPicker(true)}
            className={cn(
              'flex items-center gap-2.5 rounded-xl border-2 p-3.5 text-left transition-all',
              padlet
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40 hover:bg-muted/20'
            )}>
            <span className="text-xl shrink-0">📌</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">Depuis Padlet</p>
              {padlet
                ? <p className="text-xs text-primary truncate">{padlet.title}</p>
                : <p className="text-xs text-muted-foreground">Choisir un board</p>
              }
            </div>
            {padlet && (
              <button type="button" onClick={(e) => { e.stopPropagation(); setPadlet(null) }}
                className="shrink-0 rounded-full p-0.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            )}
          </button>

          {/* Fichiers */}
          <div className="rounded-xl border-2 border-border p-3.5 space-y-1">
            <p className="text-xs font-semibold flex items-center gap-1.5">📁 Fichiers
              {files.length > 0 && (
                <span className="bg-primary text-white rounded-full px-1.5 py-0.5 text-xs">{files.length}</span>
              )}
            </p>
            <FileUploadZone onFilesProcessed={setFiles} maxFiles={5} />
          </div>

          {/* Manuel */}
          <div className="rounded-xl border-2 border-border p-3.5 space-y-2">
            <button type="button" onClick={() => setShowManual((v) => !v)}
              className="w-full flex items-center justify-between">
              <p className="text-xs font-semibold">✍️ Notes manuelles</p>
              {showManual ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
            {showManual && (
              <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} rows={4}
                placeholder="Notes de cours, activités, vocabulaire…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            )}
            {!showManual && manualText.trim() && (
              <p className="text-sm text-emerald-700">✅ {manualText.trim().length} caractères</p>
            )}
          </div>
        </div>

        {!hasContent && (
          <p className="text-xs text-muted-foreground/60 text-center py-1">
            Sans source, l'IA génère une fiche type basée uniquement sur le thème et le niveau.
          </p>
        )}
      </div>

      {/* ── Bouton génération ────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      <Button onClick={() => void generate()} disabled={isLoading} size="lg" className="w-full gap-2.5 h-12 text-sm font-semibold">
        {isLoading
          ? <><Loader2 className="h-5 w-5 animate-spin" />Génération en cours…</>
          : <><Sparkles className="h-5 w-5" />Générer la fiche de révision {LEVEL_CFG[levelSlug]?.emoji}</>
        }
      </Button>

      {/* Padlet picker */}
      <PadletPickerModal
        isOpen={showPicker} onClose={() => setShowPicker(false)}
        multiSelect={false}
        selected={padlet ? [padlet] : []}
        onSelect={(boards) => setPadlet(boards[0] ?? null)} />
    </div>
  )
}
