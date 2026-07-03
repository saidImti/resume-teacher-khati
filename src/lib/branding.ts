// ─── Branding : logo de l'école + signataires de documents ──────────────────
// Partagé entre les routes API et les pages d'impression (server components).
// Le bucket Storage `branding` est privé — toute lecture passe par une URL
// signée générée à la demande, jamais de lien public permanent.

import type { SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>

const BUCKET = 'branding'
const SIGNED_URL_TTL = 60 * 60 // 1h — largement suffisant pour l'affichage d'une page

export interface Signatory {
  id: string
  label: string
  signatureUrl: string | null // URL signée, prête à l'emploi dans un <img>, ou null
  sortOrder: number
}

export async function getLogoUrl(admin: AnySupabase, userId: string): Promise<string | null> {
  const { data: user } = await admin.from('users').select('logo_url').eq('id', userId).maybeSingle()
  if (!user?.logo_url) return null
  const { data } = await admin.storage.from(BUCKET).createSignedUrl(user.logo_url, SIGNED_URL_TTL)
  return data?.signedUrl ?? null
}

export async function getSignatories(admin: AnySupabase, userId: string): Promise<Signatory[]> {
  const { data } = await admin
    .from('signatories')
    .select('id, label, signature_url, sort_order')
    .eq('user_id', userId)
    .order('sort_order')

  return Promise.all((data ?? []).map(async (row) => {
    let signatureUrl: string | null = null
    if (row.signature_url) {
      const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(row.signature_url, SIGNED_URL_TTL)
      signatureUrl = signed?.signedUrl ?? null
    }
    return { id: row.id, label: row.label, signatureUrl, sortOrder: row.sort_order }
  }))
}

// Résout un logo pour un user_id donné SANS session active (page de connexion,
// publique). Cohérent avec l'hypothèse mono-utilisateur déjà en place ailleurs
// dans le projet (scripts de migration, Mode Test) : une seule enseignante.
export async function getLogoUrlForSoleUser(admin: AnySupabase): Promise<string | null> {
  const { data: user } = await admin.from('users').select('id, logo_url').limit(1).maybeSingle()
  if (!user?.logo_url) return null
  const { data } = await admin.storage.from(BUCKET).createSignedUrl(user.logo_url, SIGNED_URL_TTL)
  return data?.signedUrl ?? null
}

export function storagePathForLogo(userId: string, ext: string): string {
  return `${userId}/logo.${ext}`
}

export function storagePathForSignature(userId: string, signatoryId: string, ext: string): string {
  return `${userId}/signatories/${signatoryId}.${ext}`
}

export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
// 4 Mo — confortable pour un vrai scan de signature/logo, tout en restant
// sous la limite de charge utile des fonctions serverless Vercel (~4,5 Mo).
export const MAX_BRANDING_FILE_SIZE = 4 * 1024 * 1024

export function extFromMimeType(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}
