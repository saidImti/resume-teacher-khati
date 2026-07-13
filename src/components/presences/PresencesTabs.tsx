'use client'

import { useState } from 'react'
import { ClipboardCheck, BookOpenCheck, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AttendanceClient } from './AttendanceClient'
import { AttendanceRegister } from './AttendanceRegister'
import { DailyCall } from './DailyCall'
import { useOrgRole } from '@/contexts/OrgRoleContext'
import type { Site } from '@/types'

interface GroupOption {
  id: string
  name: string
  level: { id: string; name: string; emoji: string; color: string }
  site:  { id: string; name: string }
}

interface Props {
  groups: GroupOption[]
  sites: Site[]
}

const TABS = [
  { key: 'jour' as const,     label: 'Appel du jour',       icon: CalendarClock  },
  { key: 'appel' as const,    label: 'Par groupe',          icon: ClipboardCheck },
  { key: 'registre' as const, label: 'Fiche de présence',   icon: BookOpenCheck  },
]

export function PresencesTabs({ groups, sites }: Props) {
  // Viewer : l'appel (du jour ou par groupe) écrit des sessions/présences —
  // seule la fiche de présence (lecture) reste accessible.
  const { canWrite } = useOrgRole()
  const tabs = canWrite ? TABS : TABS.filter(({ key }) => key === 'registre')
  const [tab, setTab] = useState<'jour' | 'appel' | 'registre'>(canWrite ? 'jour' : 'registre')

  return (
    <div className="space-y-6">
      <div className="mx-auto flex max-w-4xl gap-1 rounded-xl border border-border bg-card p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={cn(
              'btn-press flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition',
              tab === key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'jour' && <DailyCall />}
      {tab === 'appel' && <AttendanceClient groups={groups} sites={sites} />}
      {tab === 'registre' && <AttendanceRegister groups={groups} sites={sites} />}
    </div>
  )
}
