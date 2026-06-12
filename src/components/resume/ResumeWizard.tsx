'use client'

import { useState, useEffect } from 'react'
import type { Group, Level, Site, StructuredLesson } from '@/types'
import { WizardProgress } from './WizardProgress'
import { Step1Group, type Step1Data } from './steps/Step1Group'
import { Step2Content, type Step2Data } from './steps/Step2Content'
import { Step3Generate } from './steps/Step3Generate'
import { Step4Review } from './steps/Step4Review'
import { Step5WhatsApp } from './steps/Step5WhatsApp'

// ─── Types ───────────────────────────────────────────────────────────────────

interface GroupWithLevel extends Group {
  level?: Level
}

interface GroupsBySite {
  site: Site
  groups: GroupWithLevel[]
}

interface WizardState {
  // Étape 1
  groupId: string
  groupName: string
  levelName: string
  levelId: string
  sessionDate: string
  // Étape 2
  structuredLesson: StructuredLesson
  // Étape 3 (résultat API)
  resumeId: string
  sessionId: string
  htmlContent: string
  whatsappText: string
  title: string
}

interface ResumeWizardProps {
  groupsBySite: GroupsBySite[]
  defaultGroupId?: string
  academicYearId?: string
}

// ─── Valeurs initiales ────────────────────────────────────────────────────────

const INITIAL_STATE: WizardState = {
  groupId:          '',
  groupName:        '',
  levelName:        '',
  levelId:          '',
  sessionDate:      '',
  structuredLesson: { theme: '', items: [] },
  resumeId:         '',
  sessionId:        '',
  htmlContent:      '',
  whatsappText:     '',
  title:            '',
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ResumeWizard({
  groupsBySite,
  defaultGroupId,
  academicYearId,
}: ResumeWizardProps) {
  const [step, setStep]           = useState(1)
  const [maxReachedStep, setMax]  = useState(1)
  const [state, setState]         = useState<WizardState>(INITIAL_STATE)

  // ── Prefill depuis Mes Padlets (sessionStorage) ──────────────────────────
  useEffect(() => {
    try {
      const lessonRaw  = sessionStorage.getItem('padlet_prefill_lesson')
      const groupId    = sessionStorage.getItem('padlet_prefill_groupId')
      const date       = sessionStorage.getItem('padlet_prefill_date')
      const groupMetaR = sessionStorage.getItem('padlet_prefill_group')

      if (!lessonRaw || !groupId || !date) return

      // Nettoyer immédiatement
      sessionStorage.removeItem('padlet_prefill_lesson')
      sessionStorage.removeItem('padlet_prefill_groupId')
      sessionStorage.removeItem('padlet_prefill_date')
      sessionStorage.removeItem('padlet_prefill_group')

      const lesson    = JSON.parse(lessonRaw) as StructuredLesson
      const groupMeta = groupMetaR ? (JSON.parse(groupMetaR) as { id: string; name: string; levelName: string; levelSlug: string }) : null

      // Cherche le groupe dans les données chargées (peut être absent si pas d'année académique active)
      const allGroups = groupsBySite.flatMap((s) => s.groups)
      const group     = allGroups.find((g) => g.id === groupId)

      // Pré-remplir le state en utilisant le groupe trouvé OU les métadonnées stockées
      setState((prev) => ({
        ...prev,
        groupId,
        groupName:        group?.name         ?? groupMeta?.name      ?? 'Groupe',
        levelName:        group?.level?.name  ?? groupMeta?.levelName ?? 'Niveau',
        levelId:          group?.level?.id    ?? '',
        sessionDate:      date,
        structuredLesson: lesson,
      }))
      setMax(3)
      setStep(3)
    } catch {
      // Prefill optionnel — échec silencieux
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mise à jour du step avec tracking de maxReachedStep
  function goToStep(target: number) {
    setStep(target)
    setMax((prev) => Math.max(prev, target))
  }

  // Clic sur une étape du WizardProgress (step 3 = automatique, on ignore)
  function handleStepClick(target: number) {
    if (target === 3) return           // Génération = automatique, pas cliquable
    if (target > maxReachedStep) return // Étape non encore atteinte
    setStep(target)
  }

  // ─── Handlers des étapes ────────────────────────────────────────────────

  function handleStep1Next(data: Step1Data) {
    const allGroups = groupsBySite.flatMap((s) => s.groups)
    const group     = allGroups.find((g) => g.id === data.groupId)

    setState((prev) => ({
      ...prev,
      groupId:     data.groupId,
      groupName:   group?.name       ?? 'Groupe',
      levelName:   group?.level?.name ?? 'Niveau',
      levelId:     group?.level?.id   ?? '',
      sessionDate: data.sessionDate,
    }))
    goToStep(2)
  }

  function handleStep2Next(data: Step2Data) {
    setState((prev) => ({ ...prev, structuredLesson: data }))
    goToStep(3)
  }

  function handleStep3Success(result: {
    resumeId: string
    sessionId: string
    htmlContent: string
    whatsappText: string
    title: string
    tokensUsed: number
  }) {
    setState((prev) => ({
      ...prev,
      resumeId:     result.resumeId,
      sessionId:    result.sessionId,
      htmlContent:  result.htmlContent,
      whatsappText: cleanWhatsAppText(result.whatsappText),
      title:        result.title,
    }))
    goToStep(4)
  }

  function htmlToWhatsAppText(html: string): string {
    return html
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '$1\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '$1')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  /**
   * Supprime les URLs padletusercontent.com du texte WhatsApp.
   * Ces URLs sont longues, tokenisées et expirables — inutiles pour les parents.
   * Les liens YouTube, Wordwall et autres URLs courtes sont conservés.
   */
  function cleanWhatsAppText(text: string): string {
    return text
      .replace(/\s*🔗\s*Lien\s*:\s*https?:\/\/\S*padletusercontent\.com\S*/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  function handleStep4Next(updatedHtml: string) {
    const rawText    = htmlToWhatsAppText(updatedHtml)
    const whatsappText = cleanWhatsAppText(rawText)
    setState((prev) => ({ ...prev, htmlContent: updatedHtml, whatsappText }))
    goToStep(5)
  }

  // ─── Rendu de l'étape courante ───────────────────────────────────────────

  function renderStep() {
    switch (step) {
      case 1:
        return (
          <Step1Group
            groupsBySite={groupsBySite}
            defaultGroupId={defaultGroupId}
            onNext={handleStep1Next}
          />
        )

      case 2:
        return (
          <Step2Content
            groupName={state.groupName}
            levelName={state.levelName}
            sessionDate={state.sessionDate}
            initialLesson={
              state.structuredLesson.items.length > 0 ? state.structuredLesson : undefined
            }
            onNext={handleStep2Next}
            onBack={() => setStep(1)}
          />
        )

      case 3:
        return (
          <Step3Generate
            groupId={state.groupId}
            sessionDate={state.sessionDate}
            structuredLesson={state.structuredLesson}
            academicYearId={academicYearId}
            onSuccess={handleStep3Success}
            onBack={() => setStep(2)}
          />
        )

      case 4:
        return (
          <Step4Review
            resumeId={state.resumeId}
            title={state.title}
            htmlContent={state.htmlContent}
            levelId={state.levelId || undefined}
            onNext={handleStep4Next}
            onBack={() => setStep(2)}
          />
        )

      case 5:
        return (
          <Step5WhatsApp
            resumeId={state.resumeId}
            groupId={state.groupId}
            title={state.title}
            whatsappText={state.whatsappText}
            groupName={state.groupName}
            onBack={() => setStep(4)}
          />
        )

      default:
        return null
    }
  }

  // ─── Rendu ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Progression */}
      <div className="mb-8">
        <WizardProgress
          currentStep={step}
          maxReachedStep={maxReachedStep}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Étape courante */}
      {renderStep()}
    </div>
  )
}
