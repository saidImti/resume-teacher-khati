// ─── API /api/attendance/report ──────────────────────────────────────────────
// GET → registre de présence agrégé par élève sur une période
//        ?from=YYYY-MM-DD&to=YYYY-MM-DD[&siteId=][&groupId=]
// L'agrégation vit dans src/lib/attendance-report.ts (partagée avec la
// page d'impression A4 /presences/rapport/print).

import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { buildAttendanceReport } from '@/lib/attendance-report'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json({ error: 'from et to (YYYY-MM-DD) requis' }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()
    const report = await buildAttendanceReport(admin, {
      userId: user.id,
      from,
      to,
      siteId: searchParams.get('siteId'),
      groupId: searchParams.get('groupId'),
    })

    return NextResponse.json(report)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
