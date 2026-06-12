import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ActivityForm } from '@/components/activites/ActivityForm'
import type { Level } from '@/types'

export default async function NewActivitePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: levels } = await supabase.from('levels').select('*').order('sort_order')

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Activités" subtitle="Nouvelle activité" />

      <div className="flex-1 overflow-y-auto p-6">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/activites" className="hover:text-foreground transition">Activités</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Nouvelle activité</span>
        </nav>

        <div className="max-w-xl">
          <h1 className="text-xl font-semibold text-foreground mb-1">Créer une activité</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Ajoutez une activité à votre bibliothèque pour l&apos;inclure dans vos résumés.
          </p>
          <ActivityForm mode="create" levels={(levels ?? []) as Level[]} />
        </div>
      </div>
    </div>
  )
}
