import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateResume, resumeToHtml } from '@/lib/ai/generator'
import type { LevelSlug, LessonContentType } from '@/types'

// ─── Schéma de validation ────────────────────────────────────────────────────

const LessonItemSchema = z.object({
  id:       z.string(),
  type:     z.enum(['activity', 'song', 'video', 'game', 'roleplay']),
  name:     z.string(),
  link:     z.string().optional(),
  selected: z.boolean(),
  levels:   z.array(z.string()).optional(),
})

const StructuredContentSchema = z.object({
  theme: z.string(),
  items: z.array(LessonItemSchema),
})

const GenerateSchema = z
  .object({
    groupId:          z.string().uuid('groupId invalide'),
    sessionDate:      z.string().min(1, 'Date requise'),
    rawContent:       z.string().min(10).optional(),
    structuredContent: StructuredContentSchema.optional(),
    academicYearId:   z.string().uuid('academicYearId invalide').optional(),
  })
  .refine(
    (d) => d.rawContent || d.structuredContent,
    { message: 'Fournir rawContent ou structuredContent' }
  )

// ─── Conversion StructuredLesson → texte brut ─────────────────────────────────

const SECTION_LABELS: Record<LessonContentType, { emoji: string; label: string }> = {
  activity: { emoji: '📝', label: 'Activités' },
  song:     { emoji: '🎶', label: 'Chansons' },
  video:    { emoji: '🎥', label: 'Vidéos' },
  game:     { emoji: '🎮', label: 'Jeux' },
  roleplay: { emoji: '🎭', label: 'Role Play' },
}

function structuredToRawText(structured: z.infer<typeof StructuredContentSchema>): string {
  const lines: string[] = []
  if (structured.theme) lines.push(`Thème : ${structured.theme}`)

  const selected = structured.items.filter((i) => i.selected)

  const byType: Partial<Record<LessonContentType, Array<{ name: string; link?: string }>>> = {}
  for (const item of selected) {
    const t = item.type as LessonContentType
    if (!byType[t]) byType[t] = []
    byType[t]!.push({ name: item.name, link: item.link })
  }

  // Seuls les types vidéo et chanson (audio) ont leurs liens partagés
  const TYPES_WITH_LINKS: LessonContentType[] = ['video', 'song']

  const ORDER: LessonContentType[] = ['activity', 'song', 'video', 'game', 'roleplay']
  for (const type of ORDER) {
    const items = byType[type]
    if (!items?.length) continue
    const { emoji, label } = SECTION_LABELS[type]
    lines.push(`\n${emoji} ${label} :`)
    for (const item of items) {
      lines.push(`👉 ${item.name}`)
      if (item.link && TYPES_WITH_LINKS.includes(type)) {
        lines.push(`🔗 Lien :`)
        lines.push(item.link)
      }
    }
  }

  return lines.join('\n').trim()
}

// ─── POST /api/resumes/generate ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = GenerateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { groupId, sessionDate, rawContent, structuredContent, academicYearId } =
      parsed.data

    // Convertir le contenu structuré en texte brut si nécessaire
    const contentText = structuredContent
      ? structuredToRawText(structuredContent)
      : (rawContent ?? '')

    if (contentText.length < 10) {
      return NextResponse.json(
        { error: 'Contenu trop court (minimum 10 caractères)' },
        { status: 400 }
      )
    }

    // Récupérer le groupe + son niveau
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select(`
        id, name, site_id,
        level:levels!level_id ( id, name, slug, color, emoji )
      `)
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Groupe introuvable' }, { status: 404 })
    }

    const level = Array.isArray(group.level) ? group.level[0] : group.level
    if (!level) {
      return NextResponse.json(
        { error: 'Niveau introuvable pour ce groupe' },
        { status: 400 }
      )
    }

    // Récupérer l'année scolaire active
    let finalAcademicYearId = academicYearId
    if (!finalAcademicYearId) {
      const { data: year } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_active', true)
        .single()
      finalAcademicYearId = year?.id
    }

    if (!finalAcademicYearId) {
      return NextResponse.json(
        { error: 'Aucune année scolaire active' },
        { status: 400 }
      )
    }

    // Créer la session en DB
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        group_id:         groupId,
        academic_year_id: finalAcademicYearId,
        session_date:     sessionDate,
        status:           'draft',
      })
      .select('id')
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Erreur création session', details: sessionError?.message },
        { status: 500 }
      )
    }

    // Sauvegarder le contenu
    const { error: contentError } = await supabase.from('contents').insert({
      session_id: session.id,
      type:       'text',
      raw_text:   contentText,
      status:     'processed',
    })

    if (contentError) {
      console.error('Erreur sauvegarde contenu:', contentError)
    }

    // Générer le résumé avec GPT-4o
    const result = await generateResume({
      groupName:  group.name,
      levelSlug:  level.slug as LevelSlug,
      levelName:  level.name,
      sessionDate,
      rawContent: contentText,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: `Erreur génération IA : ${result.error}` },
        { status: 500 }
      )
    }

    const generatedData = result.data
    const htmlContent   = resumeToHtml(generatedData, sessionDate)

    // Sauvegarder le résumé
    const { data: resume, error: resumeError } = await supabase
      .from('resumes')
      .insert({
        session_id:       session.id,
        group_id:         groupId,
        academic_year_id: finalAcademicYearId,
        level_id:         level.id,
        site_id:          group.site_id,
        title:            generatedData.title,
        status:           'draft',
        whatsapp_text:    generatedData.whatsapp_text,
        tokens_used:      result.tokensUsed,
      })
      .select('id')
      .single()

    if (resumeError || !resume) {
      return NextResponse.json(
        { error: 'Erreur sauvegarde résumé', details: resumeError?.message },
        { status: 500 }
      )
    }

    // Types valides selon le CHECK constraint de resume_sections
    const VALID_SECTION_TYPES = [
      'intro', 'activity', 'vocabulary', 'grammar',
      'song', 'story', 'game', 'outro', 'custom', 'phonics', 'free',
    ] as const
    type ValidSectionType = (typeof VALID_SECTION_TYPES)[number]

    function toValidType(raw: string): ValidSectionType {
      if ((VALID_SECTION_TYPES as readonly string[]).includes(raw)) {
        return raw as ValidSectionType
      }
      const map: Record<string, ValidSectionType> = {
        activities: 'activity',
        homework:   'custom',
        note:       'custom',
        theme:      'intro',
        objectives: 'intro',
        skills:     'custom',
        resources:  'custom',
        culture:    'custom',
        roleplay:   'custom',
        video:      'custom',
      }
      return map[raw] ?? 'custom'
    }

    const sectionsToInsert = generatedData.sections.map((section, index) => ({
      resume_id:    resume.id,
      type:         toValidType(section.type),
      title:        `${section.emoji} ${section.type}`,
      content_text: section.content,
      sort_order:   index,
    }))

    await supabase.from('resume_sections').insert(sectionsToInsert)

    return NextResponse.json({
      success:      true,
      resumeId:     resume.id,
      sessionId:    session.id,
      title:        generatedData.title,
      htmlContent,
      whatsappText: generatedData.whatsapp_text,
      tokensUsed:   result.tokensUsed,
    })
  } catch (error) {
    console.error('Erreur /api/resumes/generate:', error)
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 })
  }
}
