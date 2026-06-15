import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const SiteSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100),
  address: z.string().max(240).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide'),
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const parsed = SiteSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('sites')
      .insert({
        name: parsed.data.name,
        slug: slugify(parsed.data.name),
        address: parsed.data.address || null,
        color: parsed.data.color,
        is_active: parsed.data.is_active ?? true,
      })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Un site avec ce nom existe deja' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
