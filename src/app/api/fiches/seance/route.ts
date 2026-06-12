import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Profils pédagogiques ─────────────────────────────────────────────────────

const LEVEL_PROFILES: Record<string, {
  label: string; age: string; emoji: string
  phonics: boolean; grammarDepth: 'minimal' | 'basic' | 'intermediate' | 'advanced'
  vocabCount: number
}> = {
  preschoolers: { label: 'Preschoolers', age: '3-5 ans',  emoji: '🌟', phonics: true,  grammarDepth: 'minimal',     vocabCount: 6  },
  kids:         { label: 'Kids',         age: '6-8 ans',  emoji: '🚀', phonics: true,  grammarDepth: 'basic',        vocabCount: 10 },
  juniors:      { label: 'Juniors',      age: '9-11 ans', emoji: '📖', phonics: false, grammarDepth: 'basic',        vocabCount: 14 },
  tweens:       { label: 'Tweens',       age: '12-14 ans',emoji: '⚡', phonics: false, grammarDepth: 'intermediate', vocabCount: 18 },
  teenagers:    { label: 'Teenagers',    age: '15-18 ans',emoji: '🎓', phonics: false, grammarDepth: 'advanced',     vocabCount: 22 },
}

const GRAMMAR_DEPTH: Record<string, string> = {
  minimal:      'Grammaire très simple : I am, This is, I have. 2 règles max.',
  basic:        'Grammaire simple : présent simple, pluriels, articles. 3 règles max.',
  intermediate: 'Grammaire intermédiaire : présent/passé/futur, comparatifs. 4 règles.',
  advanced:     'Grammaire avancée : temps composés, conditionnels, phrasal verbs. 5 règles.',
}

// ─── Fetch Padlet board content ───────────────────────────────────────────────

async function fetchPadletContent(boardId: string, apiToken: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.padlet.dev/v1/boards/${boardId}?include=posts,sections`,
      { headers: { 'X-Api-Key': apiToken, Accept: 'application/vnd.api+json' }, signal: AbortSignal.timeout(15_000) }
    )
    if (!res.ok) return ''
    const json = await res.json() as { included?: Array<{ type: string; attributes?: Record<string, unknown> }> }
    const posts = (json.included ?? [])
      .filter((r) => r.type === 'post')
      .map((r) => {
        const a = r.attributes ?? {}
        return [a.subject, a.body, a.caption].filter(Boolean).join(' — ')
      })
      .filter(Boolean)
    return posts.join('\n')
  } catch { return '' }
}

// ─── POST /api/fiches/seance ──────────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    levelSlug?:     string
    theme?:         string
    content?:       string
    sessionId?:     string
    sessionDate?:   string
    groupName?:     string
    academicYear?:  string
    padletBoardId?: string
  }

  const levelSlug    = body.levelSlug ?? 'kids'
  const theme        = body.theme ?? ''
  const sessionDate  = body.sessionDate ?? new Date().toLocaleDateString('fr-FR')
  const groupName    = body.groupName ?? ''
  const academicYear = body.academicYear ?? ''
  const profile      = LEVEL_PROFILES[levelSlug] ?? LEVEL_PROFILES.kids!

  // ── Assemble content from all sources ───────────────────────────────────────
  let sessionContent = body.content ?? ''

  // Padlet board content (si boardId fourni)
  if (body.padletBoardId && process.env.PADLET_API_TOKEN) {
    const padletText = await fetchPadletContent(body.padletBoardId, process.env.PADLET_API_TOKEN)
    if (padletText) {
      sessionContent = padletText + (sessionContent ? '\n\n---\n\n' + sessionContent : '')
    }
  }

  // Fallback: récupère depuis Supabase si sessionId fourni
  if (body.sessionId && !sessionContent) {
    const { data: session } = await supabase
      .from('sessions')
      .select('title, theme, notes, contents(raw_text)')
      .eq('id', body.sessionId)
      .single()
    if (session) {
      sessionContent = [
        session.title, session.theme, session.notes,
        ...(session.contents as Array<{ raw_text?: string }> ?? []).map((c) => c.raw_text ?? ''),
      ].filter(Boolean).join('\n\n')
    }
  }

  const prompt = `Tu es Teacher Khati, enseignante d'anglais experte pour enfants en France.
Niveau : ${profile.label} (${profile.age}) ${profile.emoji}
Thème : ${theme || 'à déduire du contenu'}
Date de la séance : ${sessionDate}${groupName ? `\nGroupe : ${groupName}` : ''}${academicYear ? `\nAnnée scolaire : ${academicYear}` : ''}
${sessionContent ? `\nContenu de la séance (Padlet, fichiers, notes) :\n---\n${sessionContent.slice(0, 4000)}\n---` : ''}

Génère une fiche de révision ULTRA-COMPLÈTE et précise pour enfants et parents.
BASÉE STRICTEMENT sur le contenu fourni si présent. Ne pas inventer de contenu différent.
Réponds UNIQUEMENT avec du JSON valide, sans markdown.

{
  "theme": "string",
  "emoji": "string",
  "level": "${profile.label}",
  "date": "${sessionDate}",
  "whatWeDidToday": "string — résumé 2-3 phrases fidèle au contenu du cours",
  "vocabulary": [
    { "en": "string", "fr": "string", "phonetic": "string IPA", "partOfSpeech": "noun|verb|adjective|adverb|expression", "example": "string phrase complète", "emoji": "string" }
  ],
  "verbs": [
    { "infinitive": "string", "french": "string", "presentSimple": "string", "pastSimple": "string|null", "tip": "string" }
  ],
  "grammar": [
    { "rule": "string", "explanation": "string", "formula": "string structure", "examples": ["string", "string"], "tip": "string" }
  ],
  "spelling": [
    { "word": "string", "trick": "string moyen mnémotechnique" }
  ],
  "expressions": [
    { "en": "string", "fr": "string", "context": "string quand utiliser" }
  ],
  ${profile.phonics ? '"phonics": [{ "sound": "string", "letter": "string", "examples": ["string", "string", "string"] }],' : ''}
  "homeworkSuggestion": "string — activité 5-10 min max, amusante et réalisable à la maison",
  "parentNote": "string — message WhatsApp prêt à envoyer, chaleureux avec emojis, max 3 lignes",
  "funFact": "string — anecdote culturelle anglophone amusante liée au thème, en français"
}

RÈGLES STRICTES :
- Vocabulaire : exactement ${profile.vocabCount} mots, TOUS liés au thème du cours
- ${GRAMMAR_DEPTH[profile.grammarDepth]}
- Phonétique IPA précise et correcte pour chaque mot
- Tout parfaitement adapté au niveau ${profile.label} (${profile.age})`

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o',
      temperature: 0.4,
      max_tokens: 3500,
      messages: [
        { role: 'system', content: 'Expert pédagogie enfants anglais. JSON valide uniquement, sans markdown.' },
        { role: 'user',   content: prompt },
      ],
    })
    const raw     = response.choices[0]?.message?.content ?? '{}'
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
    const fiche   = JSON.parse(cleaned) as Record<string, unknown>
    return NextResponse.json({ success: true, fiche, levelProfile: profile })
  } catch (err) {
    console.error('Fiche séance error:', err)
    return NextResponse.json({ error: 'Erreur lors de la génération.' }, { status: 500 })
  }
}
