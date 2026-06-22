import { Header } from '@/components/layout/Header'
import { ToolsNav } from '@/components/outils/ToolsNav'

export default function OutilsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Outils" subtitle="Connecteurs et intégrations externes" />
      <ToolsNav />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
