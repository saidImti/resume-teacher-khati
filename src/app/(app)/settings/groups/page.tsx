import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { ArchiveGroupButton } from '@/components/groups/ArchiveGroupButton'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Group, Site, Level } from '@/types'

interface GroupWithRelations extends Group {
  site: Site
  level: Level
}

interface GroupsBySite {
  site: Site
  groups: GroupWithRelations[]
}

export default async function GroupsSettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const admin = createAdminSupabaseClient()

  const { data: groups } = await admin
    .from('groups')
    .select('*, site:sites(*), level:levels(*)')
    .eq('is_active', true)
    .order('name')

  const { data: sites } = await admin
    .from('sites')
    .select('*')
    .eq('is_active', true)
    .order('name')

  const groupsBySite: GroupsBySite[] = (sites ?? []).map((site) => ({
    site,
    groups: ((groups as GroupWithRelations[]) ?? []).filter((g) => g.site_id === site.id),
  }))

  const totalGroups = (groups ?? []).length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Gestion des groupes</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalGroups} groupe{totalGroups !== 1 ? 's' : ''} actif{totalGroups !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/settings/groups/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground
            text-sm font-medium hover:bg-primary/90 transition-colors active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nouveau groupe
        </Link>
      </div>

      {groupsBySite.length === 0 ? (
        <EmptyState
          illustration="groups"
          title="Aucun groupe pour l'instant"
          description="Créez votre premier groupe pour commencer à organiser vos cours et générer des résumés pour les parents."
          action={{ label: 'Créer un groupe', href: '/settings/groups/new' }}
          secondaryAction={{ label: 'Configurer les sites', href: '/settings/sites', variant: 'secondary' }}
        />
      ) : (
        <div className="space-y-8">
          {groupsBySite.map(({ site, groups: siteGroups }) => (
            <SiteSection key={site.id} site={site} groups={siteGroups} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Site Section ─────────────────────────────────────────────────────────────

function SiteSection({ site, groups }: { site: Site; groups: GroupWithRelations[] }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: site.color ?? '#6366f1' }} />
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">{site.name}</h2>
        <span className="text-xs text-muted-foreground">
          ({groups.length} groupe{groups.length !== 1 ? 's' : ''})
        </span>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          illustration="groups"
          size="sm"
          title={`Aucun groupe à ${site.name}`}
          description="Ce site n'a pas encore de groupe."
          action={{ label: 'Créer un groupe', href: `/settings/groups/new?siteId=${site.id}` }}
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <GroupRow key={group.id} group={group} />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Group Row ────────────────────────────────────────────────────────────────

function GroupRow({ group }: { group: GroupWithRelations }) {
  const dayLabel = group.day_of_week !== null
    ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][group.day_of_week] ?? ''
    : null

  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-border
      bg-card hover:bg-accent/40 transition-colors group/row">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-lg shrink-0" aria-hidden="true">{group.level?.emoji ?? '📚'}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{group.name}</p>
          <p className="text-xs text-muted-foreground">
            {group.level?.name}
            {dayLabel && (
              <span className="ml-1.5 text-muted-foreground/70">
                · {dayLabel}{group.time_slot ? ` ${group.time_slot}` : ''}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 ml-2 shrink-0">
        <Link
          href={`/resumes/new?groupId=${group.id}`}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title="Nouveau résumé"
          aria-label={`Nouveau résumé pour ${group.name}`}
        >
          <span aria-hidden="true">✨</span>
        </Link>
        <Link
          href={`/settings/groups/${group.id}/edit`}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Modifier ce groupe"
          aria-label={`Modifier ${group.name}`}
        >
          <span aria-hidden="true">✏️</span>
        </Link>
        <ArchiveGroupButton groupId={group.id} groupName={group.name} />
      </div>
    </div>
  )
}
