import { NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/with-api-auth'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await withApiAuth(request, 'admin')
  if (!auth.ok) return auth.response

  const { id } = params
  const body = await request.json()
  const { email, password, displayName, role } = body

  const update: Record<string, unknown> = {}
  if (email) update.email = email
  if (password) update.password = password

  const meta: Record<string, string> = {}
  if (displayName !== undefined) meta.display_name = displayName
  if (role) meta.role = role
  if (Object.keys(meta).length) update.user_metadata = meta

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.auth.admin.updateUserById(id, update)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      role: (data.user.user_metadata?.role as string) ?? 'teacher',
      displayName: (data.user.user_metadata?.display_name as string) ?? null,
    },
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await withApiAuth(request, 'admin')
  if (!auth.ok) return auth.response

  if (params.id === auth.userId) {
    return NextResponse.json({ error: 'Impossible de supprimer votre propre compte.' }, { status: 403 })
  }

  const admin = createAdminSupabaseClient()
  const { error } = await admin.auth.admin.deleteUser(params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
