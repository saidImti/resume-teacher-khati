import type { Metadata } from 'next'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { verifyRegistrationToken } from '@/lib/registration-token'
import { PublicRegistrationForm } from '@/components/inscription/PublicRegistrationForm'
import type { Level, Site } from '@/types'

export const metadata: Metadata = {
  title: 'Inscription Teacher Khati',
  description: 'Formulaire sécurisé d’inscription Teacher Khati.',
}

export default async function InscriptionPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token ?? ''
  const payload = verifyRegistrationToken(token)

  if (!payload) {
    return (
      <main className="min-h-screen bg-[#080806] px-4 py-12 text-[#f8f3e7]">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-[#c9a84c]/25 bg-[#141412] p-8 text-center shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#c9a84c]">Lien sécurisé</p>
          <h1 className="mt-3 text-3xl font-semibold">Inscription indisponible</h1>
          <p className="mt-3 text-sm leading-7 text-[#b8b0a0]">
            Ce lien est invalide ou expiré. Demandez un nouveau QR code à Teacher Khati.
          </p>
        </div>
      </main>
    )
  }

  const admin = createAdminSupabaseClient()
  const [sitesRes, levelsRes] = await Promise.all([
    admin.from('sites').select('*').eq('user_id', payload.userId).eq('is_active', true).order('name'),
    admin.from('levels').select('*').order('sort_order'),
  ])

  return (
    <PublicRegistrationForm
      token={token}
      sites={(sitesRes.data ?? []) as Site[]}
      levels={(levelsRes.data ?? []) as Level[]}
    />
  )
}
