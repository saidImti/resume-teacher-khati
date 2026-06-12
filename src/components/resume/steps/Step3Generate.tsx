'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { StructuredLesson } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface GenerateResult {
  resumeId: string
  sessionId: string
  htmlContent: string
  whatsappText: string
  title: string
  tokensUsed: number
}

interface Step3GenerateProps {
  groupId: string
  sessionDate: string
  structuredLesson: StructuredLesson
  academicYearId?: string
  onSuccess: (result: GenerateResult) => void
  onBack: () => void
}

// ─── Messages d'animation pendant la génération ──────────────────────────────

const LOADING_MESSAGES = [
  '🔍 Analyse du contenu pédagogique...',
  '🧠 GPT-4o réfléchit au meilleur résumé...',
  '✍️ Rédaction du résumé en cours...',
  '🎨 Mise en forme du contenu...',
  '✅ Finalisation et sauvegarde...',
]

// ─── Composant ───────────────────────────────────────────────────────────────

export function Step3Generate({
  groupId,
  sessionDate,
  structuredLesson,
  academicYearId,
  onSuccess,
  onBack,
}: Step3GenerateProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [error, setError]               = useState<string | null>(null)
  const [, setIsGenerating]             = useState(false)

  async function generate() {
    setIsGenerating(true)
    setError(null)
    setMessageIndex(0)

    const interval = setInterval(() => {
      setMessageIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1))
    }, 2500)

    try {
      const response = await fetch('/api/resumes/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          groupId,
          sessionDate,
          structuredContent: structuredLesson,
          academicYearId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? `Erreur ${response.status}`)
      }

      clearInterval(interval)
      setMessageIndex(LOADING_MESSAGES.length - 1)

      await new Promise((r) => setTimeout(r, 600))

      onSuccess(data as GenerateResult)
    } catch (err) {
      clearInterval(interval)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    void generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Erreur ──────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold text-destructive mb-1">Erreur de génération</h3>
          <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack}>
            Retour
          </Button>
          <Button onClick={() => void generate()}>
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  // ─── Loading ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-8">
      <div className="relative">
        <div className="h-24 w-24 rounded-3xl bg-primary/10 flex items-center justify-center text-4xl animate-bounce">
          ✨
        </div>
        <div className="absolute inset-0 rounded-3xl border-2 border-primary/20 animate-ping" />
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Génération en cours</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          GPT-4o analyse votre cours et rédige un résumé adapté au niveau des élèves.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 px-6 py-3 text-sm font-medium animate-fade-in">
        {LOADING_MESSAGES[messageIndex]}
      </div>

      <div className="w-full max-w-xs">
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700"
            style={{
              width: `${((messageIndex + 1) / LOADING_MESSAGES.length) * 100}%`,
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Étape {messageIndex + 1} / {LOADING_MESSAGES.length}
        </p>
      </div>
    </div>
  )
}
