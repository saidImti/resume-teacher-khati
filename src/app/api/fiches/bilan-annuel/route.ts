import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Fetch Padlet board ───────────────────────────────────────────────────────

async function fetchPadletBoard(boardId: string, apiToken: string): Promise<{ title: string; text: string }> {
  try {
    const res = await fetch(
      `https://api.padlet.dev/v1/boards/${boardId}?include=posts,sections`,
      { headers: { 'X-Api-Key': apiToken, Accept: 'application/vnd.api+json' }, signal: AbortSignal.timeout(15_000) }
    )
    if (!res.ok) return { title: boardId, text: '' }
    const json = await res.json() as {
      data?: { attributes?: { title?: string } }
      included?: Array<{ type: string; attributes?: Record<string, unknown> }>
    }
    const title = String(json.data?.attributes?.title ?? 'Padlet')
    const posts = (json.included ?? [])
      .filter((r) => r.type === 'post')
      .map((r) => {
        const a = r.attributes ?? {}
        return [a.subject, a.body, a.caption].filter(Boolean).join(' — ')
      })
      .filter(Boolean)
    return { title, text: posts.join('\n') }
  } catch { return { title: boardId, text: '' } }
}

// ─── POST /api/fiches/bilan-annuel ────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    levelId?:          string
    levelSlug?:        string
    levelName?:        string
    academicYearName?: string
    padletBoardIds?:   string[]
    content?:          string
  }

  const levelSlug        = body.levelSlug ?? 'kids'
  const levelName        = body.levelName ?? 'Kids'
  const academicYearName = body.academicYearName ?? new Date().getFullYear().toString()
  const boardIds         = body.padletBoardIds ?? []

  // ── 1. Contenu depuis les Padlets ────────────────────────────────────────────
  const padletSections: string[] = []
  if (boardIds.length > 0 && process.env.PADLET_API_TOKEN) {
    for (const boardId of boardIds.slice(0, 20)) {
      const { title, text } = await fetchPadletBoard(boardId, process.env.PADLET_API_TOKEN)
      if (text) padletSections.push(`### Padlet: ${title}\n${text}`)
    }
  }

  // ── 2. Contenu depuis Supabase (résumés approuvés) ───────────────────────────
  const supabaseSections: string[] = []
  let sessionCount = 0

  try {
    const { data: resumes } = await supabase
      .from('resumes')
      .select(`title, intro, body_text, session:sessions(session_date, title, theme, group:groups(name, level:levels(slug)))`)
      .in('status', ['approved', 'sent'])
      .eq('is_current', true)
      .order('created_at', { ascending: true })
      .limit(50)

    if (resumes) {
      const filtered = resumes.filter((r) => {
        const s = r.session as unknown as Record<string, unknown> | null
        const g = s?.group as unknown as Record<string, unknown> | null
        const l = g?.level as unknown as Record<string, unknown> | null
        return l?.slug === levelSlug
      })
      sessionCount = filtered.length
      filtered.slice(0, 40).forEach((r) => {
        const s     = r.session as unknown as Record<string, unknown> | null
        const date  = s?.session_date as string ?? ''
        const theme = s?.theme as string ?? r.title
        supabaseSections.push(
          `Séance (${date ? new Date(date).toLocaleDateString('fr-FR') : 'date inconnue'}) — ${theme}\n` +
          `${(r.body_text ?? r.intro ?? '').slice(0, 400)}`
        )
      })
    }
  } catch (err) { console.error('Supabase query error:', err) }

  // ── 3. Assemble le contexte ─────────────────────────────────────────────────
  const allContent: string[] = [
    ...padletSections,
    ...supabaseSections,
    ...(body.content ? [`### Notes additionnelles\n${body.content}`] : []),
  ]

  const contentBlock = allContent.length > 0
    ? `Contenu de l'année (${allContent.length} sources) :\n\n${allContent.join('\n\n---\n\n').slice(0, 10000)}`
    : `Aucun contenu fourni. Génère un bilan annuel type complet pour le niveau ${levelName}.`

  // ── 4. Génération GPT-4o ────────────────────────────────────────────────────
  const prompt = `Tu es Teacher Khati, enseignante d'anglais experte pour enfants en France.
Niveau : ${levelName} — Année scolaire : ${academicYearName}
Séances trouvées : ${sessionCount} | Padlets : ${boardIds.length}

${contentBlock}

Génère un BILAN ANNUEL PREMIUM. Réponds UNIQUEMENT avec du JSON valide, sans markdown ni commentaire.

Schéma JSON attendu :
{
  "level": "${levelName}",
  "academicYear": "${academicYearName}",
  "sessionCount": ${sessionCount},
  "headline": "titre inspirant en français",
  "yearSummary": "synthèse de l'année en 3-4 phrases, chaleureux",
  "stats": {
    "totalWords": <number>,
    "totalGrammarRules": <number>,
    "totalExpressions": <number>,
    "totalThemes": <number>
  },
  "progressionBySkill": {
    "speaking":   { "level": <1-5>, "highlights": ["str","str"], "improvement": "str" },
    "listening":  { "level": <1-5>, "highlights": ["str","str"], "improvement": "str" },
    "reading":    { "level": <1-5>, "highlights": ["str","str"], "improvement": "str" },
    "writing":    { "level": <1-5>, "highlights": ["str","str"], "improvement": "str" },
    "vocabulary": { "level": <1-5>, "highlights": ["str","str"], "improvement": "str" },
    "phonics":    { "level": <1-5>, "highlights": ["str","str"], "improvement": "str" }
  },
  "themes": [
    {
      "name": "str", "emoji": "str", "sessionsCount": <number>,
      "keyLearnings": ["str","str","str"],
      "vocabulary": [{ "en": "str", "fr": "str", "emoji": "str" }],
      "expressions": [{ "en": "str", "fr": "str" }],
      "funFact": "str"
    }
  ],
  "masterVocabulary": [
    { "category": "str", "words": [{ "en": "str", "fr": "str", "emoji": "str" }] }
  ],
  "grammarAcquired": [
    { "rule": "str", "formula": "str", "examples": ["str","str"], "mastery": "introduced|practiced|mastered" }
  ],
  "verbsLearned": [
    { "infinitive": "str", "french": "str" }
  ],
  "expressionsLearned": [
    { "en": "str", "fr": "str" }
  ],
  "culturalDiscoveries": ["str","str","str"],
  "achievements": [
    { "icon": "emoji", "title": "str", "description": "str" }
  ],
  "nextYearPreview": "str",
  "teacherNote": "str — message personnel 3-4 phrases",
  "parentCertificate": {
    "title": "Certificat de Fin d'Année",
    "body": "str — accomplissements de l'élève",
    "signature": "Teacher Khati"
  }
}

RÈGLES :
- themes : 4-6 thèmes, chacun avec 5-10 mots de vocabulaire
- masterVocabulary : 5-8 catégories, 50-80 mots au total
- grammarAcquired : 4-8 règles
- achievements : 4-5 trophées valorisants
- Tout en français sauf les mots/expressions anglais`

  let raw = ''
  try {
    const response = await openai.chat.completions.create({
      model:       process.env.OPENAI_MODEL ?? 'gpt-4o',
      temperature: 0.4,
      max_tokens:  10000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role:    'system',
          content: 'Expert pédagogie enfants anglais. Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans commentaire.',
        },
        { role: 'user', content: prompt },
      ],
    })

    raw             = response.choices[0]?.message?.content ?? '{}'
    const cleaned   = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
    const bilan     = JSON.parse(cleaned) as Record<string, unknown>
    return NextResponse.json({ success: true, bilan, sessionCount })

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('Bilan annuel error:', errMsg)
    console.error('Raw response (first 500 chars):', raw.slice(0, 500))
    return NextResponse.json(
      { error: `Erreur lors de la generation : ${errMsg.slice(0, 200)}` },
      { status: 500 }
    )
  }
}
