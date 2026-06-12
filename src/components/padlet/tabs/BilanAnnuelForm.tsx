'use client'

import { useState } from 'react'
import { Sparkles, Loader2, X, ChevronDown, ChevronUp, FileDown, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PadletPickerModal } from './PadletPickerModal'
import { FileUploadZone } from './FileUploadZone'
import type { PadletBoard } from './PadletPickerModal'
import type { ProcessedFile } from './FileUploadZone'
import type { Level } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BilanResult {
  level: string; academicYear: string; sessionCount: number
  headline: string; yearSummary: string
  stats?: { totalWords: number; totalThemes: number; totalGrammarRules: number; totalExpressions: number }
  progressionBySkill: Record<string, { level: number; highlights: string[]; improvement: string }>
  themes: Array<{ name: string; emoji: string; sessionsCount?: number; keyLearnings: string[]; vocabulary?: Array<{ en: string; fr: string; emoji?: string }>; grammar?: string[]; expressions?: string[] }>
  masterVocabulary: Array<{ category: string; words: Array<{ en: string; fr: string; emoji?: string }> }>
  grammarAcquired: Array<{ rule: string; examples: string[]; mastery?: string; formula?: string }>
  verbsLearned: Array<{ infinitive: string; french: string; forms?: string[] }>
  expressionsLearned: Array<{ en: string; fr: string }>
  culturalDiscoveries: string[]
  achievements: Array<{ icon: string; title: string; description: string }>
  nextYearPreview: string
  teacherNote: string
  parentCertificate: { title: string; body: string; signature: string }
}

interface BilanAnnuelFormProps {
  levels:   Level[]
  onResult: (result: BilanResult) => void
}

// ─── Config ───────────────────────────────────────────────────────────────────

const LEVEL_CFG: Record<string, { emoji: string; gradient: string; chip: string }> = {
  preschoolers: { emoji: '🌟', gradient: 'from-yellow-400 to-orange-400',  chip: 'border-yellow-300 text-yellow-700 bg-yellow-50'  },
  kids:         { emoji: '🚀', gradient: 'from-blue-400 to-cyan-400',      chip: 'border-blue-300 text-blue-700 bg-blue-50'        },
  juniors:      { emoji: '📖', gradient: 'from-green-400 to-emerald-400',  chip: 'border-green-300 text-green-700 bg-green-50'     },
  tweens:       { emoji: '⚡', gradient: 'from-violet-400 to-purple-400',  chip: 'border-violet-300 text-violet-700 bg-violet-50'  },
  teenagers:    { emoji: '🎓', gradient: 'from-rose-400 to-pink-400',      chip: 'border-rose-300 text-rose-700 bg-rose-50'        },
}
const LEVEL_ORDER   = ['preschoolers', 'kids', 'juniors', 'tweens', 'teenagers']
const YEAR_PRESETS  = ['2023-2024', '2024-2025', '2025-2026', '2026-2027', '2027-2028']

// ─── Composant ────────────────────────────────────────────────────────────────

export function BilanAnnuelForm({ levels, onResult }: BilanAnnuelFormProps) {
  const [levelSlug,  setLevelSlug]  = useState('kids')
  const [levelId,    setLevelId]    = useState('')
  const [levelName,  setLevelName]  = useState('Kids')
  const [yearInput,  setYearInput]  = useState('2024-2025')
  const [customYear, setCustomYear] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  // Sources
  const [padlets,    setPadlets]    = useState<PadletBoard[]>([])
  const [files,      setFiles]      = useState<ProcessedFile[]>([])
  const [manualText, setManualText] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const [isLoading,   setIsLoading]   = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [exportFormat, setExportFormat] = useState<'word' | 'pdf'>('word')

  const activeYear  = showCustom && customYear.trim() ? customYear.trim() : yearInput
  const hasContent  = padlets.length > 0 || files.length > 0 || manualText.trim().length > 0

  function selectLevel(slug: string) {
    setLevelSlug(slug)
    const dbLvl = levels.find((l) => l.slug === slug)
    if (dbLvl) { setLevelId(dbLvl.id); setLevelName(dbLvl.name) }
    else        { setLevelId(''); setLevelName(slug) }
  }

  // ── Génération ──────────────────────────────────────────────────────────────
  async function generate() {
    setIsLoading(true); setError(null)

    const contentParts: string[] = []
    files.forEach((f) => {
      if (f.extractedText) contentParts.push(`[FICHIER: ${f.name}]\n${f.extractedText}`)
    })
    if (manualText.trim()) contentParts.push(`[NOTES MANUELLES]\n${manualText.trim()}`)

    try {
      const res  = await fetch('/api/fiches/bilan-annuel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          levelSlug,
          levelId:         levelId  || undefined,
          levelName,
          academicYearName: activeYear,
          padletBoardIds:  padlets.map((p) => p.id),
          content:         contentParts.join('\n\n---\n\n') || undefined,
        }),
      })
      const data = await res.json() as { bilan?: BilanResult; error?: string }
      if (!res.ok) { setError(data.error ?? 'Erreur.'); return }
      if (data.bilan) onResult(data.bilan)
    } catch { setError('Erreur réseau.') }
    finally   { setIsLoading(false) }
  }

  const cfg = LEVEL_CFG[levelSlug] ?? LEVEL_CFG.kids!

  return (
    <div className="space-y-5">

      {/* Bannière info */}
      <div className={cn('rounded-2xl bg-gradient-to-r p-4 text-white flex items-center gap-3', cfg.gradient)}>
        <span className="text-3xl">{cfg.emoji}</span>
        <div>
          <p className="font-bold text-sm">Bilan Annuel Ultra-Premium</p>
          <p className="text-white/80 text-xs">Document complet : 1 page par thème, progression, certificat. Export Word ou PDF.</p>
        </div>
      </div>

      {/* ── Niveau ─────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Niveau</label>
        <div className="flex flex-wrap gap-2">
          {LEVEL_ORDER.map((slug) => {
            const c     = LEVEL_CFG[slug]!
            const label = levels.find((l) => l.slug === slug)?.name ?? slug
            return (
              <button key={slug} type="button" onClick={() => selectLevel(slug)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all',
                  levelSlug === slug ? c.chip + ' border-2' : 'border-border text-muted-foreground hover:border-primary/40'
                )}>
                {c.emoji} {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Année ──────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Année scolaire</label>
        <div className="flex flex-wrap gap-2">
          {YEAR_PRESETS.map((y) => (
            <button key={y} type="button"
              onClick={() => { setYearInput(y); setShowCustom(false) }}
              className={cn(
                'rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all',
                yearInput === y && !showCustom ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
              )}>
              {y}
            </button>
          ))}
          <button type="button"
            onClick={() => setShowCustom((v) => !v)}
            className={cn(
              'rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all',
              showCustom ? 'border-primary bg-primary/5 text-primary' : 'border-dashed border-border text-muted-foreground hover:border-primary/40'
            )}>
            ✏️ Autre année
          </button>
        </div>
        {showCustom && (
          <input type="text" value={customYear} onChange={(e) => setCustomYear(e.target.value)}
            placeholder="ex: 2028-2029, Trimestre 1 2026…"
            className="rounded-xl border border-primary/40 bg-background px-4 py-2.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/30" />
        )}
      </div>

      {/* ── Sources de contenu ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
          Sources du bilan
          <span className="ml-2 font-normal normal-case opacity-70">— combinez plusieurs Padlets, fichiers et notes</span>
        </label>

        {/* Padlets multi-select */}
        <div className="rounded-xl border-2 border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📌</span>
              <div>
                <p className="text-xs font-semibold">Mes Padlets</p>
                <p className="text-sm text-muted-foreground">Sélectionnez plusieurs boards de l'année</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPicker(true)} className="text-xs gap-1.5">
              {padlets.length === 0 ? '+ Choisir des Padlets' : `${padlets.length} sélectionné${padlets.length > 1 ? 's' : ''}`}
            </Button>
          </div>

          {padlets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {padlets.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5">
                  <span className="text-xs font-medium text-primary truncate max-w-32">{p.title}</span>
                  <button type="button" onClick={() => setPadlets((prev) => prev.filter((b) => b.id !== p.id))}
                    className="text-muted-foreground hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fichiers */}
        <div className="rounded-xl border-2 border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📁</span>
            <div>
              <p className="text-xs font-semibold">Fichiers de l'année</p>
              <p className="text-sm text-muted-foreground">Supports de cours, enregistrements audio, captures d'écran…</p>
            </div>
          </div>
          <FileUploadZone onFilesProcessed={setFiles} maxFiles={20} />
        </div>

        {/* Notes manuelles */}
        <div className="rounded-xl border-2 border-border p-4">
          <button type="button" onClick={() => setShowManual((v) => !v)}
            className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">✍️</span>
              <div className="text-left">
                <p className="text-xs font-semibold">Notes et observations</p>
                <p className="text-sm text-muted-foreground">Ajoutez vos propres notes sur l'année</p>
              </div>
            </div>
            {showManual ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showManual && (
            <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} rows={5}
              placeholder="Résumé de l'année, observations particulières, thèmes couverts, difficultés rencontrées, points forts du groupe…"
              className="w-full mt-3 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          )}
        </div>

        {!hasContent && (
          <p className="text-xs text-muted-foreground/60 text-center py-1 rounded-lg bg-muted/20 border border-border px-3">
            💡 Sans source, l'IA génère un bilan annuel type basé sur le niveau et l'année. Ajoutez des sources pour un bilan personnalisé.
          </p>
        )}
      </div>

      {/* ── Format d'export ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Format d'export</label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setExportFormat('word')}
            className={cn(
              'flex items-center gap-2.5 rounded-xl border-2 p-3.5 text-left transition-all',
              exportFormat === 'word' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
            )}>
            <FileDown className={cn('h-5 w-5', exportFormat === 'word' ? 'text-primary' : 'text-muted-foreground')} />
            <div>
              <p className="text-xs font-semibold">Word (.docx)</p>
              <p className="text-sm text-muted-foreground">Éditable, imprimable</p>
            </div>
          </button>
          <button type="button" onClick={() => setExportFormat('pdf')}
            className={cn(
              'flex items-center gap-2.5 rounded-xl border-2 p-3.5 text-left transition-all',
              exportFormat === 'pdf' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
            )}>
            <Printer className={cn('h-5 w-5', exportFormat === 'pdf' ? 'text-primary' : 'text-muted-foreground')} />
            <div>
              <p className="text-xs font-semibold">PDF (impression)</p>
              <p className="text-sm text-muted-foreground">Prêt à envoyer aux parents</p>
            </div>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      <Button onClick={() => void generate()} disabled={isLoading} size="lg" className="w-full gap-2.5 h-12 text-sm font-semibold">
        {isLoading
          ? <><Loader2 className="h-5 w-5 animate-spin" />Génération du bilan annuel…</>
          : <><Sparkles className="h-5 w-5" />Générer le Bilan {levelName} {activeYear} {cfg.emoji}</>
        }
      </Button>

      <PadletPickerModal
        isOpen={showPicker} onClose={() => setShowPicker(false)}
        multiSelect={true}
        selected={padlets}
        onSelect={(boards) => setPadlets(boards)} />
    </div>
  )
}
