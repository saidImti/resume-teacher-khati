import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Site } from '@/types'

export default async function SitesSettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: sites } = await supabase
    .from('sites')
    .select('*')
    .order('name')

  const activeSites = (sites ?? []) as Site[]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Sites d&apos;enseignement</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeSites.length} site{activeSites.length !== 1 ? 's' : ''} configuré{activeSites.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="space-y-3 max-w-2xl">
        {activeSites.map((site) => (
          <SiteCard key={site.id} site={site} />
        ))}

        {activeSites.length === 0 && (
          <p className="text-sm text-muted-foreground italic text-center py-8">
            Aucun site configuré.
          </p>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 max-w-2xl">
        <p className="text-sm text-amber-800">
          <strong>Note :</strong> Les sites sont configurés dans Supabase.
          Pour ajouter un nouveau site, utilisez l&apos;éditeur SQL Supabase ou les migrations.
        </p>
      </div>
    </div>
  )
}

function SiteCard({ site }: { site: Site }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-border bg-card hover:bg-accent/30 transition">
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-sm"
        style={{ backgroundColor: site.color || '#6366f1' }}
      >
        {site.name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{site.name}</p>
        {site.address && (
          <p className="text-xs text-muted-foreground truncate">{site.address}</p>
        )}
      </div>
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
        site.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'
      }`}>
        {site.is_active ? 'Actif' : 'Inactif'}
      </span>
    </div>
  )
}
