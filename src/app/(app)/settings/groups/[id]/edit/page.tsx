import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { GroupForm } from '@/components/groups/GroupForm'
import type { Group, Site, Level, AcademicYear } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditGroupPage({ params }: PageProps) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const admin = createAdminSupabaseClient()

  const { id } = await params

  const [groupRes, sitesRes, levelsRes, yearsRes] = await Promise.all([
    admin
      .from('groups')
      .select('*, site:sites(*), level:levels(*), academic_year:academic_years(*)')
      .eq('id', id)
      .single(),
    admin.from('sites').select('*').eq('is_active', true).order('name'),
    admin.from('levels').select('*').order('sort_order'),
    admin.from('academic_years').select('*').order('start_date', { ascending: false }),
  ])

  if (groupRes.error || !groupRes.data) notFound()

  const group = groupRes.data as Group
  const sites = (sitesRes.data ?? []) as Site[]
  const levels = (levelsRes.data ?? []) as Level[]
  const academicYears = (yearsRes.data ?? []) as AcademicYear[]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Paramètres" subtitle="Modifier un groupe" />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/settings/groups" className="hover:text-foreground transition">
            Groupes
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">{group.name}</span>
        </nav>

        <div className="max-w-xl">
          <h1 className="text-xl font-semibold text-foreground mb-1">
            Modifier {group.name}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Modifiez les informations de ce groupe.
          </p>

          <GroupForm
            mode="edit"
            groupId={id}
            sites={sites}
            levels={levels}
            academicYears={academicYears}
            defaultValues={{
              name: group.name,
              site_id: group.site_id,
              level_id: group.level_id,
              academic_year_id: group.academic_year_id,
              day_of_week: group.day_of_week,
              time_slot: group.time_slot ?? '',
              max_students: group.max_students,
            }}
          />
        </div>
      </div>
    </div>
  )
}
