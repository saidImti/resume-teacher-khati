import { AppShell } from '@/components/layout/AppShell'

// Layout partage pour toutes les pages authentifiees.
// UN SEUL AppShell = UN SEUL Sidebar, persistant entre navigations.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
