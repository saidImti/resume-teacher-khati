import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
const Schema = z.object({ status: z.enum(['trial', 'active', 'suspended', 'departed']) })
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  const { id } = await params
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.from('students').update({
    status: parsed.data.status,
    departure_date: parsed.data.status === 'departed' ? new Date().toISOString().slice(0, 10) : null,
  }).eq('id', id).select('*, site:sites(*), level:levels(*), enrollments(*, group:groups(*, level:levels(*), site:sites(*)))').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
