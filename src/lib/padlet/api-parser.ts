import type { LessonContentType, LessonItem, LevelSlug } from '@/types'

// ─── Types API Padlet (JSON:API format) ───────────────────────────────────────

interface ApiResource {
  id: string
  type: string
  attributes: Record<string, unknown>
  relationships?: Record<string, unknown>
}

export interface PadletApiBoardResponse {
  data: ApiResource
  included?: ApiResource[]
}

// ─── Helpers détection niveaux / types (partagés avec le parser HTML) ─────────

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

  if (hasYT)                                                     return 'video'
  if (/vid[eé]o|vimeo/.test(text))                              return 'video'
  if (/role.?play|roleplay|\brôle\b|dialogue/.test(text))       return 'roleplay'
  if (/\bsong\b|chanson|comptine|sing|music|nursery/.test(text)) return 'song'
  if (/\bgame\b|\bjeu\b|\bjeux\b|wheel|quiz|bingo|flash.?card|memory/.test(text)) return 'game'
  return 'activity'
}

function extractLink(body: string, attachmentUrl?: string): string | undefined {
  if (attachmentUrl && attachmentUrl.startsWith('http')) return attachmentUrl
  const match = body.match(/https?:\/\/[^\s]+/)
  return match?.[0]
}

// ─── Parser principal ──────────────────────────────────────────────────────────

/**
 * Convertit la réponse JSON:API de l'endpoint GET /boards/{id}?include=posts,sections
 * en tableau de LessonItem[], exactement comme le fait parsePadletToStructured pour le HTML.
 *
 * Logique niveaux :
 *  - Si le titre de la section contient un niveau (Preschoolers, Kids…),
 *    tous les posts de cette section héritent de ce niveau.
 *  - Si un post mentionne lui-même un niveau, il prend le dessus.
 */
export function parsePadletApiResponse(json: PadletApiBoardResponse): LessonItem[] {
  const included = json.included ?? []

  // ── 1. Extraire les sections ──────────────────────────────────────────────
  const sectionMeta = new Map<string, { title: string; sortIndex: number }>()
  for (const resource of included) {
    if (resource.type === 'section') {
      sectionMeta.set(resource.id, {
        title:     String(resource.attributes.title ?? ''),
        sortIndex: Number(resource.attributes.sortIndex ?? 0),
      })
    }
  }

  // Précalculer les niveaux associés à chaque section
  const sectionLevels = new Map<string, LevelSlug[]>()
  for (const [id, meta] of sectionMeta.entries()) {
    const lvls = detectLevels(meta.title)
    if (lvls.length > 0) sectionLevels.set(id, lvls)
  }

  // ── 2. Extraire les posts et les trier par sortIndex ──────────────────────
  const rawPosts = included
    .filter((r) => r.type === 'post')
    .map((post) => {
      const attrs     = post.attributes
      const content   = (attrs.content ?? {}) as Record<string, unknown>
      const attach    = (content.attachment ?? null) as Record<string, unknown> | null

      const subject    = String(content.subject ?? '')
      const body       = String(content.body ?? '')
      const attachUrl  = attach ? (String(attach.url ?? '') || undefined) : undefined
      const sortIndex  = Number(attrs.sortIndex ?? 0)

      // Récupérer l'ID de la section à laquelle appartient le post
      const rels       = (post.relationships ?? {}) as Record<string, unknown>
      const secRel     = (rels.section as Record<string, unknown> | undefined)
      const secData    = secRel?.data as Record<string, unknown> | null
      const sectionId  = String(secData?.id ?? '')

      return { id: post.id, subject, body, attachUrl, sectionId, sortIndex }
    })
    .sort((a, b) => a.sortIndex - b.sortIndex)

  // ── 3. Convertir en LessonItem[] ─────────────────────────────────────────
  const items: LessonItem[] = []

  for (const post of rawPosts) {
    const name = (post.subject || post.body.slice(0, 120)).trim()
    if (!name) continue

    // Niveaux : mentionnés dans le post lui-même > hérités de la section
    const cardLevels = detectLevels(`${post.subject} ${post.body}`)
    const secLevels  = sectionLevels.get(post.sectionId) ?? []
    const levels     = cardLevels.length > 0 ? cardLevels : secLevels

    const type = detectContentType(post.subject, post.body, post.attachUrl)
    const link = extractLink(post.body, post.attachUrl)

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
