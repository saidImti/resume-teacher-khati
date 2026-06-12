'use client'

import { useState } from 'react'
import { X, Loader2, ExternalLink, FileText, Image, Video, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import { padletBoardToText } from '@/lib/padlet/parser'
import type { PadletBoard, PadletPost } from '@/lib/padlet/parser'

// ─── Props ────────────────────────────────────────────────────────────────────

interface PadletImportModalProps {
  onImport: (text: string) => void
  onClose: () => void
}

// ─── Icône par type de post ───────────────────────────────────────────────────

function PostTypeIcon({ type }: { type: PadletPost['type'] }) {
  switch (type) {
    case 'image':  return <Image className="h-3.5 w-3.5 text-sky-500" />
    case 'video':  return <Video className="h-3.5 w-3.5 text-violet-500" />
    case 'link':   return <LinkIcon className="h-3.5 w-3.5 text-emerald-500" />
    default:       return <FileText className="h-3.5 w-3.5 text-muted-foreground" />
  }
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function PadletImportModal({ onImport, onClose }: PadletImportModalProps) {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [board, setBoard] = useState<PadletBoard | null>(null)

  async function handleAnalyze() {
    if (!url.trim()) return
    setIsLoading(true)
    setError(null)
    setBoard(null)

    try {
      const res = await fetch('/api/padlet/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })

      const data = await res.json() as { success?: boolean; board?: PadletBoard; error?: string }

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Erreur lors de l\'analyse du Padlet.')
        return
      }

      setBoard(data.board!)
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleImport() {
    if (!board) return
    const text = padletBoardToText(board)
    onImport(text)
    toast.success(`${board.postCount} post${board.postCount > 1 ? 's' : ''} importé${board.postCount > 1 ? 's' : ''} depuis Padlet ✓`)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-sm">
                📌
              </div>
              <h2 className="font-semibold text-sm">Importer depuis Padlet</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-accent transition text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Corps */}
          <div className="p-5 space-y-4">

            {/* Champ URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                URL du Padlet <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(null); setBoard(null) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAnalyze() } }}
                  placeholder="https://padlet.com/username/board-name"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-input bg-background
                    focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!url.trim() || isLoading}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium
                    hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center gap-1.5 shrink-0"
                >
                  {isLoading ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyse...</>
                  ) : (
                    'Analyser'
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Le Padlet doit être public (non protégé par mot de passe).
              </p>
            </div>

            {/* Erreur */}
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            {/* Résultats */}
            {board && (
              <div className="space-y-3">
                {/* Infos board */}
                <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-foreground">{board.title}</p>
                    {board.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{board.description}</p>
                    )}
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                {/* Liste des posts */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="px-3 py-2 bg-muted/30 border-b border-border">
                    <p className="text-xs font-medium text-muted-foreground">
                      {board.postCount} post{board.postCount > 1 ? 's' : ''} trouvé{board.postCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-border">
                    {board.posts.map((post) => (
                      <div key={post.id} className="flex items-start gap-2.5 px-3 py-2.5">
                        <PostTypeIcon type={post.type} />
                        <div className="flex-1 min-w-0">
                          {post.title && (
                            <p className="text-xs font-medium text-foreground truncate">{post.title}</p>
                          )}
                          {post.body && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{post.body}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-muted/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-input text-sm font-medium hover:bg-accent transition"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!board}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium
                hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📎 Utiliser ce contenu
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
