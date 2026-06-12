import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ActivityForm } from '@/components/activites/ActivityForm'
import type { Activity, Level, Skill } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditActivitePage({ params }: PageProps) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { id } = await params

  const [activityRes, levelsRes] = await Promise.all([
    supabase.from('activities').select('*').eq('id', id).single(),
    supabase.from('levels').select('*').order('sort_order'),
  ])

  if (activityRes.error || !activityRes.data) notFound()

  const activity = activityRes.data as Activity
  const levels = (levelsRes.data ?? []) as Level[]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Activités" subtitle={activity.name} />

      <div className="flex-1 overflow-y-auto p-6">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/activites" className="hover:text-foreground transition">Activités</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{activity.name}</span>
        </nav>

        <div className="max-w-xl">
          <h1 className="text-xl font-semibold text-foreground mb-1">Modifier l&apos;activité</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {activity.emoji} {activity.name}
          </p>
          <ActivityForm
            mode="edit"
            activityId={id}
            levels={levels}
            defaultValues={{
              name: activity.name,
              description: activity.description ?? '',
              level_ids: activity.level_ids,
              skills: activity.skills as Skill[],
              tags: activity.tags?.join(', ') ?? '',
              duration_min: activity.duration_min,
              emoji: activity.emoji ?? '🎯',
            }}
          />
        </div>
      </div>
    </div>
  )
}
