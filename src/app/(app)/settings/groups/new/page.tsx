import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { GroupForm } from '@/components/groups/GroupForm'
import type { Site, Level, AcademicYear } from '@/types'

interface PageProps {
  searchParams: Promise<{ siteId?: string }>
}

export default async function NewGroupPage({ searchParams }: PageProps) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const admin = createAdminSupabaseClient()

  const { siteId } = await searchParams

  const [sitesRes, levelsRes, yearsRes] = await Promise.all([
    admin.from('sites').select('*').eq('is_active', true).order('name'),
    admin.from('levels').select('*').order('sort_order'),
    admin.from('academic_years').select('*').order('start_date', { ascending: false }),
  ])

  const sites = (sitesRes.data ?? []) as Site[]
  const levels = (levelsRes.data ?? []) as Level[]
  const academicYears = (yearsRes.data ?? []) as AcademicYear[]

  if (sites.length === 0) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title="Paramètres" subtitle="Nouveau groupe" />
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
          <div className="text-4xl mb-4">🏫</div>
          <h3 className="text-lg font-semibold mb-2">Aucun site configuré</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Vous devez d&apos;abord créer un site avant d&apos;ajouter des groupes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Paramètres" subtitle="Nouveau groupe" />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/settings/groups" className="hover:text-foreground transition">
            Groupes
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Nouveau groupe</span>
        </nav>

        <div className="max-w-xl">
          <h1 className="text-xl font-semibold text-foreground mb-1">Créer un groupe</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Un groupe correspond à une classe sur un site pour une année scolaire.
          </p>

          <GroupForm
            mode="create"
            sites={sites}
            levels={levels}
            academicYears={academicYears}
            defaultValues={siteId ? { site_id: siteId } : undefined}
          />
        </div>
      </div>
    </div>
  )
}
