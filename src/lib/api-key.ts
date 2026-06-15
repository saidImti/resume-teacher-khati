/**
 * Utilitaire de gestion des clés API externes
 * Utilisé par le middleware et les routes API
 */
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'crypto'
import { getAdminSupabaseEnv } from '@/lib/supabase/env'

// ── Constantes ────────────────────────────────────────────────
const KEY_PREFIX = 'rtk_'   // "résumé teacher khati"
const KEY_BYTES  = 32        // 256 bits → 64 hex chars

// ── Génération d'une nouvelle clé ────────────────────────────
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw    = KEY_PREFIX + randomBytes(KEY_BYTES).toString('hex')
  const hash   = hashApiKey(raw)
  const prefix = raw.slice(0, 12) + '…'   // "rtk_ab12cd…"
  return { raw, hash, prefix }
}

// ── Hachage SHA-256 ───────────────────────────────────────────
export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

// ── Validation d'une clé depuis une requête ──────────────────
export async function validateApiKey(key: string): Promise<{
  valid: boolean
  userId?: string
  scopes?: string[]
  error?: string
}> {
  if (!key?.startsWith(KEY_PREFIX)) {
    return { valid: false, error: 'Format de clé invalide' }
  }

  const hash = hashApiKey(key)

  const { url, serviceRoleKey } = getAdminSupabaseEnv()

  const admin = createClient(
    url,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await admin
    .from('api_keys')
    .select('id, user_id, scopes, expires_at, is_active')
    .eq('key_hash', hash)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return { valid: false, error: 'Clé API invalide ou révoquée' }
  }

  // Vérifier l'expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: 'Clé API expirée' }
  }

  // Mettre à jour last_used_at (sans attendre)
  admin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})

  return {
    valid: true,
    userId: data.user_id,
    scopes: data.scopes ?? ['read'],
  }
}

// ── Vérification de scope ─────────────────────────────────────
export function hasScope(scopes: string[], required: 'read' | 'write' | 'admin'): boolean {
  if (scopes.includes('admin')) return true
  if (required === 'write' && scopes.includes('write')) return true
  if (required === 'read'  && scopes.includes('read'))  return true
  return false
}
