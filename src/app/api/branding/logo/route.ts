// ─── API /api/branding/logo ───────────────────────────────────────────────────
// POST   → upload (remplace) le logo de l'école
// DELETE → retire le logo (retour au repère par défaut)

import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { ALLOWED_IMAGE_TYPES, MAX_BRANDING_FILE_SIZE, extFromMimeType, storagePathForLogo } from '@/lib/branding'

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

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Format non supporté — PNG, JPG ou WebP uniquement' }, { status: 400 })
  }
  if (file.size > MAX_BRANDING_FILE_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (2 Mo maximum)' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const path = storagePathForLogo(user.id, extFromMimeType(file.type))
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from('branding')
    .upload(path, buffer, { contentType: file.type, upsert: true })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { error: dbError } = await admin.from('users').update({ logo_url: path }).eq('id', user.id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const { data: signed } = await admin.storage.from('branding').createSignedUrl(path, 3600)
  return NextResponse.json({ logoUrl: signed?.signedUrl ?? null })
}

export async function DELETE() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { data: current } = await admin.from('users').select('logo_url').eq('id', user.id).maybeSingle()
  if (current?.logo_url) {
    await admin.storage.from('branding').remove([current.logo_url])
  }
  const { error } = await admin.from('users').update({ logo_url: null }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ removed: true })
}
