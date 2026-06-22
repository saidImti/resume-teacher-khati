// GET  /api/outils  — liste tous les outils de l'utilisateur
// POST /api/outils  — crée un nouvel outil

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const CATEGORIES = ['automation','crm','communication','stockage','paiement','calendrier','autre'] as const

const ToolSchema = z.object({
  name:         z.string().min(1).max(80),
  description:  z.string().max(300).optional(),
  icon_emoji:   z.string().max(8).optional(),
  category:     z.enum(CATEGORIES).optional(),
  external_url: z.string().url().optional().or(z.literal('')),
  webhook_url:  z.string().url().optional().or(z.literal('')),
  api_key:      z.string().max(500).optional(),
  is_active:    z.boolean().optional(),
  notes:        z.string().max(500).optional(),
})

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_tools')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tools: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = ToolSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('user_tools')
    .insert({ user_id: user.id, ...parsed.data })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
