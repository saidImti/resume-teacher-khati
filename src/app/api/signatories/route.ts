// ─── API /api/signatories ─────────────────────────────────────────────────────
// GET  → liste mes signataires (avec URL signée de leur signature)
// POST → crée un signataire (label + signature optionnelle)

import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import {
  ALLOWED_IMAGE_TYPES, MAX_BRANDING_FILE_SIZE, extFromMimeType,
  getSignatories, storagePathForSignature,
} from '@/lib/branding'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const signatories = await getSignatories(admin, user.id)
  return NextResponse.json({ signatories })
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Requête multipart invalide' }, { status: 400 })
  }

  const label = String(formData.get('label') ?? '').trim()
  if (!label) return NextResponse.json({ error: 'Le nom du signataire est requis' }, { status: 400 })

  const admin = createAdminSupabaseClient()

  const { count } = await admin.from('signatories').select('*', { count: 'exact', head: true }).eq('user_id', user.id)

  const { data: created, error: createError } = await admin
    .from('signatories')
    .insert({ user_id: user.id, label, sort_order: count ?? 0 })
    .select('id')
    .single()
  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })

  const file = formData.get('file')
  if (file instanceof File) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Format non supporté — PNG, JPG ou WebP uniquement' }, { status: 400 })
    }
    if (file.size > MAX_BRANDING_FILE_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (2 Mo maximum)' }, { status: 400 })
    }
    const path = storagePathForSignature(user.id, created.id, extFromMimeType(file.type))
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await admin.storage.from('branding').upload(path, buffer, { contentType: file.type, upsert: true })
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
    await admin.from('signatories').update({ signature_url: path }).eq('id', created.id)
  }

  const signatories = await getSignatories(admin, user.id)
  return NextResponse.json({ signatories }, { status: 201 })
}
