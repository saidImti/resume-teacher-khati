import { Header } from '@/components/layout/Header'
import { AcademicYearsClient } from '@/components/settings/AcademicYearsClient'

export default function AcademicYearsPage() {
  return (
    <>
      <Header
        title="Années scolaires"
        subtitle="Gérez vos années, copiez la structure d'une année à l'autre"
      />
      <main className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        <AcademicYearsClient />
      </main>
    </>
  )
}
