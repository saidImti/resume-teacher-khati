import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ResumeDetailClient } from '@/components/archives/ResumeDetailClient'
import { SortableSectionList } from '@/components/resume/SortableSectionList'
import type { ResumeSection } from '@/components/resume/SortableSectionList'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResumeDetail {
  id: string
  title: string
  status: string
  body_html: string | null
  whatsapp_text: string | null
  created_at: string
  updated_at: string
  session: {
    id: string
    session_date: string
    group: {
      id: string
      name: string
      site: { id: string; name: string; color: string }
      level: { id: string; name: string; slug: string; emoji: string }
    } | null
  } | null
  sections: Array<{
    id: string
    title: string | null
    content_text: string | null
    type: string
    sort_order: number
  }>
}

// ─── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ResumeDetailPage({ params }: PageProps) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { id } = await params

  const { data: resume, error } = await supabase
    .from('resumes')
    .select(`
      id, title, status, body_html, whatsapp_text, created_at, updated_at,
      session:sessions(
        id, session_date,
        group:groups(
          id, name,
          site:sites(id, name, color),
          level:levels(id, name, slug, emoji)
        )
      ),
      sections:resume_sections(
        id, title, content_text, type, sort_order
      )
    `)
    .eq('id', id)
    .single()

  if (error || !resume) notFound()

  const r = resume as unknown as ResumeDetail
  const group = r.session?.group
  const date = r.session?.session_date
    ? new Date(r.session.session_date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—'

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Archives"
        subtitle={r.title}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/archives" className="hover:text-foreground transition">
            Archives
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-xs">{r.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Résumé HTML */}
            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Résumé du cours
              </h2>
              {r.body_html ? (
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: r.body_html }}
                />
              ) : (
                <p className="text-sm text-muted-foreground italic">Aucun contenu.</p>
              )}
            </section>

            {/* Sections drag & drop */}
            {r.sections.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  Sections du résumé
                </h2>
                <SortableSectionList
                  resumeId={r.id}
                  sections={r.sections.map((s) => ({
                    ...s,
                    title: s.title ?? '',
                  })) as ResumeSection[]}
                />
              </section>
            )}

            {/* Actions */}
            <ResumeDetailClient resumeId={r.id} status={r.status} whatsappText={r.whatsapp_text ?? ''} groupName={group?.name} />
          </div>

          {/* Colonne latérale */}
          <div className="space-y-4">
            {/* Infos groupe */}
            <section className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Informations
              </h2>

              <InfoRow label="Groupe" value={group?.name ?? '—'} />
              <InfoRow label="Site" value={group?.site?.name ?? '—'} />
              <InfoRow label="Niveau" value={`${group?.level?.emoji ?? ''} ${group?.level?.name ?? '—'}`} />
              <InfoRow label="Date de séance" value={date} />
              <InfoRow
                label="Statut"
                value={r.status}
                valueClassName={
                  r.status === 'sent' ? 'text-violet-600 font-medium' :
                  r.status === 'approved' ? 'text-emerald-600 font-medium' :
                  r.status === 'reviewed' ? 'text-blue-600 font-medium' :
                  'text-zinc-500'
                }
              />
            </section>

            {/* Liens rapides */}
            <div className="space-y-2">
              <Link
                href={`/resumes/new?groupId=${group?.id ?? ''}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card
                  hover:bg-accent/50 transition text-sm font-medium"
              >
                <span>✨</span>
                Nouveau résumé pour ce groupe
              </Link>
              <Link
                href={`/archives?siteId=${group?.site?.id ?? ''}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card
                  hover:bg-accent/50 transition text-sm font-medium text-muted-foreground"
              >
                <span>←</span>
                Tous les résumés — {group?.site?.name ?? ''}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-xs text-right ${valueClassName ?? 'text-foreground'}`}>{value}</span>
    </div>
  )
}
