import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { createRegistrationToken } from '@/lib/registration-token'

export async function GET(request: Request) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Le lien permet de créer familles + élèves → réservé aux rôles écrivains
  if (ctx.role === 'viewer') {
    return NextResponse.json({ error: 'Réservé aux administrateurs et enseignants' }, { status: 403 })
  }

  const url = new URL(request.url)
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin
  const token = createRegistrationToken(ctx.organizationId, ctx.user.id)
  const registrationUrl = `${origin}/inscription?token=${encodeURIComponent(token)}`

  return NextResponse.json({
    url: registrationUrl,
    expiresInDays: 90,
  })
}
