import OpenAI from 'openai'
import type { LevelSlug } from '@/types'
import { LEVEL_PROMPTS, buildUserPrompt } from './prompts'

// ─── Types ───────────────────────────────────────────────────────────────────────────

export interface ResumeSection {
  type: string
  emoji: string
  content: string
}

export interface GeneratedResume {
  title: string
  theme?: string
  intro: string
  sections: ResumeSection[]
  outro: string
  whatsapp_text: string
}

export interface GenerateResumeParams {
  groupName: string
  levelSlug: LevelSlug
  levelName: string
  sessionDate: string
  rawContent: string
}

export interface GenerateResumeResult {
  success: true
  data: GeneratedResume
  tokensUsed: number
}

export interface GenerateResumeError {
  success: false
  error: string
}

export type GenerateResult = GenerateResumeResult | GenerateResumeError

// ─── Client OpenAI (singleton) ────────────────────────────────────────────────────────

let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY manquante dans les variables d'environnement")
    }
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

// ─── Génération principale ────────────────────────────────────────────────────────────────

export async function generateResume(
  params: GenerateResumeParams
): Promise<GenerateResult> {
  const { levelSlug, groupName, levelName, sessionDate, rawContent } = params

  const promptConfig = LEVEL_PROMPTS[levelSlug]
  if (!promptConfig) {
    return { success: false, error: `Niveau inconnu : ${levelSlug}` }
  }

  const userPrompt = buildUserPrompt({ groupName, levelName, sessionDate, rawContent })

  try {
    const openai = getOpenAIClient()

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: promptConfig.systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2500,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { success: false, error: 'Réponse vide de GPT-4o' }
    }

    const parsed = JSON.parse(content) as GeneratedResume

    if (!parsed.title || !parsed.sections || !Array.isArray(parsed.sections)) {
      return {
        success: false,
        error: 'Format de réponse invalide — structure JSON incorrecte',
      }
    }

    return {
      success: true,
      data: parsed,
      tokensUsed: response.usage?.total_tokens ?? 0,
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { success: false, error: 'Erreur de parsing JSON dans la réponse GPT-4o' }
    }
    if (error instanceof OpenAI.APIError) {
      return {
        success: false,
        error: `Erreur API OpenAI (${error.status}) : ${error.message}`,
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}

// ─── Conversion vers HTML (pour TipTap) ──────────────────────────────────────────────────────────────────

// _sessionDate conservé pour compatibilité — le titre est maintenant généré par GPT
export function resumeToHtml(resume: GeneratedResume, _sessionDate?: string): string {
  const lines: string[] = []

  // En-tête : signature Teacher Khati
  lines.push(`<h1>Teacher Khati</h1>`)

  // Titre = phrase d'intro générée par GPT (avec groupe + date)
  lines.push(`<p>${resume.title}</p>`)

  // Thème du cours
  if (resume.theme) {
    lines.push(`<p><strong>Theme : ${resume.theme}</strong></p>`)
  }

  // Accroche
  lines.push(`<p>${resume.intro}</p>`)

  // Sections — contenu avec \n converti en <br>
  for (const section of resume.sections) {
    lines.push(`<h3>${section.emoji} ${sectionTypeToLabel(section.type)} :</h3>`)
    const formattedContent = section.content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('<br>')
    lines.push(`<p>${formattedContent}</p>`)
  }

  // Signature finale
  lines.push(`<p><strong>Have a nice day! 🌈</strong></p>`)

  return lines.join('\n')
}

function sectionTypeToLabel(type: string): string {
  const labels: Record<string, string> = {
    activity:   'Activité',
    song:       'Comptine & Chansons',
    video:      'Vidéo',
    game:       'Jeux',
    roleplay:   'Role play',
    vocabulary: 'Vocabulaire',
    grammar:    'Grammaire',
    homework:   'À la maison',
    intro:      'Introduction',
    outro:      'Conclusion',
    custom:     'Autre',
    phonics:    'Phonics',
    free:       'Divers',
    story:      'Histoire',
  }
  return labels[type] ?? type
}
