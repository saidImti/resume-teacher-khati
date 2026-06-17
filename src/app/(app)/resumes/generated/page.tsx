import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { GeneratedResumesBoard, type GeneratedResume } from '@/components/resume/GeneratedResumesBoard'

interface PageProps {
  searchParams: Promise<{ ids?: string }>
}

export default async function GeneratedResumesPage({ searchParams }: PageProps) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const params = await searchParams
  const ids = (params.ids ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)

  if (ids.length === 0) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Résumés générés" subtitle="Aucun résumé sélectionné" />
        <div className="flex-1 p-6">
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            Génère une série depuis Mes Padlets pour voir les résumés ici.
          </div>
        </div>
      </div>
    )
  }

  const { data } = await supabase
    .from('resumes')
    .select(`
      id, title, status, body_html, whatsapp_text, created_at, updated_at,
      session:sessions(
        id, session_date,
        group:groups(
          id, name,
          site:sites(id, name, color),
          level:levels(id, name, slug, emoji, sort_order)
        )
      ),
      sections:resume_sections(id, title, content_text, type, sort_order)
    `)
    .in('id', ids)

  const resumes = ((data ?? []) as unknown as GeneratedResume[])
    .sort((a, b) => {
      const dateA = a.session?.session_date ?? ''
      const dateB = b.session?.session_date ?? ''
      if (dateA !== dateB) return dateB.localeCompare(dateA)
      return (a.session?.group?.level?.sort_order ?? 99) - (b.session?.group?.level?.sort_order ?? 99)
    })

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header
        title="Résumés générés"
        subtitle={`${resumes.length} résumé${resumes.length > 1 ? 's' : ''} rangé${resumes.length > 1 ? 's' : ''} par date et niveau`}
      />
      <GeneratedResumesBoard resumes={resumes} />
    </div>
  )
}
