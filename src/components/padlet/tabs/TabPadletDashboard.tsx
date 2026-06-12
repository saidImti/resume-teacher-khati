'use client'

import { useState, useEffect } from 'react'
import {
  ExternalLink, Plus, RefreshCw, Loader2,
  Globe, Sparkles, Clock, Grid3X3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ApiBoard {
  id: string
  title: string
  webUrl: string
  updatedAt?: string | null
  createdAt?: string | null
}

function relativeDate(iso: string): string {
  const diff   = Date.now() - new Date(iso).getTime()
  const hours  = Math.floor(diff / 3_600_000)
  const days   = Math.floor(diff / 86_400_000)
  const weeks  = Math.floor(days / 7)
  const months = Math.floor(days / 30.44)
  if (hours < 24)  return `il y a ${hours}h`
  if (days < 7)    return `il y a ${days}j`
  if (weeks < 5)   return `il y a ${weeks} sem.`
  if (months < 12) return `il y a ${months} mois`
  return new Date(iso).getFullYear().toString()
}

const QUICK_LINKS = [
  { label: 'Mon dashboard',   url: 'https://padlet.com/dashboard?mobile_page=Collection&filter=made',     icon: Grid3X3,    color: 'bg-blue-50 text-blue-700 border-blue-200'    },
  { label: 'Créer un Padlet', url: 'https://padlet.com/board_builder',                                    icon: Plus,       color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'Partagés avec moi',url: 'https://padlet.com/dashboard?mobile_page=Collection&filter=shared',   icon: Globe,      color: 'bg-violet-50 text-violet-700 border-violet-200'  },
  { label: 'Récents',         url: 'https://padlet.com/dashboard?mobile_page=Collection&filter=recent',    icon: Clock,      color: 'bg-amber-50 text-amber-700 border-amber-200'     },
]

export function TabPadletDashboard() {
  const [boards, setBoards]   = useState<ApiBoard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [configured, setConfigured] = useState(false)

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true); setError(null)
    try {
      const data = await fetch('/api/padlet/my-boards').then((r) => r.json()) as {
        configured?: boolean; boards?: ApiBoard[]; apiError?: string
      }
      setConfigured(data.configured ?? false)
      setBoards(data.boards ?? [])
      if (data.apiError) setError(data.apiError)
    } catch { setError('Erreur réseau') }
    finally  { setLoading(false) }
  }

  return (
    <div className="space-y-8">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 via-pink-500 to-violet-600 p-8 text-white">
        {/* Cercles décoratifs */}
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -left-6 h-48 w-48 rounded-full bg-white/10" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl shrink-0">
            📌
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold">Padlet.com</h2>
            <p className="text-white/80 text-sm mt-1">
              Accédez directement à votre espace Padlet, créez de nouveaux boards et gérez vos contenus pédagogiques.
            </p>
          </div>
          <Button
            size="lg"
            className="shrink-0 bg-white text-violet-700 hover:bg-white/90 font-semibold gap-2 shadow-lg"
            onClick={() => window.open('https://padlet.com/dashboard', '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            Ouvrir Padlet
          </Button>
        </div>
      </div>

      {/* ── Accès rapides ──────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Accès rapides</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <button
                key={link.label}
                type="button"
                onClick={() => window.open(link.url, '_blank')}
                className={`flex items-center gap-2.5 rounded-xl border px-4 py-3
                  transition-all hover:shadow-md hover:-translate-y-0.5 ${link.color}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium text-left">{link.label}</span>
                <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Mes Padlets récents (via API) ───────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            Mes Padlets récents
            {!loading && configured && boards.length > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">({boards.length})</span>
            )}
          </h3>
          <button
            type="button" onClick={() => void load()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />Actualiser
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Chargement depuis Padlet…</span>
          </div>
        ) : !configured ? (
          <div className="rounded-xl border border-dashed border-primary/30 bg-primary/3 px-6 py-8 text-center">
            <p className="text-sm font-semibold">API Padlet non configurée</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ajoutez <code className="bg-muted rounded px-1 font-mono text-primary">PADLET_API_TOKEN</code> dans{' '}
              <code className="bg-muted rounded px-1">.env.local</code> pour voir vos Padlets ici.
            </p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            {error}
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Aucun Padlet trouvé.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {boards.slice(0, 10).map((board) => {
              const initial  = board.title.charAt(0).toUpperCase()
              const hue      = board.title.charCodeAt(0) * 13 % 360
              return (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => window.open(board.webUrl || `https://padlet.com/board/${board.id}`, '_blank')}
                  className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden
                    hover:border-primary/30 hover:shadow-lg transition-all duration-200 text-left"
                >
                  {/* Bandeau couleur */}
                  <div
                    className="h-16 flex items-center justify-center text-3xl font-black text-white/30 relative"
                    style={{ background: `linear-gradient(135deg, hsl(${hue},65%,55%), hsl(${(hue + 40) % 360},70%,60%))` }}
                  >
                    {initial}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="h-5 w-5 text-white/80" />
                    </div>
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                      {board.title}
                    </p>
                    {(board.updatedAt ?? board.createdAt) && (
                      <p className="text-xs text-muted-foreground">
                        {relativeDate(board.updatedAt ?? board.createdAt!)}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
            {/* Voir tout */}
            <button
              type="button"
              onClick={() => window.open('https://padlet.com/dashboard?mobile_page=Collection&filter=made', '_blank')}
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border
                bg-muted/30 hover:bg-muted/60 hover:border-border transition-all p-4 gap-2 text-muted-foreground"
            >
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-medium text-center">Voir tous<br />mes Padlets</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
