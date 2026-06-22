// Fonction utilitaire partagée — envoi WhatsApp Business API
// Utilisée par /api/whatsapp/send et /api/whatsapp/catchup

export interface WaSendResult {
  success: boolean
  messageId?: string
  error?: string
  simulated: boolean
}

/**
 * Envoie un message texte via Meta WhatsApp Business API.
 * Retourne { simulated: true } si les variables d'env sont absentes.
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<WaSendResult> {
  const token      = process.env.WHATSAPP_API_TOKEN
  const phoneId    = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneId) {
    return { success: true, messageId: `sim_${Date.now()}`, simulated: true }
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message, preview_url: false },
        }),
        signal: AbortSignal.timeout(10_000),
      }
    )

    const data = await res.json() as {
      messages?: { id: string }[]
      error?:    { message: string; code: number }
    }

    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message ?? `HTTP ${res.status}`, simulated: false }
    }

    return { success: true, messageId: data.messages?.[0]?.id, simulated: false }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur réseau',
      simulated: false,
    }
  }
}

/**
 * Normalise un numéro de téléphone en format international E.164.
 * Ex: "06 12 34 56 78" → "+33612345678"
 */
export function normalizePhoneNumber(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('33') && digits.length === 11) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+33${digits.slice(1)}`
  if (digits.length >= 10) return `+${digits}`
  return null
}
