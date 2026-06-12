'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Search, Pin, Loader2, CheckSquare, Square, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PadletBoard {
  id:        string
  title:     string
  webUrl:    string
  createdAt: string | null
  updatedAt: string | null
}

interface PadletPickerModalProps {
  isOpen:      boolean
  onClose:     () => void
  onSelect:    (boards: PadletBoard[]) => void
  multiSelect: boolean       // true = bilan, false = fiche séance
  selected:    PadletBoard[]
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function PadletPickerModal({
  isOpen, onClose, onSelect, multiSelect, selected,
}: PadletPickerModalProps) {
  const [boards,     setBoards]     = useState<PadletBoard[]>([])
  const [filtered,   setFiltered]   = useState<PadletBoard[]>([])
  const [isLoading,  setIsLoading]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [query,      setQuery]      = useState('')
  const [pending,    setPending]    = useState<PadletBoard[]>(selected)
  const [configured, setConfigured] = useState(true)

  // ── Chargement des boards ────────────────────────────────────────────────────
  const loadBoards = useCallback(async () => {
    setIsLoading(true); setError(null)
    try {
      const res  = await fetch('/api/padlet/my-boards')
      const data = await res.json() as {
        configured?: boolean; boards?: PadletBoard[]; apiError?: string
      }
      if (!data.configured) { setConfigured(false); return }
      if (data.apiError)    { setError(data.apiError); return }
      const list = data.boards ?? []
      setBoards(list); setFiltered(list); setConfigured(true)
    } catch { setError('Erreur réseau.') }
    finally   { setIsLoading(false) }
  }, [])

  useEffect(() => { if (isOpen) { void loadBoards(); setPending(selected) } }, [isOpen, loadBoards, selected])

  // ── Filtrage ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const q = query.toLowerCase().trim()
    setFiltered(q ? boards.filter((b) => b.title.toLowerCase().includes(q)) : boards)
  }, [query, boards])

  // ── Toggle sélection ─────────────────────────────────────────────────────────
  function toggle(board: PadletBoard) {
    if (multiSelect) {
      setPending((p) =>
        p.some((b) => b.id === board.id)
          ? p.filter((b) => b.id !== board.id)
          : [...p, board]
      )
    } else {
      setPending([board])
    }
  }

  function confirm() { onSelect(pending); onClose() }

  const isSelected = (id: string) => pending.some((b) => b.id === id)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-background border border-border shadow-2xl flex flex-col max-h-[85vh]">

        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Pin className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-base">
              {multiSelect ? 'Sélectionner des Padlets' : 'Choisir un Padlet'}
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Recherche */}
        <div className="px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un Padlet…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            {query && (
              <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto px-3 py-2">

          {isLoading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Chargement de vos Padlets…</span>
            </div>
          )}

          {!isLoading && !configured && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircle className="h-8 w-8 text-amber-500" />
              <p className="text-sm font-semibold">API Padlet non configurée</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Ajoutez votre <code className="bg-muted px-1 rounded">PADLET_API_TOKEN</code> dans <code className="bg-muted px-1 rounded">.env.local</code> pour accéder à vos Padlets.
              </p>
            </div>
          )}

          {!isLoading && configured && error && (
            <div className="m-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold mb-0.5">Erreur</p>
                <p>{error}</p>
                <button onClick={() => void loadBoards()} className="mt-2 flex items-center gap-1 text-xs font-medium hover:underline">
                  <RefreshCw className="h-3 w-3" />Réessayer
                </button>
              </div>
            </div>
          )}

          {!isLoading && configured && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Pin className="h-8 w-8 opacity-30" />
              <p className="text-sm">{query ? 'Aucun Padlet trouvé.' : 'Vous n\'avez pas encore de Padlets.'}</p>
            </div>
          )}

          {!isLoading && filtered.map((board) => {
            const sel = isSelected(board.id)
            return (
              <button
                key={board.id}
                type="button"
                onClick={() => toggle(board)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all mb-1',
                  sel ? 'bg-primary/8 border-2 border-primary/30' : 'hover:bg-muted/50 border-2 border-transparent'
                )}>
                <div className={cn(
                  'h-8 w-8 rounded-lg flex items-center justify-center text-sm shrink-0 font-bold',
                  sel ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                )}>
                  {multiSelect
                    ? (sel ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />)
                    : <Pin className="h-3.5 w-3.5" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{board.title}</p>
                  {board.updatedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Modifié le {new Date(board.updatedAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
                {sel && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-muted/20">
          <span className="text-xs text-muted-foreground">
            {pending.length === 0
              ? 'Aucun sélectionné'
              : multiSelect
                ? `${pending.length} Padlet${pending.length > 1 ? 's' : ''} sélectionné${pending.length > 1 ? 's' : ''}`
                : `Sélectionné : ${pending[0]?.title ?? ''}`
            }
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
            <Button size="sm" onClick={confirm} disabled={pending.length === 0}>
              {multiSelect ? `Ajouter ${pending.length || ''} Padlet${pending.length > 1 ? 's' : ''}` : 'Choisir ce Padlet'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
