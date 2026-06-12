import { Header } from '@/components/layout/Header'
import { SettingsNav } from '@/components/settings/SettingsNav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Parametres" />
      <SettingsNav />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
