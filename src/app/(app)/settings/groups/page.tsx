import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileText, Pencil, Plus } from 'lucide-react'
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Organisation ecole</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">Gestion des groupes</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {totalGroups} groupe{totalGroups !== 1 ? 's' : ''} actif{totalGroups !== 1 ? 's' : ''}. Cree, modifie et archive les groupes par site.
          </p>
        </div>
        <Link
          href="/settings/groups/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nouveau groupe
        </Link>
      </div>

      {groupsBySite.length === 0 ? (
        <EmptyState
          illustration="groups"
          title="Aucun groupe pour l'instant"
          description="Cree ton premier groupe pour organiser les cours et generer les resumes pour les parents."
          action={{ label: 'Creer un groupe', href: '/settings/groups/new' }}
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

function SiteSection({ site, groups }: { site: Site; groups: GroupWithRelations[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card/50 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: site.color ?? '#6366f1' }} />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">{site.name}</h2>
          <span className="text-xs text-muted-foreground">
            {groups.length} groupe{groups.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Link
          href={`/settings/groups/new?siteId=${site.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter ici
        </Link>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          illustration="groups"
          size="sm"
          title={`Aucun groupe a ${site.name}`}
          description="Ce site n'a pas encore de groupe."
          action={{ label: 'Creer un groupe', href: `/settings/groups/new?siteId=${site.id}` }}
        />
      ) : (
        <div className="grid gap-3">
          {groups.map((group) => (
            <GroupRow key={group.id} group={group} />
          ))}
        </div>
      )}
    </section>
  )
}

function GroupRow({ group }: { group: GroupWithRelations }) {
  const dayLabel = group.day_of_week !== null
    ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][group.day_of_week] ?? ''
    : null

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 text-lg" aria-hidden="true">{group.level?.emoji ?? 'G'}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{group.name}</p>
          <p className="text-xs text-muted-foreground">
            {group.level?.name}
            {dayLabel && (
              <span className="ml-1.5 text-muted-foreground/70">
                - {dayLabel}{group.time_slot ? ` ${group.time_slot}` : ''}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href={`/resumes/new?groupId=${group.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
          title="Nouveau resume"
          aria-label={`Nouveau resume pour ${group.name}`}
        >
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          Resume
        </Link>
        <Link
          href={`/settings/groups/${group.id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent"
          title="Modifier ce groupe"
          aria-label={`Modifier ${group.name}`}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Modifier
        </Link>
        <ArchiveGroupButton groupId={group.id} groupName={group.name} />
      </div>
    </div>
  )
}
