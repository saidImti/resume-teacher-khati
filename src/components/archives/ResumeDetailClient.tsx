'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { WhatsAppPreview } from '@/components/resume/WhatsAppPreview'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResumeDetailClientProps {
  resumeId: string
  status: string
  whatsappText: string
  groupName?: string
}

const STATUS_TRANSITIONS: Record<string, { next: string; label: string } | null> = {
  draft:    { next: 'reviewed', label: 'Marquer comme révisé' },
  reviewed: { next: 'approved', label: 'Approuver' },
  approved: { next: 'sent', label: 'Marquer comme envoyé' },
  sent:     null,
}

const STATUS_LABELS: Record<string, string> = {
  draft:    'Brouillon',
  reviewed: 'Révisé',
  approved: 'Approuvé',
  sent:     'Envoyé',
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function ResumeDetailClient({
  resumeId,
  status: initialStatus,
  whatsappText,
  groupName,
}: ResumeDetailClientProps) {
  const [status, setStatus] = useState(initialStatus)
  const [isUpdating, setIsUpdating] = useState(false)

  const transition = STATUS_TRANSITIONS[status] ?? null

  async function handleStatusChange() {
    if (!transition) return
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/resumes/${resumeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: transition.next }),
      })

      if (!res.ok) {
        toast.error('Erreur lors de la mise à jour')
        return
      }

      setStatus(transition.next)
      toast.success(`Statut mis à jour : ${STATUS_LABELS[transition.next]}`)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Actions statut */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Actions
          </h2>
          <StatusChip status={status} />
        </div>

        <div className="flex flex-col gap-2">
          {transition && (
            <button
              onClick={handleStatusChange}
              disabled={isUpdating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                bg-primary text-primary-foreground text-sm font-medium
                hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Mise à jour...' : transition.label}
            </button>
          )}

          {status === 'sent' && (
            <p className="text-xs text-center text-muted-foreground py-2">
              ✓ Ce résumé a été envoyé aux parents.
            </p>
          )}
        </div>
      </section>

      {/* Prévisualisation WhatsApp */}
      {whatsappText && (
        <section className="rounded-xl border border-border bg-card p-4">
          <WhatsAppPreview text={whatsappText} groupName={groupName} />
        </section>
      )}
    </div>
  )
}

// ─── StatusChip ───────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft:    'bg-zinc-100 text-zinc-600',
    reviewed: 'bg-blue-50 text-blue-600',
    approved: 'bg-emerald-50 text-emerald-600',
    sent:     'bg-violet-50 text-violet-600',
  }
  const label: Record<string, string> = {
    draft: 'Brouillon', reviewed: 'Révisé', approved: 'Approuvé', sent: 'Envoyé',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[status] ?? colors['draft']}`}>
      {label[status] ?? status}
    </span>
  )
}
