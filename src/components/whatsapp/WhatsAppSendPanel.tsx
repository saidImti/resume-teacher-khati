'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { WhatsAppPreview } from '@/components/resume/WhatsAppPreview'
import type { WhatsAppSend } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WhatsAppSendPanelProps {
  resumeId: string
  groupId: string
  groupName: string
  whatsappText: string
  onSendSuccess?: () => void
}

interface SendResult {
  success: boolean
  simulated: boolean
  status: string
  sendId?: string
  messageLength: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: WhatsAppSend['status'] }) {
  switch (status) {
    case 'sent':
      return <CheckCircle className="h-4 w-4 text-emerald-500" />
    case 'sending':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
    case 'partial_error':
      return <AlertCircle className="h-4 w-4 text-amber-500" />
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-destructive" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

function StatusLabel({ status }: { status: WhatsAppSend['status'] }) {
  const labels: Record<WhatsAppSend['status'], string> = {
    pending: 'En attente',
    sending: 'Envoi en cours',
    sent: 'Envoyé',
    partial_error: 'Erreur partielle',
    failed: 'Échec',
  }
  return <span>{labels[status] ?? status}</span>
}

function formatSentAt(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function WhatsAppSendPanel({
  resumeId,
  groupId,
  groupName,
  whatsappText,
  onSendSuccess,
}: WhatsAppSendPanelProps) {
  const [isSending, setIsSending] = useState(false)
  const [lastResult, setLastResult] = useState<SendResult | null>(null)
  const [sends, setSends] = useState<WhatsAppSend[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // ── Charger l'historique ─────────────────────────────────────────────────

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const res = await fetch(
        `/api/whatsapp/sends?resumeId=${resumeId}&limit=5`
      )
      if (res.ok) {
        const data = (await res.json()) as { sends: WhatsAppSend[] }
        setSends(data.sends)
      }
    } catch {
      // Silencieux — l'historique est optionnel
    } finally {
      setIsLoadingHistory(false)
    }
  }, [resumeId])

  useEffect(() => {
    if (showHistory) loadHistory()
  }, [showHistory, loadHistory])

  // ── Envoi ──────────────────────────────────────────────────────────────

  async function handleSend() {
    setIsSending(true)
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId, groupId }),
      })

      const data = (await res.json()) as SendResult & { error?: string }

      if (!res.ok || !data.success) {
        const msg = data.error ?? 'Erreur lors de l\'envoi'
        toast.error(typeof msg === 'string' ? msg : 'Erreur lors de l\'envoi')
        return
      }

      setLastResult(data)

      if (data.simulated) {
        toast.success(
          `✅ Message préparé pour ${groupName} (${data.messageLength} car.) — envoi simulé`,
          { duration: 5000 }
        )
      } else {
        toast.success(`✅ Message envoyé au groupe ${groupName} !`)
      }

      onSendSuccess?.()
      // Rafraîchir l'historique si ouvert
      if (showHistory) loadHistory()
    } catch {
      toast.error('Erreur réseau. Réessayez.')
    } finally {
      setIsSending(false)
    }
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Preview WhatsApp (miniature YouTube intégrée dans la bulle) */}
      <WhatsAppPreview text={whatsappText} groupName={groupName} />

      {/* Résultat dernier envoi */}
      {lastResult && (
        <div
          className={
            lastResult.status === 'sent'
              ? 'rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3'
              : 'rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3'
          }
        >
          {lastResult.status === 'sent' ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          )}
          <div>
            <p className="text-xs font-medium text-foreground">
              {lastResult.simulated
                ? '📋 Message préparé — prêt à envoyer manuellement'
                : '✅ Message envoyé via WhatsApp Business API'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lastResult.messageLength} caractères
              {lastResult.simulated && (
                <> · <span className="italic">Mode simulation actif</span></>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Info mode simulation */}
      {!lastResult && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-blue-800">
              Envoi WhatsApp Business
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              Configurez{' '}
              <code className="bg-blue-100 px-1 rounded text-xs">
                WHATSAPP_API_TOKEN
              </code>{' '}
              et{' '}
              <code className="bg-blue-100 px-1 rounded text-xs">
                WHATSAPP_PHONE_NUMBER_ID
              </code>{' '}
              dans votre <code className="bg-blue-100 px-1 rounded text-xs">.env.local</code>{' '}
              pour activer l&apos;envoi réel. En l&apos;absence de ces variables, l&apos;envoi
              est simulé et le résumé est marqué comme envoyé.
            </p>
          </div>
        </div>
      )}

      {/* Bouton envoi principal */}
      <Button
        onClick={handleSend}
        disabled={isSending}
        className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-medium"
        size="lg"
      >
        {isSending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Envoi en cours…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {lastResult ? 'Renvoyer au groupe' : `Envoyer au groupe ${groupName}`}
          </>
        )}
      </Button>

      {/* Historique des envois */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3
            text-sm font-medium hover:bg-muted/30 transition text-left"
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Historique des envois
          </span>
          <span className="text-xs text-muted-foreground">
            {showHistory ? '▲ Masquer' : '▼ Afficher'}
          </span>
        </button>

        {showHistory && (
          <div className="border-t border-border">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement…
              </div>
            ) : sends.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">
                Aucun envoi enregistré pour ce résumé.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {sends.map((send) => (
                  <div
                    key={send.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <StatusIcon status={send.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <StatusLabel status={send.status} />
                        {send.recipient_count > 0 && (
                          <span className="text-muted-foreground font-normal">
                            · {send.recipient_count} destinataire
                            {send.recipient_count > 1 ? 's' : ''}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatSentAt(send.sent_at)}
                        {send.message_body && (
                          <> · {send.message_body.length} car.</>
                        )}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Bouton rafraîchir */}
                <div className="px-4 py-2 bg-muted/20">
                  <button
                    type="button"
                    onClick={loadHistory}
                    disabled={isLoadingHistory}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Rafraîchir
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
