import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PadletApiBoard {
  id: string
  type: 'board'
  attributes: {
    title?:     string
    webUrl?:    { live?: string }
    createdAt?: string   // ISO 8601 — date de création du Padlet
    updatedAt?: string   // ISO 8601 — date de dernière modification
    [key: string]: unknown
  }
}

// ─── GET /api/padlet/my-boards ────────────────────────────────────────────────
//
// Retourne la liste de tous les Padlets de l'utilisateur via l'API officielle.
// Nécessite PADLET_API_TOKEN dans .env.local.
// Si le token n'est pas configuré, retourne { configured: false, boards: [] }.

export async function GET() {
  // Auth Supabase
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiToken = process.env.PADLET_API_TOKEN
  if (!apiToken) {
    return NextResponse.json({ configured: false, boards: [] })
  }

  try {
    const res = await fetch('https://api.padlet.dev/v1/me?include=boards', {
      headers: {
        'X-Api-Key': apiToken,
        Accept:      'application/vnd.api+json',
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      const status = res.status
      if (status === 401) {
        return NextResponse.json({
          configured: true,
          apiError:   'Clé API Padlet invalide. Vérifiez votre token dans .env.local.',
          boards:     [],
        })
      }
      return NextResponse.json({
        configured: true,
        apiError:   `Erreur API Padlet (HTTP ${status}).`,
        boards:     [],
      })
    }

    const json = (await res.json()) as {
      data:      Record<string, unknown>
      included?: PadletApiBoard[]
    }

    const boards = (json.included ?? [])
      .filter((r): r is PadletApiBoard => r.type === 'board')
      .map((b) => ({
        id:        b.id,
        title:     String(b.attributes.title ?? 'Padlet sans titre'),
        webUrl:    String(b.attributes.webUrl?.live ?? ''),
        // Dates ISO — présentes si l'API les expose (Padlet v1 les fournit)
        createdAt: b.attributes.createdAt ?? null,
        updatedAt: b.attributes.updatedAt ?? null,
      }))

    return NextResponse.json({ configured: true, boards })
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json({
        configured: true,
        apiError:   "Timeout : l'API Padlet met trop de temps à répondre.",
        boards:     [],
      })
    }
    return NextResponse.json({
      configured: true,
      apiError:   'Erreur réseau lors de la connexion à Padlet.',
      boards:     [],
    })
  }
}
