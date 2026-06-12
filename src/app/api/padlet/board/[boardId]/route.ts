import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { parsePadletApiResponse, type PadletApiBoardResponse } from '@/lib/padlet/api-parser'

// ─── GET /api/padlet/board/[boardId] ─────────────────────────────────────────
//
// Récupère un Padlet complet (posts + sections) via l'API officielle Padlet.
// Nécessite PADLET_API_TOKEN dans .env.local.
// Retourne { boardTitle, structuredItems } au même format que /api/padlet/import.

export async function GET(
  _request: Request,
  { params }: { params: { boardId: string } }
) {
  // Auth Supabase
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Token API
  const apiToken = process.env.PADLET_API_TOKEN
  if (!apiToken) {
    return NextResponse.json(
      { error: 'PADLET_API_TOKEN non configuré dans .env.local.' },
      { status: 500 }
    )
  }

  const { boardId } = params
  if (!boardId) {
    return NextResponse.json({ error: 'boardId manquant.' }, { status: 400 })
  }

  // Appel API Padlet
  try {
    const res = await fetch(
      `https://api.padlet.dev/v1/boards/${boardId}?include=posts,sections,comments`,
      {
        headers: {
          'X-Api-Key': apiToken,
          Accept:      'application/vnd.api+json',
        },
        signal: AbortSignal.timeout(20_000),
      }
    )

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json(
          { error: 'Padlet introuvable. Vérifiez que le board ID est correct.' },
          { status: 404 }
        )
      }
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          {
            error:
              "Accès refusé. Vous devez être administrateur de ce Padlet pour y accéder via l'API.",
          },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: `Erreur API Padlet (HTTP ${res.status}).` },
        { status: 422 }
      )
    }

    const json = (await res.json()) as PadletApiBoardResponse

    const boardTitle = String(
      (json.data?.attributes?.title as string | undefined) ?? 'Padlet sans titre'
    )

    const structuredItems = parsePadletApiResponse(json)

    if (structuredItems.length === 0) {
      return NextResponse.json(
        { error: 'Ce Padlet ne contient aucun élément détecté.' },
        { status: 422 }
      )
    }

    return NextResponse.json({
      success:        true,
      boardTitle,
      structuredItems,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Timeout : le Padlet met trop de temps à répondre.' },
        { status: 422 }
      )
    }
    return NextResponse.json({ error: 'Erreur réseau.' }, { status: 500 })
  }
}
