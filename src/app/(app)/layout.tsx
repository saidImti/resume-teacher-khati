import { AppShell } from '@/components/layout/AppShell'
import { AcademicYearProvider } from '@/contexts/AcademicYearContext'

// Layout partagé pour toutes les pages authentifiées.
// UN SEUL AppShell = UN SEUL Sidebar, persistant entre navigations.
// AcademicYearProvider expose l'année scolaire courante dans toute l'app.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AcademicYearProvider>
      <AppShell>{children}</AppShell>
    </AcademicYearProvider>
  )
}
