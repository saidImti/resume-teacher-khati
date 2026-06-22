import { Header } from '@/components/layout/Header'
import { FeatureFlagsClient } from '@/components/settings/FeatureFlagsClient'

export default function FonctionnalitesPage() {
  return (
    <>
      <Header
        title="Fonctionnalités"
        subtitle="Activez les modules pour vous, puis pour les parents quand vous êtes prête"
      />
      <main className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        <FeatureFlagsClient />
      </main>
    </>
  )
}
