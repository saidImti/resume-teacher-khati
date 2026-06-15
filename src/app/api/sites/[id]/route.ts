import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const UpdateSiteSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(240).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  is_active: z.boolean().optional(),
})

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { id } = await params
    const parsed = UpdateSiteSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 })
    }

    const updates: Record<string, unknown> = { ...parsed.data }
    if ('address' in parsed.data) updates.address = parsed.data.address || null
    if (parsed.data.name) updates.slug = slugify(parsed.data.name)

    const { data, error } = await supabase
      .from('sites')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error || !data) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { id } = await params
    const { error } = await supabase
      .from('sites')
      .update({ is_active: false })
      .eq('id', id)

    if (error) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
