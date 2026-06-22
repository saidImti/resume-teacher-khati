import { WhatsAppSettingsClient } from '@/components/settings/WhatsAppSettingsClient'

export const metadata = { title: 'WhatsApp — Outils' }

export default function OutilsWhatsAppPage() {
  return (
    <main className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
      <WhatsAppSettingsClient />
    </main>
  )
}
