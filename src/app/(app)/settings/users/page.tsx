import { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { UsersManager } from './UsersManager'

export const metadata: Metadata = { title: 'Comptes — Paramètres' }

export default async function UsersPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Comptes utilisateurs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez les accès au dashboard. Chaque compte a son rôle et ses permissions.
        </p>
      </div>
      <div className="max-w-3xl">
        <UsersManager currentUserId={user?.id} />
      </div>
    </div>
  )
}
