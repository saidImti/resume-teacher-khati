import { Header } from '@/components/layout/Header'
import { WhatsAppSettingsClient } from '@/components/settings/WhatsAppSettingsClient'

export default function WhatsAppSettingsPage() {
  return (
    <>
      <Header
        title="WhatsApp"
        subtitle="Configurer les notifications WhatsApp envoyées aux parents"
      />
      <main className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
        <WhatsAppSettingsClient />
      </main>
    </>
  )
}
