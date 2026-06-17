'use client'

import { useState } from 'react'
import { ChevronLeft, CheckCircle, Loader2, LayoutDashboard, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { WhatsAppSendPanel } from '@/components/whatsapp/WhatsAppSendPanel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Step5WhatsAppProps {
  resumeId: string
  groupId: string
  title: string
  whatsappText: string
  groupName: string
  queuedCount?: number
  onNextQueued?: () => void
  onBack: () => void
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function Step5WhatsApp({
  resumeId,
  groupId,
  title,
  whatsappText,
  groupName,
  queuedCount = 0,
  onNextQueued,
  onBack,
}: Step5WhatsAppProps) {
  const router = useRouter()
  const [isApproving, setIsApproving] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [hasSent, setHasSent] = useState(false)

  // ── Approuver le résumé ──────────────────────────────────────────────────

  async function handleApprove() {
    setIsApproving(true)
    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })
      const data = await response.json().catch(() => null) as { error?: string; details?: string } | null
      if (!response.ok) throw new Error(data?.details ?? data?.error ?? 'Erreur validation')
      setIsApproved(true)
      toast.success('Résumé approuvé !')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la validation')
    } finally {
      setIsApproving(false)
    }
  }

  // ── Succès après approbation ─────────────────────────────────────────────

  if (isApproved) {
    return (
      <div className="space-y-6">
        {/* En-tête succès */}
        <div className="flex flex-col items-center py-6 space-y-4 text-center">
          <div className="h-16 w-16 rounded-3xl bg-emerald-100 flex items-center justify-center text-3xl">
            🎉
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-1 text-emerald-700">
              Résumé approuvé !
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Le résumé est validé. Envoyez-le maintenant aux parents
              ou retrouvez-le dans les archives.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status="approved" />
          </div>
        </div>

        {/* Panel d'envoi WhatsApp */}
        <WhatsAppSendPanel
          resumeId={resumeId}
          groupId={groupId}
          groupName={groupName}
          whatsappText={whatsappText}
          onSendSuccess={() => setHasSent(true)}
        />

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push(`/archives/${resumeId}`)}
          >
            <ExternalLink className="h-4 w-4" />
            Voir le résumé
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              if (queuedCount > 0 && onNextQueued) {
                onNextQueued()
                return
              }
              router.push('/dashboard')
            }}
          >
            <LayoutDashboard className="h-4 w-4" />
            {queuedCount > 0
              ? `Resume suivant (${queuedCount})`
              : hasSent ? 'Retour au dashboard' : 'Terminer'}
          </Button>
        </div>
      </div>
    )
  }

  // ── Vue principale (avant approbation) ───────────────────────────────────

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold mb-1">Envoi WhatsApp</h2>
          <p className="text-sm text-muted-foreground">
            Vérifiez le message puis approuvez pour activer l&apos;envoi.
          </p>
        </div>
        <StatusBadge status="draft" />
      </div>

      {/* Titre du résumé */}
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground mb-0.5">Résumé</p>
        <p className="font-medium text-sm">{title}</p>
      </div>

      {/* Panel d'envoi (preview + bouton) */}
      <WhatsAppSendPanel
        resumeId={resumeId}
        groupId={groupId}
        groupName={groupName}
        whatsappText={whatsappText}
      />

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          Modifier
        </Button>

        <Button
          onClick={handleApprove}
          disabled={isApproving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isApproving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          Approuver & Envoyer
        </Button>
      </div>
    </div>
  )
}
