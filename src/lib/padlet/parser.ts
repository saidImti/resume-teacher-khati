import type { LessonContentType, LessonItem, LevelSlug } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PadletPost {
  id: string
  title: string
  body: string
  type: 'text' | 'image' | 'video' | 'link' | 'other'
  attachmentUrl?: string
  attachmentCaption?: string
}

export interface PadletBoard {
  id: string
  title: string
  description: string
  posts: PadletPost[]
  postCount: number
}

export class PadletParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PadletParseError'
  }
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function detectPostType(attachment: Record<string, unknown> | null): PadletPost['type'] {
  if (!attachment) return 'text'
  const mime = String(attachment.mime_type ?? attachment.type ?? '')
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/') || mime.includes('youtube') || mime.includes('vimeo')) return 'video'
  if (mime === 'link' || attachment.link_url) return 'link'
  return 'other'
}

// ─── Parser principal ──────────────────────────────────────────────────────────

/**
 * Parse le contenu HTML d'une page Padlet et extrait les posts.
 * Supporte le format __NEXT_DATA__ (version courante de Padlet).
 */
export function parsePadletHtml(html: string): PadletBoard {
  // 1. Extraire __NEXT_DATA__
  const nextDataMatch = html.match(
    /<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  )

  if (!nextDataMatch?.[1]) {
    throw new PadletParseError(
      "Impossible de lire le contenu Padlet. Vérifiez que le Padlet est public et que l'URL est correcte."
    )
  }

  let nextData: Record<string, unknown>
  try {
    nextData = JSON.parse(nextDataMatch[1]) as Record<string, unknown>
  } catch {
    throw new PadletParseError('Format Padlet non reconnu.')
  }

  // 2. Naviguer jusqu'aux données du board
  const pageProps = (nextData?.props as Record<string, unknown>)?.pageProps as Record<string, unknown>

  const boardData =
    (pageProps?.pad   as Record<string, unknown>) ??
    (pageProps?.board as Record<string, unknown>) ??
    (pageProps?.wall  as Record<string, unknown>)

  if (!boardData) {
    throw new PadletParseError(
      'Structure Padlet non reconnue. Le Padlet est peut-être privé ou le format a changé.'
    )
  }

  const boardId          = String(boardData.id ?? boardData.hashid ?? 'unknown')
  const boardTitle       = String(boardData.title ?? boardData.name ?? 'Padlet sans titre')
  const boardDescription = String(boardData.description ?? boardData.subtitle ?? '')

  // 3. Extraire les posts
  const rawPosts =
    (boardData.wishes as unknown[]) ??
    (boardData.posts  as unknown[]) ??
    (boardData.cues   as unknown[]) ??
    []

  const postsArray = Array.isArray(rawPosts)
    ? rawPosts
    : ((rawPosts as Record<string, unknown>)?.data as unknown[]) ?? []

  const posts: PadletPost[] = postsArray
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    .map((post): PadletPost => {
      const id       = String(post.id ?? post.wish_id ?? Math.random())
      const title    = stripHtml(String(post.subject ?? post.title ?? ''))
      const bodyRaw  = String(post.body ?? post.content ?? post.text ?? '')
      const body     = stripHtml(bodyRaw)

      const attachment = (post.attachment ?? post.media ?? null) as Record<string, unknown> | null
      const type       = detectPostType(attachment)

      const attachmentUrl = attachment
        ? String(
            attachment.url ??
            attachment.link_url ??
            attachment.image_url ??
            attachment.display_url ??
            ''
          )
        : undefined

      const attachmentCaption = attachment
        ? String(attachment.caption ?? attachment.description ?? attachment.title ?? '')
        : undefined

      return {
        id,
        title,
        body,
        type,
        attachmentUrl:     attachmentUrl     || undefined,
        attachmentCaption: attachmentCaption || undefined,
      }
    })
    .filter((p) => p.title || p.body)

  return {
    id:          boardId,
    title:       boardTitle,
    description: boardDescription,
    posts,
    postCount:   posts.length,
  }
}

// ─── Formateur de texte ────────────────────────────────────────────────────────

/**
 * Convertit un PadletBoard en texte brut pour alimenter le wizard.
 */
export function padletBoardToText(board: PadletBoard): string {
  const lines: string[] = []

  if (board.title && board.title !== 'Padlet sans titre') {
    lines.push(`📌 Padlet : ${board.title}`)
    if (board.description) lines.push(board.description)
    lines.push('')
  }

  board.posts.forEach((post, i) => {
    const prefix = `${i + 1}. `

    if (post.title && post.body) {
      lines.push(`${prefix}${post.title}`)
      lines.push(`   ${post.body}`)
    } else if (post.title) {
      lines.push(`${prefix}${post.title}`)
    } else if (post.body) {
      lines.push(`${prefix}${post.body}`)
    }

    if (post.type === 'video' && post.attachmentUrl) {
      lines.push(`   🎥 Vidéo : ${post.attachmentUrl}`)
    } else if (post.type === 'link' && post.attachmentUrl) {
      lines.push(`   🔗 Lien : ${post.attachmentUrl}`)
    } else if (post.type === 'image') {
      lines.push(`   🖼️ Image`)
      if (post.attachmentCaption) lines.push(`   ${post.attachmentCaption}`)
    }

    lines.push('')
  })

  return lines.join('\n').trim()
}

// ─── Parsing structuré (niveaux + types détectés) ─────────────────────────────

const LEVEL_PATTERNS: Array<[LevelSlug, RegExp]> = [
  ['preschoolers', /preschool(?:ers?)?/i],
  ['kids',         /\bkids?\b/i],
  ['juniors',      /\bjuniors?\b/i],
  ['tweens',       /\btweens?\b/i],
  ['teenagers',    /teenagers?|teens?\b/i],
]

function detectLevels(text: string): LevelSlug[] {
  const found: LevelSlug[] = []
  for (const [slug, pattern] of LEVEL_PATTERNS) {
    if (pattern.test(text)) found.push(slug)
  }
  return found
}

function isPureLevelHeader(title: string, body: string): boolean {
  if (body.trim()) return false
  const clean = title.trim()
  return LEVEL_PATTERNS.some(([, pattern]) => {
    const exact = new RegExp(`^(?:${pattern.source})$`, 'i')
    return exact.test(clean)
  })
}

function detectContentType(
  title: string,
  body: string,
  attachmentUrl?: string
): LessonContentType {
  const text = `${title} ${body}`.toLowerCase()
  const url  = (attachmentUrl ?? '').toLowerCase()
  const hasYT =
    url.includes('youtube') || url.includes('youtu.be') ||
    text.includes('youtube') || text.includes('youtu.be')

  if (hasYT)                                                 return 'video'
  if (/vid[eé]o|vimeo/.test(text))                          return 'video'
  if (/role.?play|roleplay|\brôle\b|dialogue/.test(text))   return 'roleplay'
  if (/\bsong\b|chanson|comptine|sing|music|nursery/.test(text)) return 'song'
  if (/\bgame\b|\bjeu\b|\bjeux\b|wheel|quiz|bingo|flash.?card|memory/.test(text)) return 'game'
  return 'activity'
}

function extractLink(body: string, attachmentUrl?: string): string | undefined {
  if (
    attachmentUrl &&
    (attachmentUrl.includes('youtube') ||
      attachmentUrl.includes('youtu.be') ||
      attachmentUrl.startsWith('http'))
  ) {
    return attachmentUrl
  }
  const match = body.match(/https?:\/\/[^\s]+/)
  return match?.[0]
}

/**
 * Convertit un PadletBoard plat en LessonItem[] structurés.
 * Détecte intelligemment les niveaux (Preschoolers, Kids…) et les types
 * de contenu (activity, song, video, game, roleplay).
 */
export function parsePadletToStructured(board: PadletBoard): LessonItem[] {
  let currentLevels: LevelSlug[] = []
  const items: LessonItem[] = []

  for (const post of board.posts) {
    // En-tête de niveau : titre = "Preschoolers", "Kids"… sans corps
    if (isPureLevelHeader(post.title, post.body)) {
      currentLevels = detectLevels(post.title)
      continue
    }

    const name = (post.title || post.body.slice(0, 120)).trim()
    if (!name) continue

    // Niveaux explicitement mentionnés dans la carte
    const cardLevels = detectLevels(`${post.title} ${post.body}`)
    const levels =
      cardLevels.length > 0
        ? cardLevels
        : currentLevels.length > 0
          ? currentLevels
          : []

    const type = detectContentType(post.title, post.body, post.attachmentUrl)
    const link = extractLink(post.body, post.attachmentUrl)

    items.push({
      id:       post.id,
      type,
      name,
      link,
      selected: true,
      levels:   levels.length > 0 ? levels : undefined,
    })
  }

  return items
}
