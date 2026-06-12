/**
 * /api/setup — Création du compte initial Teacher Khati
 * À appeler UNE SEULE FOIS depuis le navigateur.
 * Supprime ou désactive cet endpoint après utilisation.
 */
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Variables d\'environnement manquantes' }, { status: 500 })
  }

  // Client admin (service role — contourne RLS)
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Vérifier si un utilisateur existe déjà
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  if (existingUsers?.users?.length > 0) {
    const emails = existingUsers.users.map(u => u.email).join(', ')
    return NextResponse.json({
      message: '✅ Des comptes existent déjà.',
      comptes: emails,
    })
  }

  // Créer le compte principal
  const { data, error } = await admin.auth.admin.createUser({
    email: 'teacher@khati.fr',
    password: 'TeacherKhati2026!',
    email_confirm: true,
    user_metadata: { full_name: 'Teacher Khati', role: 'admin' },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    message: '🎉 Compte créé avec succès !',
    email: 'teacher@khati.fr',
    password: 'TeacherKhati2026!',
    userId: data.user?.id,
    note: 'Connecte-toi puis change ton mot de passe. Supprime ensuite /api/setup.',
  })
}
