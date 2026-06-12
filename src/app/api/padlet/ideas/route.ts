import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Profils pédagogiques par niveau ─────────────────────────────────────────

const LEVEL_PROFILES: Record<string, {
  label: string; age: string; emoji: string
  desc: string; vocab: string; activities: string
}> = {
  preschoolers: {
    label: 'Preschoolers', age: '3-5 ans', emoji: '🌟',
    desc:  'Très jeunes enfants qui découvrent l\'anglais pour la première fois.',
    vocab: 'Couleurs, animaux, corps, famille, chiffres 1-10, salutations simples.',
    activities: 'Chansons avec gestes (TPR), jeux d\'imitation, flashcards colorées, histoires illustrées très simples, danses.',
  },
  kids: {
    label: 'Kids', age: '6-8 ans', emoji: '🚀',
    desc:  'Enfants en début de scolarité, curieux et réceptifs au jeu.',
    vocab: 'Famille, maison, école, nourriture, vêtements, météo, animaux, chiffres 1-100.',
    activities: 'Phonics, jeux de mémoire, bingo, Simon Says, chansons rythmées, mini-dialogues, dessins légendés.',
  },
  juniors: {
    label: 'Juniors', age: '9-11 ans', emoji: '📖',
    desc:  'Enfants autonomes, capables de lire des textes courts et jouer des rôles.',
    vocab: 'Verbes d\'action, adjectifs descriptifs, temps présent/futur, directions, hobbies.',
    activities: 'Storytelling, jeux de rôle simples, quiz Kahoot, crosswords, mini-projets, lectures illustrées.',
  },
  tweens: {
    label: 'Tweens', age: '12-14 ans', emoji: '⚡',
    desc:  'Préadolescents qui apprécient les challenges créatifs et la culture.',
    vocab: 'Expressions idiomatiques simples, culture anglophone, médias, environnement, société.',
    activities: 'Débats simples, projets créatifs, publicités, jeux de rôle complexes, podcasts courts, Escape Room pédagogique.',
  },
  teenagers: {
    label: 'Teenagers', age: '15-18 ans', emoji: '🎓',
    desc:  'Lycéens capables de discussions nuancées et de productions écrites/orales élaborées.',
    vocab: 'Expressions avancées, nuances de sens, faux-amis, registres de langue.',
    activities: 'Discussions, présentations, analyse de médias, projets filmés, simulation d\'entretien, débats formels.',
  },
}

// ─── POST /api/padlet/ideas ───────────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    levelSlug?: string
    theme?: string
    skill?: string
  }

  const levelSlug = body.levelSlug ?? 'kids'
  const theme     = body.theme?.trim() ?? ''
  const skill     = body.skill ?? 'all'
  const profile   = LEVEL_PROFILES[levelSlug] ?? LEVEL_PROFILES.kids!

  const skillInstruction = skill === 'all'
    ? 'Équilibrez toutes les compétences (Speaking, Listening, Reading, Writing) avec un focus sur l\'oral.'
    : `Focus principal sur la compétence : ${skill}.`

  const themeInstruction = theme
    ? `Le thème imposé est : "${theme}".`
    : 'Choisis un thème original, engageant et pertinent pour ce niveau, adapté à l\'actualité ou aux saisons.'

  const prompt = `Tu es une experte en pédagogie ludique pour enfants apprenant l'anglais en France.
Niveau : ${profile.label} (${profile.age}) — ${profile.desc}
Vocabulaire typique : ${profile.vocab}
Types d'activités adaptés : ${profile.activities}
${themeInstruction}
${skillInstruction}
Durée du cours : 1 heure exactement.

Génère un plan de cours ultra-complet et ultra-riche au format JSON strict.
Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans commentaires.

Format attendu :
{
  "theme": "string — titre accrocheur du thème",
  "emoji": "string — 1 emoji représentatif",
  "tagline": "string — sous-titre court (max 10 mots)",
  "objectives": ["string", "string", "string"],
  "timeline": [
    { "minutes": number, "phase": "string", "activity": "string", "tip": "string" }
  ],
  "songs": [
    { "title": "string", "artist": "string", "why": "string", "youtubeSearch": "string", "level": "easy|medium|hard" }
  ],
  "games": [
    { "name": "string", "duration": "string", "description": "string", "materials": "string", "tip": "string" }
  ],
  "videos": [
    { "title": "string", "channel": "string", "youtubeSearch": "string", "duration": "string", "useCase": "string" }
  ],
  "roleplays": [
    { "scenario": "string", "context": "string", "keyPhrases": ["string"] }
  ],
  "crafts": [
    { "name": "string", "description": "string", "link": "string" }
  ],
  "pinterest": [
    { "query": "string", "description": "string" }
  ],
  "padletStructure": {
    "title": "string",
    "sections": [
      { "name": "string", "emoji": "string", "content": "string" }
    ]
  },
  "vocabulary": ["string"],
  "differentiation": {
    "easier": "string",
    "harder": "string"
  },
  "parentNote": "string — message court pour le WhatsApp aux parents"
}

Chaque section doit être ultra-riche, précise et vraiment utilisable en classe.
Pour les chansons et vidéos, propose des ressources qui existent réellement sur YouTube.
Pour Pinterest, propose des requêtes de recherche spécifiques et efficaces.
Le plan doit être dynamique, ludique, centré sur l'apprentissage par le jeu.`

  try {
    const response = await openai.chat.completions.create({
      model:       process.env.OPENAI_MODEL ?? 'gpt-4o',
      temperature: 0.8,
      max_tokens:  3000,
      messages: [
        { role: 'system', content: 'Tu es une experte en pédagogie pour enfants. Tu réponds toujours avec du JSON valide uniquement.' },
        { role: 'user',   content: prompt },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    // Nettoyer si le modèle a quand même mis des backticks
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
    const ideas   = JSON.parse(cleaned) as Record<string, unknown>

    return NextResponse.json({ success: true, ideas, levelProfile: profile })
  } catch (err) {
    console.error('Ideas API error:', err)
    return NextResponse.json({ error: 'Erreur lors de la génération des idées.' }, { status: 500 })
  }
}
