'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, Save, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResumeEditor } from '@/components/resume/ResumeEditor'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ActivityCard } from '@/components/activites/ActivityCard'
import { toast } from 'sonner'
import type { Activity } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Step4ReviewProps {
  resumeId: string
  title: string
  htmlContent: string
  levelId?: string
  onNext: (updatedHtml: string) => void
  onBack: () => void
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function Step4Review({
  resumeId,
  title,
  htmlContent,
  levelId,
  onNext,
  onBack,
}: Step4ReviewProps) {
  const [currentHtml, setCurrentHtml] = useState(htmlContent)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [showActivities, setShowActivities] = useState(false)

  // Charger les activités du niveau
  const loadActivities = useCallback(async () => {
    try {
      const url = levelId
        ? `/api/activities?levelId=${levelId}`
        : '/api/activities'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setActivities(data as Activity[])
      }
    } catch {
      // silencieux
    }
  }, [levelId])

  useEffect(() => {
    if (showActivities && activities.length === 0) {
      loadActivities()
    }
  }, [showActivities, activities.length, loadActivities])

  function handleAddActivity(activity: Activity) {
    // Injecter l'activité dans le HTML du résumé
    const activityHtml = `<p><strong>${activity.emoji ?? '🎯'} ${activity.name}</strong>${
      activity.description ? ` — ${activity.description}` : ''
    }${activity.duration_min ? ` (${activity.duration_min} min)` : ''}</p>`
    setCurrentHtml((prev) => prev + activityHtml)
    setIsSaved(false)
    toast.success(`"${activity.name}" ajoutée au résumé`)
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html_content: currentHtml, status: 'reviewed' }),
      })

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde')

      setIsSaved(true)
      toast.success('Résumé sauvegardé !')
    } catch {
      toast.error('Erreur de sauvegarde — vérifiez votre connexion')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold mb-1">Réviser le résumé</h2>
          <p className="text-sm text-muted-foreground">
            Relisez et modifiez le résumé avant de l&apos;envoyer aux parents.
          </p>
        </div>
        <StatusBadge status="reviewed" />
      </div>

      {/* Titre */}
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground mb-0.5">Titre</p>
        <p className="font-medium text-sm">{title}</p>
      </div>

      {/* Layout éditeur + panel activités */}
      <div className="grid gap-4" style={{ gridTemplateColumns: showActivities ? '1fr 280px' : '1fr' }}>
        {/* Éditeur TipTap */}
        <div>
          <ResumeEditor
            initialContent={currentHtml}
            onChange={(html) => { setCurrentHtml(html); setIsSaved(false) }}
            className="min-h-[300px]"
          />
        </div>

        {/* Panel activités */}
        {showActivities && (
          <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col" style={{ maxHeight: 420 }}>
            <div className="px-3 py-2.5 border-b border-border bg-accent/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Activités suggérées
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {activities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Aucune activité pour ce niveau.
                </p>
              ) : (
                activities.map((a) => (
                  <ActivityCard
                    key={a.id}
                    activity={a}
                    compact
                    onAdd={handleAddActivity}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toggle activités + aide */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p>💡 Les modifications sont locales jusqu&apos;à la sauvegarde.</p>
        <button
          type="button"
          onClick={() => setShowActivities((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-accent transition font-medium"
        >
          🎯 {showActivities ? 'Masquer les activités' : 'Ajouter une activité'}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          Retour
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSaved ? (
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaved ? 'Sauvegardé' : 'Sauvegarder'}
          </Button>

          <Button onClick={() => onNext(currentHtml)}>
            Prévisualiser WhatsApp 📱
          </Button>
        </div>
      </div>
    </div>
  )
}
