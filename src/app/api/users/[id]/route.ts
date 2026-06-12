import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withApiAuth } from '@/lib/with-api-auth'
import type { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

function adminClient() {
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── PATCH /api/users/[id] — modifier email / displayName / role / password ──
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await withApiAuth(request, 'admin')
  if (!auth.ok) return auth.response

  const { id } = params
  const body = await request.json()
  const { email, password, displayName, role } = body

  const admin = adminClient()

  const update: Record<string, unknown> = {}
  if (email)       update.email    = email
  if (password)    update.password = password

  const meta: Record<string, string> = {}
  if (displayName !== undefined) meta.display_name = displayName
  if (role)                      meta.role          = role
  if (Object.keys(meta).length)  update.user_metadata = meta

  const { data, error } = await admin.auth.admin.updateUserById(id, update)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({
    user: {
      id:          data.user.id,
      email:       data.user.email,
      role:        (data.user.user_metadata?.role as string) ?? 'teacher',
      displayName: (data.user.user_metadata?.display_name as string) ?? null,
    },
  })
}

// ── DELETE /api/users/[id] — supprimer un compte ────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await withApiAuth(request, 'admin')
  if (!auth.ok) return auth.response

  // Sécurité : on ne peut pas se supprimer soi-même
  if (params.id === auth.userId) {
    return NextResponse.json({ error: 'Impossible de supprimer votre propre compte.' }, { status: 403 })
  }

  const admin = adminClient()
  const { error } = await admin.auth.admin.deleteUser(params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
