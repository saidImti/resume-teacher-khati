// PATCH /api/outils/[id] — modifie un outil
// DELETE /api/outils/[id] — supprime un outil

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const CATEGORIES = ['automation','crm','communication','stockage','paiement','calendrier','autre'] as const

const PatchSchema = z.object({
  name:         z.string().min(1).max(80).optional(),
  description:  z.string().max(300).optional(),
  icon_emoji:   z.string().max(8).optional(),
  category:     z.enum(CATEGORIES).optional(),
  external_url: z.string().url().optional().or(z.literal('')),
  webhook_url:  z.string().url().optional().or(z.literal('')),
  api_key:      z.string().max(500).optional(),
  is_active:    z.boolean().optional(),
  notes:        z.string().max(500).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('user_tools')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Outil introuvable' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { error } = await supabase
    .from('user_tools')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
