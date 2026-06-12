'use client'

import { useState } from 'react'
import { Copy, Check, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface WhatsAppPreviewProps {
  text: string
  groupName?: string
  className?: string
}

// ─── Extraction de l'ID YouTube ──────────────────────────────────────────────

function extractYoutubeVideoId(text: string): string | null {
  const watchMatch = text.match(/youtube\.com\/watch\?(?:[^&\s]*&)*v=([a-zA-Z0-9_-]{11})/i)
  if (watchMatch) return watchMatch[1] ?? null
  const shortMatch = text.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i)
  if (shortMatch) return shortMatch[1] ?? null
  return null
}

// ─── Sanitisation + formatage WhatsApp → HTML ────────────────────────────────

function formatWhatsAppToHtml(text: string): string {
  const raw = text
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/~([^~]+)~/g, '<del>$1</del>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br />')

  // Sanitisation DOMPurify (client-side only, safe to import dynamically)
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DOMPurify = require('dompurify')
    return DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: ['strong', 'em', 'del', 'code', 'br'],
      ALLOWED_ATTR: [],
    })
  }
  return raw
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function WhatsAppPreview({ text, groupName, className }: WhatsAppPreviewProps) {
  const [copied, setCopied] = useState(false)
  const formattedHtml = formatWhatsAppToHtml(text)
  const youtubeVideoId = extractYoutubeVideoId(text)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Texte copié dans le presse-papier !')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier le texte')
    }
  }

  const charCount = text.length
  const lineCount = text.split('\n').length

  return (
    <div className={cn('space-y-4', className)}>
      {/* En-tête + stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-medium">Prévisualisation WhatsApp</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{charCount} car.</span>
          <span>{lineCount} lignes</span>
        </div>
      </div>

      {/* Simulation téléphone */}
      <div className="flex justify-center">
        <div
          className="relative rounded-[2.5rem] border-[8px] border-zinc-800 bg-zinc-800 shadow-2xl overflow-hidden"
          style={{ width: 280, height: 520 }}
          role="img"
          aria-label={`Prévisualisation WhatsApp pour ${groupName ?? 'Teacher Khati'}`}
        >
          {/* Encoche */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-24 bg-zinc-800 rounded-b-2xl z-10" />

          {/* Écran */}
          <div className="h-full bg-[#0a0a0a] overflow-hidden flex flex-col">
            {/* Status bar */}
            <div className="bg-[#1f2c34] px-4 pt-7 pb-2 flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs text-white font-bold shrink-0">
                TK
              </div>
              <div>
                <p className="text-white text-xs font-medium leading-tight">
                  {groupName ?? 'Teacher Khati'}
                </p>
                <p className="text-emerald-400 text-xs leading-tight">en ligne</p>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundColor: '#0b141a',
              }}
            >
              <div className="flex justify-end">
                <div
                  className="rounded-tl-xl rounded-bl-xl rounded-br-xl bg-[#005c4b] px-3 py-2 max-w-[90%] relative"
                  style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                >
                  <div className="absolute top-0 right-[-6px] w-0 h-0"
                    style={{
                      borderTop: '8px solid #005c4b',
                      borderRight: '8px solid transparent',
                    }}
                  />

                  {/* Miniature YouTube */}
                  {youtubeVideoId && (
                    <div className="mb-2 -mx-3 -mt-2 overflow-hidden rounded-t-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`}
                        alt="Aperçu vidéo YouTube"
                        className="w-full object-cover"
                        style={{ maxHeight: 100 }}
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <div className="bg-[#004236] px-2 py-1">
                        <p className="text-[9px] text-emerald-300 font-medium uppercase tracking-wide">
                          YouTube · Aperçu vidéo
                        </p>
                      </div>
                    </div>
                  )}

                  <div
                    className="text-white text-xs leading-[1.5] break-words"
                    dangerouslySetInnerHTML={{ __html: formattedHtml }}
                  />
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[9px] text-emerald-300">
                      {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <svg viewBox="0 0 16 11" className="h-2.5 w-2.5 fill-emerald-400" aria-hidden="true">
                      <path d="M11.071.653a.75.75 0 0 1 .206 1.04l-5.5 8a.75.75 0 0 1-1.197.09l-2.5-3a.75.75 0 1 1 1.15-.958l1.894 2.27 4.907-7.135a.75.75 0 0 1 1.04-.207z" />
                      <path d="M14.571.653a.75.75 0 0 1 .206 1.04l-5.5 8a.75.75 0 0 1-1.04.207.75.75 0 0 1-.207-1.04l5.5-8a.75.75 0 0 1 1.04-.207z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Barre d'input (décorative) */}
            <div className="bg-[#1f2c34] px-3 py-2 flex items-center gap-2">
              <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5">
                <span className="text-xs text-zinc-500">Message</span>
              </div>
              <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center shrink-0" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bouton copier */}
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Texte copié' : 'Copier le texte WhatsApp'}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.97]',
          copied
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
        )}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" aria-hidden="true" />
            Copié !
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copier le texte WhatsApp
          </>
        )}
      </button>
    </div>
  )
}
