import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { parsePadletHtml, parsePadletToStructured, PadletParseError } from '@/lib/padlet/parser'

// ─── Schema ───────────────────────────────────────────────────────────────────

const ImportSchema = z.object({
  url: z
    .string()
    .url('URL invalide')
    .refine(
      (u) => u.includes('padlet.com'),
      "L'URL doit pointer vers un Padlet (padlet.com)"
    ),
})

// ─── Utilitaires ──────────────────────────────────────────────────────────────

/**
 * Extrait le boardId (hash 16 chars alphanumériques) depuis une URL Padlet.
 * Ex : https://padlet.com/khatijateach/australia-2-weeks-uiaronps2w8kmpul
 *   → "uiaronps2w8kmpul"
 */
function extractBoardId(url: string): string | null {
  const match = url.match(/([a-z0-9]{16})(?:[/?#].*)?$/i)
  return match?.[1] ?? null
}

// Headers navigation normale
const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language':   'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding':   'gzip, deflate, br',
  'Cache-Control':     'no-cache',
  'Pragma':            'no-cache',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Mode':    'navigate',
  'Sec-Fetch-Site':    'none',
  'Sec-Fetch-Dest':    'document',
  'Sec-Fetch-User':    '?1',
}

// Headers spécifiques iframe — utilisés pour l'endpoint embed
const EMBED_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language':   'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding':   'gzip, deflate, br',
  'Cache-Control':     'no-cache',
  'Referer':           'https://padlet.com/',
  'Sec-Fetch-Mode':    'navigate',
  'Sec-Fetch-Site':    'same-origin',
  'Sec-Fetch-Dest':    'iframe',
  'Upgrade-Insecure-Requests': '1',
}

/**
 * Tente de fetcher le Padlet via l'endpoint embed (évite Cloudflare).
 * 3 tentatives : embed avec headers iframe, embed sans headers, URL originale.
 */
async function fetchPadletHtml(originalUrl: string): Promise<string> {
  const boardId = extractBoardId(originalUrl)

  // ── Tentative 1 : endpoint embed avec headers iframe ──────────────────────
  if (boardId) {
    const embedUrl = `https://padlet.com/padlets/${boardId}/embeds/preview_embed`
    try {
      const embedRes = await fetch(embedUrl, {
        headers: EMBED_HEADERS,
        signal:  AbortSignal.timeout(15_000),
      })
      if (embedRes.ok) {
        const html = await embedRes.text()
        // Vérifier qu'on a du contenu réel (pas une page d'erreur vide)
        if (html.length > 5_000) return html
      }
    } catch { /* fallback */ }

    // ── Tentative 2 : embed sans headers spéciaux ────────────────────────────
    try {
      const embedRes2 = await fetch(embedUrl, {
        headers: FETCH_HEADERS,
        signal:  AbortSignal.timeout(15_000),
      })
      if (embedRes2.ok) {
        const html = await embedRes2.text()
        if (html.length > 5_000) return html
      }
    } catch { /* fallback */ }
  }

  // ── Tentative 3 : URL originale ───────────────────────────────────────────
  const res = await fetch(originalUrl, {
    headers: FETCH_HEADERS,
    signal:  AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    if (res.status === 403 || res.status === 401) {
      throw new Error(
        "Impossible d'acceder a ce Padlet depuis notre serveur (acces bloque). " +
        "Verifiez que le Padlet est public, ou utilisez la saisie manuelle."
      )
    }
    throw new Error(`Impossible d'acceder au Padlet (HTTP ${res.status}).`)
  }

  return res.text()
}

// ─── POST /api/padlet/import ─────────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ImportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors.url?.[0] ?? 'URL invalide' },
      { status: 422 }
    )
  }

  const { url } = parsed.data

  // Fetch le contenu Padlet (embed ou fallback URL originale)
  let html: string
  try {
    html = await fetchPadletHtml(url)
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'TimeoutError') {
        return NextResponse.json(
          { error: 'Le Padlet met trop de temps a repondre (timeout 15s).' },
          { status: 422 }
        )
      }
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    return NextResponse.json(
      { error: "Impossible de recuperer le Padlet. Verifiez l'URL." },
      { status: 422 }
    )
  }

  // Parser le contenu
  try {
    const board = parsePadletHtml(html)

    if (board.postCount === 0) {
      return NextResponse.json(
        { error: 'Aucun post trouve dans ce Padlet. Il est peut-etre vide.' },
        { status: 422 }
      )
    }

    const structuredItems = parsePadletToStructured(board)

    return NextResponse.json({
      success:      true,
      board,
      structuredItems,
      boardTitle:   board.title,
    })
  } catch (err) {
    if (err instanceof PadletParseError) {
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    return NextResponse.json(
      { error: "Erreur lors de l'analyse du Padlet." },
      { status: 500 }
    )
  }
}
