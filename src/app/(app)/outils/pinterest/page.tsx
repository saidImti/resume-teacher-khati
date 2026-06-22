import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PinterestConnect } from '@/components/settings/PinterestConnect'

export const metadata = { title: 'Pinterest — Outils' }

export default async function OutilsPinterestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: settings } = await supabase
    .from('pinterest_settings')
    .select('access_token, pinterest_username, pinterest_profile_url, connected_at, pins_created')
    .eq('user_id', user.id)
    .maybeSingle()

  const params = await searchParams
  const connected = !!settings?.access_token

  return (
    <main className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
      {params.error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Connexion Pinterest échouée : <strong>{params.error}</strong>.
          Réessayez ou contactez le support.
        </div>
      )}
      <PinterestConnect
        connected={connected}
        username={settings?.pinterest_username}
        profileUrl={settings?.pinterest_profile_url}
        connectedAt={settings?.connected_at}
        pinsCreated={settings?.pins_created ?? 0}
      />
    </main>
  )
}
