'use client'

import { useState } from 'react'
import { Pin, Globe, Lightbulb, BookMarked, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PadletManager } from './PadletManager'
import { TabPadletDashboard } from './tabs/TabPadletDashboard'
import { TabIdees } from './tabs/TabIdees'
import { TabBibliotheque } from './tabs/TabBibliotheque'
import { TabFiches } from './tabs/TabFiches'
import type { GroupOption } from './PadletManager'
import type { Level, Site } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'padlets' | 'dashboard' | 'idees' | 'bibliotheque' | 'fiches'

interface Tab {
  id:     TabId
  label:  string
  icon:   React.ElementType
  badge?: string
}

interface PadletPageLayoutProps {
  groupOptions: GroupOption[]
  levels:       Level[]
  sites:        Site[]
}

// ─── Config onglets ───────────────────────────────────────────────────────────

const TABS: Tab[] = [
  { id: 'padlets',      label: 'Mes Padlets',    icon: Pin                      },
  { id: 'dashboard',    label: 'Padlet.com',     icon: Globe                    },
  { id: 'idees',        label: 'Idées de cours', icon: Lightbulb, badge: 'IA'   },
  { id: 'bibliotheque', label: 'Bibliothèque',   icon: BookMarked               },
  { id: 'fiches',       label: 'Fiches & Bilans',icon: FileText,  badge: 'IA'   },
]

// ─── Composant ────────────────────────────────────────────────────────────────

export function PadletPageLayout({ groupOptions, levels, sites }: PadletPageLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabId>('padlets')

  return (
    <div className="space-y-6">

      {/* ── Barre d'onglets ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-0">
        {TABS.map((tab) => {
          const Icon     = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap',
                'transition-colors border-b-2 -mb-px',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
              {tab.badge && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs font-bold',
                  isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Contenu de l'onglet actif ────────────────────────────────────────── */}
      <div>
        {activeTab === 'padlets'      && <PadletManager      groups={groupOptions} />}
        {activeTab === 'dashboard'    && <TabPadletDashboard />}
        {activeTab === 'idees'        && <TabIdees        levels={levels} />}
        {activeTab === 'bibliotheque' && <TabBibliotheque levels={levels} sites={sites} />}
        {activeTab === 'fiches'       && <TabFiches       levels={levels} />}
      </div>
    </div>
  )
}
