import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getTestDataStatus } from '@/lib/test-data'
import { TestModeClient } from '@/components/settings/TestModeClient'

// Le layout /settings fournit déjà le Header + la barre d'onglets SettingsNav.
export default async function ModeTestPage() {
  const admin = createAdminSupabaseClient()
  const initialStatus = await getTestDataStatus(admin).catch(() => null)

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 lg:p-6">
      <TestModeClient initialStatus={initialStatus} />
    </main>
  )
}
