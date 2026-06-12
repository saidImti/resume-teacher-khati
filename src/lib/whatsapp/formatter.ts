// ─── Types ────────────────────────────────────────────────────────────────────

export type WhatsAppLevel =
  | 'Preschoolers'
  | 'Kids'
  | 'Juniors'
  | 'Tweens'
  | 'Teenagers'

export interface WhatsAppFormatOptions {
  groupName: string
  levelName: string
  sessionDate: string // ISO date string
  teacherName?: string
  schoolName?: string
}

export interface FormattedMessage {
  text: string
  charCount: number
  lineCount: number
  estimatedReadTime: number // secondes
}

// ─── Config par niveau ────────────────────────────────────────────────────────

interface LevelConfig {
  emoji: string
  greeting: string
  signoff: string
  maxLength: number
  emojiDensity: 'high' | 'medium' | 'low'
}

const LEVEL_CONFIGS: Record<string, LevelConfig> = {
  Preschoolers: {
    emoji: '🌈',
    greeting: '🌟 *Bonjour les parents !*',
    signoff: '🤗 À très bientôt !',
    maxLength: 600,
    emojiDensity: 'high',
  },
  Kids: {
    emoji: '⭐',
    greeting: '👋 *Bonjour les parents !*',
    signoff: '😊 À la semaine prochaine !',
    maxLength: 800,
    emojiDensity: 'high',
  },
  Juniors: {
    emoji: '🎯',
    greeting: '👋 *Bonjour les parents,*',
    signoff: '📚 À bientôt !',
    maxLength: 1000,
    emojiDensity: 'medium',
  },
  Tweens: {
    emoji: '📖',
    greeting: '👋 *Bonjour,*',
    signoff: '✅ Bonne semaine à tous !',
    maxLength: 1200,
    emojiDensity: 'medium',
  },
  Teenagers: {
    emoji: '📝',
    greeting: '*Bonjour,*',
    signoff: 'Bonne semaine !',
    maxLength: 1500,
    emojiDensity: 'low',
  },
}

// Fallback si niveau non reconnu
const DEFAULT_CONFIG: LevelConfig = {
  emoji: '📚',
  greeting: '👋 *Bonjour les parents,*',
  signoff: '✅ À bientôt !',
  maxLength: 1000,
  emojiDensity: 'medium',
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function getLevelConfig(levelName: string): LevelConfig {
  // Cherche la config par correspondance partielle (ex: "Kids A" → "Kids")
  const key = Object.keys(LEVEL_CONFIGS).find((k) =>
    levelName.toLowerCase().includes(k.toLowerCase())
  )
  return key ? LEVEL_CONFIGS[key]! : DEFAULT_CONFIG
}

/**
 * Convertit HTML TipTap → texte WhatsApp avec formatage *gras* et _italique_.
 */
export function htmlToWhatsAppText(html: string): string {
  return html
    // Titres → gras WhatsApp
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, (_, content) =>
      `*${stripInlineTags(content)}*`
    )
    // Gras
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '*$1*')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '*$1*')
    // Italique
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '_$1_')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '_$1_')
    // Barré
    .replace(/<s[^>]*>(.*?)<\/s>/gi, '~$1~')
    .replace(/<del[^>]*>(.*?)<\/del>/gi, '~$1~')
    // Listes non ordonnées
    .replace(/<li[^>]*>(.*?)<\/li>/gi, (_, content) =>
      `• ${stripInlineTags(content)}`
    )
    // Listes ordonnées (approximation)
    .replace(/<ol[^>]*>[\s\S]*?<\/ol>/gi, (match) => {
      let counter = 0
      return match.replace(/<li[^>]*>(.*?)<\/li>/gi, (_, content) => {
        counter++
        return `${counter}. ${stripInlineTags(content)}`
      })
    })
    // Sauts de ligne / paragraphes
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<hr[^>]*>/gi, '\n─────────────\n')
    // Supprimer toutes les autres balises HTML
    .replace(/<[^>]+>/g, '')
    // Décoder entités HTML
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Nettoyer les espaces multiples et lignes vides excessives
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function stripInlineTags(html: string): string {
  return html
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '*$1*')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '_$1_')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

// ─── Formateur principal ──────────────────────────────────────────────────────

/**
 * Formate un résumé HTML en message WhatsApp complet, adapté au niveau d'âge.
 */
export function formatResumeForWhatsApp(
  htmlContent: string,
  options: WhatsAppFormatOptions
): FormattedMessage {
  const config = getLevelConfig(options.levelName)

  // Formater la date
  const dateStr = formatDate(options.sessionDate)

  // Convertir le corps HTML
  const body = htmlToWhatsAppText(htmlContent)

  // Tronquer si nécessaire (en gardant les phrases entières)
  const truncatedBody = truncateAtSentence(body, config.maxLength)

  // En-tête
  const schoolName = options.schoolName ?? 'Teacher Khati English'
  const header = [
    config.greeting,
    '',
    `Voici le résumé du cours d'anglais de ${options.groupName}`,
    `📅 ${dateStr}`,
    `🏫 ${schoolName}`,
    '',
    '─────────────',
  ].join('\n')

  // Corps
  const messageBody = truncatedBody

  // Pied de page
  const footer = [
    '─────────────',
    '',
    config.signoff,
  ].join('\n')

  // Assembler
  const text = [header, messageBody, footer].join('\n')

  return {
    text,
    charCount: text.length,
    lineCount: text.split('\n').length,
    estimatedReadTime: Math.ceil(text.split(' ').length / 200) * 60, // ~200 mots/min
  }
}

/**
 * Génère un aperçu court (preview de notification).
 */
export function generateWhatsAppPreview(
  htmlContent: string,
  _levelName: string,
  maxChars = 100
): string {
  const plain = htmlToWhatsAppText(htmlContent)
  if (plain.length <= maxChars) return plain
  return plain.slice(0, maxChars).replace(/\s\S*$/, '') + '…'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate + 'T12:00:00')
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return isoDate
  }
}

function truncateAtSentence(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text

  // Trouver le dernier point, point d'exclamation ou saut de ligne avant maxLength
  const truncated = text.slice(0, maxLength)
  const lastBreak = Math.max(
    truncated.lastIndexOf('\n'),
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  )

  if (lastBreak > maxLength * 0.7) {
    return truncated.slice(0, lastBreak + 1).trim() + '\n\n_[…résumé complet sur l\'application]_'
  }

  return truncated.trim() + '…'
}
