// ─── API /api/signatories/[id] ────────────────────────────────────────────────
// PATCH  → renomme et/ou remplace la signature d'un signataire
// DELETE → supprime un signataire (+ son fichier de signature)

import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import {
  ALLOWED_IMAGE_TYPES, MAX_BRANDING_FILE_SIZE, extFromMimeType,
  getSignatories, storagePathForSignature,
} from '@/lib/branding'

interface Params { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { data: owned } = await admin.from('signatories').select('id, user_id').eq('id', id).maybeSingle()
  if (!owned || owned.user_id !== user.id) return NextResponse.json({ error: 'Signataire introuvable' }, { status: 404 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Requête multipart invalide' }, { status: 400 })
  }

  const label = formData.get('label')
  if (typeof label === 'string' && label.trim()) {
    await admin.from('signatories').update({ label: label.trim() }).eq('id', id)
  }

  const file = formData.get('file')
  if (file instanceof File) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Format non supporté — PNG, JPG ou WebP uniquement' }, { status: 400 })
    }
    if (file.size > MAX_BRANDING_FILE_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (2 Mo maximum)' }, { status: 400 })
    }
    const path = storagePathForSignature(user.id, id, extFromMimeType(file.type))
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await admin.storage.from('branding').upload(path, buffer, { contentType: file.type, upsert: true })
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
    await admin.from('signatories').update({ signature_url: path }).eq('id', id)
  }

  const signatories = await getSignatories(admin, user.id)
  return NextResponse.json({ signatories })
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { data: owned } = await admin.from('signatories').select('id, user_id, signature_url').eq('id', id).maybeSingle()
  if (!owned || owned.user_id !== user.id) return NextResponse.json({ error: 'Signataire introuvable' }, { status: 404 })

  if (owned.signature_url) await admin.storage.from('branding').remove([owned.signature_url])
  const { error } = await admin.from('signatories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const signatories = await getSignatories(admin, user.id)
  return NextResponse.json({ signatories })
}
