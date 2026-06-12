'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText, BookOpen, Trash2, Download, Printer,
  RefreshCw, Calendar, Search, Loader2, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { generateFicheHtml } from './fiche-html'
import type { FicheResult } from './FicheSeanceForm'
import type { BilanResult } from './BilanAnnuelForm'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedFicheMeta {
  id:            string
  type:          'seance' | 'bilan'
  title:         string
  level:         string
  level_slug:    string | null
  theme:         string | null
  academic_year: string | null
  session_date:  string | null
  created_at:    string
}

interface TabHistoryProps {
  onRestoreFiche?: (fiche: FicheResult) => void
  onRestoreBilan?: (bilan: BilanResult) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<string, string> = {
  preschoolers: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  kids:         'bg-blue-100 text-blue-800 border-blue-300',
  juniors:      'bg-green-100 text-green-800 border-green-300',
  tweens:       'bg-violet-100 text-violet-800 border-violet-300',
  teenagers:    'bg-rose-100 text-rose-800 border-rose-300',
}

const LEVEL_EMOJIS: Record<string, string> = {
  preschoolers: '🌟', kids: '🚀', juniors: '📖', tweens: '⚡', teenagers: '🎓',
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso }
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function TabHistory({ onRestoreFiche, onRestoreBilan }: TabHistoryProps) {
  const [fiches,    setFiches]    = useState<SavedFicheMeta[]>([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState<'all' | 'seance' | 'bilan'>('all')
  const [search,    setSearch]    = useState('')
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const url = filter === 'all' ? '/api/fiches/save' : `/api/fiches/save?type=${filter}`
      const res  = await fetch(url)
      const data = await res.json() as { fiches?: SavedFicheMeta[] }
      setFiches(data.fiches ?? [])
    } catch { setFiches([]) }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { void loadHistory() }, [loadHistory])

  // Filtrer par recherche
  const displayed = fiches.filter((f) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      f.title.toLowerCase().includes(q) ||
      f.level.toLowerCase().includes(q) ||
      (f.theme ?? '').toLowerCase().includes(q) ||
      (f.academic_year ?? '').includes(q)
    )
  })

  // ── Supprimer ─────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette fiche ? Cette action est irréversible.')) return
    setDeleting(id)
    try {
      await fetch(`/api/fiches/history/${id}`, { method: 'DELETE' })
      setFiches((prev) => prev.filter((f) => f.id !== id))
    } finally { setDeleting(null) }
  }

  // ── Restaurer (ouvrir dans le viewer) ────────────────────────────────────
  async function handleRestore(meta: SavedFicheMeta) {
    setRestoring(meta.id)
    try {
      const res  = await fetch(`/api/fiches/history/${meta.id}`)
      const data = await res.json() as { fiche?: { type: string; data: unknown } }
      if (!data.fiche) return
      if (data.fiche.type === 'seance' && onRestoreFiche) {
        onRestoreFiche(data.fiche.data as FicheResult)
      } else if (data.fiche.type === 'bilan' && onRestoreBilan) {
        onRestoreBilan(data.fiche.data as BilanResult)
      }
    } finally { setRestoring(null) }
  }

  // ── Exporter PDF directement depuis l'historique ──────────────────────────
  async function handleExportPdf(meta: SavedFicheMeta) {
    if (meta.type !== 'seance') return
    setExporting(meta.id)
    try {
      const res  = await fetch(`/api/fiches/history/${meta.id}`)
      const data = await res.json() as { fiche?: { data: unknown } }
      if (!data.fiche) return
      const html = generateFicheHtml(data.fiche.data as FicheResult)
      const win  = window.open('', '_blank')
      if (win) { win.document.open(); win.document.write(html); win.document.close() }
    } finally { setExporting(null) }
  }

  // ── Exporter DOCX bilan directement ──────────────────────────────────────
  async function handleExportBilan(meta: SavedFicheMeta, format: 'word' | 'pdf') {
    setExporting(meta.id)
    try {
      const res1 = await fetch(`/api/fiches/history/${meta.id}`)
      const data = await res1.json() as { fiche?: { data: unknown } }
      if (!data.fiche) return
      const res2 = await fetch('/api/fiches/export-html', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bilan: data.fiche.data, format }),
      })
      const html = await res2.text()
      const win  = window.open('', '_blank')
      if (win) {
        win.document.open(); win.document.write(html); win.document.close()
        if (format === 'pdf') setTimeout(() => { win.print() }, 800)
      }
    } finally { setExporting(null) }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold">Historique</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {fiches.length} document{fiches.length > 1 ? 's' : ''} sauvegardé{fiches.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void loadHistory()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Actualiser
        </Button>
      </div>

      {/* Filtres + recherche */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1.5 rounded-xl border p-1">
          {(['all', 'seance', 'bilan'] as const).map((f) => (
            <button key={f} type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-semibold transition-all',
                filter === f ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'
              )}>
              {f === 'all' ? 'Tout' : f === 'seance' ? 'Fiches séance' : 'Bilans annuels'}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full rounded-xl border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Chargement…
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <div className="rounded-2xl border-2 border-dashed p-6 text-center max-w-64">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">Aucun document sauvegardé</p>
            <p className="text-sm mt-1 opacity-60">
              {search ? 'Aucun résultat pour cette recherche.' : 'Générez une fiche ou un bilan, puis sauvegardez-le.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((f) => {
            const slug   = f.level_slug ?? ''
            const color  = LEVEL_COLORS[slug] ?? 'bg-gray-100 text-gray-700 border-gray-300'
            const emoji  = LEVEL_EMOJIS[slug]  ?? '📄'
            const isBusy = deleting === f.id || restoring === f.id || exporting === f.id

            return (
              <div key={f.id}
                className="group rounded-2xl border bg-background/60 p-4 hover:border-primary/30 hover:shadow-sm transition-all">
                <div className="flex items-start gap-3">

                  {/* Icône type */}
                  <div className={cn(
                    'shrink-0 rounded-xl p-2.5',
                    f.type === 'seance' ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'
                  )}>
                    {f.type === 'seance'
                      ? <FileText className="h-4 w-4" />
                      : <BookOpen className="h-4 w-4" />
                    }
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold truncate">{f.title}</p>
                      <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', color)}>
                        {emoji} {f.level}
                      </span>
                      {f.type === 'bilan' && f.academic_year && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{f.academic_year}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(f.created_at)}</span>
                      {f.type === 'seance' && f.theme && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-40">{f.theme}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Ouvrir dans viewer */}
                    <Button
                      variant="ghost" size="icon"
                      disabled={isBusy}
                      onClick={() => void handleRestore(f)}
                      title="Ouvrir dans le viewer"
                      className="h-8 w-8">
                      {restoring === f.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <ExternalLink className="h-3.5 w-3.5" />
                      }
                    </Button>

                    {/* Export PDF */}
                    {f.type === 'seance' && (
                      <Button
                        variant="ghost" size="icon"
                        disabled={isBusy}
                        onClick={() => void handleExportPdf(f)}
                        title="Exporter PDF"
                        className="h-8 w-8">
                        {exporting === f.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Printer className="h-3.5 w-3.5" />
                        }
                      </Button>
                    )}

                    {f.type === 'bilan' && (
                      <>
                        <Button
                          variant="ghost" size="icon"
                          disabled={isBusy}
                          onClick={() => void handleExportBilan(f, 'word')}
                          title="Exporter Word"
                          className="h-8 w-8">
                          {exporting === f.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Download className="h-3.5 w-3.5" />
                          }
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          disabled={isBusy}
                          onClick={() => void handleExportBilan(f, 'pdf')}
                          title="Exporter PDF"
                          className="h-8 w-8">
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}

                    {/* Supprimer */}
                    <Button
                      variant="ghost" size="icon"
                      disabled={isBusy}
                      onClick={() => void handleDelete(f.id)}
                      title="Supprimer"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      {deleting === f.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
