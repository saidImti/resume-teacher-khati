import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { withApiAuth } from '@/lib/with-api-auth'
import { generateTestStudents } from '@/lib/test-data'

const GenerateSchema = z.object({
  studentsPerGroup: z.number().int().min(1).max(30).default(10),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await withApiAuth(request, 'admin')
    if (!auth.ok) return auth.response

    const body = await request.json().catch(() => ({}))
    const parsed = GenerateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Paramètres invalides', details: parsed.error.flatten() }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()
    const result = await generateTestStudents(admin, parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
