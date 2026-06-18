'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Archive, CalendarDays, CheckCircle2, ChevronLeft, Loader2, MessageCircle, Save, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ResumeEditor } from '@/components/resume/ResumeEditor'
import { WhatsAppSendPanel } from '@/components/whatsapp/WhatsAppSendPanel'

export interface GeneratedResume {
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
      site: { id: string; name: string; color: string | null } | null
      level: { id: string; name: string; slug: string; emoji: string; sort_order: number | null } | null
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

interface Props {
  resumes: GeneratedResume[]
}

export function GeneratedResumesBoard({ resumes }: Props) {
  const router = useRouter()
  const [activeId, setActiveId] = useState(resumes[0]?.id ?? '')
  const [htmlById, setHtmlById] = useState<Record<string, string>>(() =>
    Object.fromEntries(resumes.map(resume => [resume.id, resume.body_html || sectionsToHtml(resume)]))
  )
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savingAll, setSavingAll] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  const active = resumes.find(resume => resume.id === activeId) ?? resumes[0]
  const grouped = useMemo(() => {
    const map = new Map<string, GeneratedResume[]>()
    for (const resume of resumes) {
      const key = resume.session?.session_date ?? 'Sans date'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(resume)
    }
    return [...map.entries()]
  }, [resumes])

  async function saveResume(resume: GeneratedResume, silent = false) {
    setSavingId(resume.id)
    try {
      const response = await fetch(`/api/resumes/${resume.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html_content: htmlById[resume.id], status: 'reviewed' }),
      })
      if (!response.ok) throw new Error('Sauvegarde impossible')
      setSavedIds(prev => new Set(prev).add(resume.id))
      if (!silent) toast.success('Résumé sauvegardé et rangé dans les archives')
      return true
    } catch (error) {
      if (!silent) toast.error(error instanceof Error ? error.message : 'Erreur de sauvegarde')
      return false
    } finally {
      setSavingId(null)
    }
  }

  async function saveAllResumes() {
    setSavingAll(true)
    try {
      const results = await Promise.all(resumes.map(resume => saveResume(resume, true)))
      const saved = results.filter(Boolean).length
      if (saved !== resumes.length) {
        toast.error(`${saved}/${resumes.length} résumés sauvegardés. Réessaie pour les autres.`)
        return
      }
      setSavedIds(new Set(resumes.map(resume => resume.id)))
      toast.success(`${saved} résumés sauvegardés et classés dans les archives`)
    } finally {
      setSavingAll(false)
    }
  }

  if (!active) {
    return (
      <div className="flex-1 p-6">
        <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">
          Aucun résumé à afficher.
        </div>
      </div>
    )
  }

  const group = active.session?.group
  const level = group?.level
  const date = active.session?.session_date

  return (
    <div className="flex-1 overflow-y-auto bg-background p-4 sm:p-6">
      <div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-background/95 p-2 shadow-sm backdrop-blur">
        <Button type="button" variant="outline" onClick={() => router.back()} className="gap-2 rounded-xl">
          <ChevronLeft className="h-4 w-4" />
          Retour aux niveaux
        </Button>
        <Link href="/mes-padlets">
          <Button type="button" variant="ghost" className="rounded-xl">
            Mes Padlets
          </Button>
        </Link>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
          Tes modifications restent disponibles tant que tu ne quittes pas la série.
        </span>
      </div>

      <div className="mb-5 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-violet-500/10 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary">
              <Sparkles className="h-4 w-4" />
              Série Padlet premium
            </p>
            <h1 className="mt-2 text-2xl font-bold text-foreground">Chaque niveau a son résumé séparé</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Les résumés sont sauvegardés en brouillon, classés par date, niveau, groupe et site.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={saveAllResumes}
              disabled={savingAll}
              className="gap-2 rounded-xl"
            >
              {savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Sauvegarder toute la série
            </Button>
            <Link
              href="/archives"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-accent"
            >
              <Archive className="h-4 w-4" />
              Voir toutes les archives
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[280px_1fr_380px]">
        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          {grouped.map(([dateKey, dateResumes]) => (
            <section key={dateKey} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="border-b border-border bg-muted/30 px-4 py-3">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(dateKey)}
                </p>
              </div>
              <div className="space-y-2 p-2">
                {dateResumes.map(resume => {
                  const resumeLevel = resume.session?.group?.level
                  const activeCard = resume.id === active.id
                  const isSaved = savedIds.has(resume.id) || resume.status === 'reviewed' || resume.status === 'approved' || resume.status === 'sent'
                  return (
                    <button
                      key={resume.id}
                      type="button"
                      onClick={() => setActiveId(resume.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        activeCard
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-transparent hover:border-border hover:bg-background'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {resumeLevel?.emoji} {resumeLevel?.name ?? 'Niveau'}
                        </span>
                        {isSaved && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{resume.session?.group?.name ?? 'Groupe'}</p>
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{resume.title}</p>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </aside>

        <main className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  {level?.emoji} {level?.name ?? 'Niveau'}
                </p>
                <h2 className="mt-1 text-xl font-bold text-foreground">{active.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {group?.name ?? 'Groupe'} · {group?.site?.name ?? 'Site'} · {formatDate(date)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => saveResume(active)} disabled={savingId === active.id}>
                  {savingId === active.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savedIds.has(active.id) ? 'Sauvegardé' : 'Sauvegarder'}
                </Button>
                <Link href={`/archives/${active.id}`}>
                  <Button variant="secondary">
                    <Archive className="h-4 w-4" />
                    Archive
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <ResumeEditor
              key={active.id}
              initialContent={htmlById[active.id] ?? ''}
              onChange={(html) => {
                setHtmlById(prev => ({ ...prev, [active.id]: html }))
                setSavedIds(prev => {
                  const next = new Set(prev)
                  next.delete(active.id)
                  return next
                })
              }}
              className="min-h-[420px]"
            />
          </section>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">WhatsApp</p>
                <h3 className="text-base font-bold">Aperçu et envoi</h3>
              </div>
              <MessageCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <WhatsAppSendPanel
              resumeId={active.id}
              groupId={group?.id ?? ''}
              groupName={group?.name ?? 'Groupe'}
              whatsappText={htmlToText(htmlById[active.id] ?? active.whatsapp_text ?? '')}
              levelName={level?.name ?? 'Niveau'}
              sessionDate={date}
            />
          </section>

          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-200">
              <Send className="h-4 w-4" />
              Organisation conseillée
            </p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              Vérifie chaque onglet niveau, sauvegarde, puis envoie uniquement au groupe correspondant.
              Chaque résumé reste différencié par date, site, groupe et niveau.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}

function sectionsToHtml(resume: GeneratedResume) {
  if (!resume.sections?.length) return '<p>Aucun contenu.</p>'
  return resume.sections
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(section => `<p><strong>${escapeHtml(section.title ?? section.type)}</strong><br>${escapeHtml(section.content_text ?? '')}</p>`)
    .join('')
}

function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function formatDate(value?: string) {
  if (!value || value === 'Sans date') return 'Sans date'
  return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
