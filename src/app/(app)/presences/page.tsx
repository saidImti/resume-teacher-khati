import { redirect } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
import { Header } from '@/components/layout/Header'
import { PresencesTabs } from '@/components/presences/PresencesTabs'
import type { Group, Site } from '@/types'

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface GroupWithRelations extends Omit<Group, 'site' | 'level'> {
  level: { id: string; name: string; emoji: string; color: string }
  site:  { id: string; name: string }
}

// ─── Page serveur ─────────────────────────────────────────────────────────────

export default async function PresencesPage() {
  const ctx = await getOrgContext()
  if (!ctx) redirect('/auth/login')

  const admin = createAdminSupabaseClient()

  // Joins profonds → client admin, scoping org explicite (RLS non fiable ici)
  const [{ data: sites }, { data: groups }] = await Promise.all([
    admin.from('sites').select('id, name, slug, color, is_active').eq('organization_id', ctx.organizationId).eq('is_active', true).order('name'),
    admin.from('groups').select('id, name, is_active, level:levels(id, name, emoji, color), site:sites(id, name)').eq('organization_id', ctx.organizationId).eq('is_active', true).order('name'),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Présences"
        subtitle="Appel du jour groupé · Fiche de présence mensuelle, trimestrielle, annuelle"
      />
      <div className="flex-1 overflow-y-auto p-6">
        <PresencesTabs
          groups={(groups ?? []) as unknown as GroupWithRelations[]}
          sites={(sites ?? []) as unknown as Site[]}
        />
      </div>
    </div>
  )
}
