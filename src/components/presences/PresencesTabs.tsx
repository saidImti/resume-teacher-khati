'use client'

import { useState } from 'react'
import { ClipboardCheck, BookOpenCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AttendanceClient } from './AttendanceClient'
import { AttendanceRegister } from './AttendanceRegister'
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
  { key: 'appel' as const,    label: "Faire l'appel",       icon: ClipboardCheck },
  { key: 'registre' as const, label: 'Fiche de présence',   icon: BookOpenCheck  },
]

export function PresencesTabs({ groups, sites }: Props) {
  const [tab, setTab] = useState<'appel' | 'registre'>('appel')

  return (
    <div className="space-y-6">
      <div className="mx-auto flex max-w-4xl gap-1 rounded-xl border border-border bg-card p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
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

      {tab === 'appel'
        ? <AttendanceClient groups={groups} sites={sites} />
        : <AttendanceRegister groups={groups} sites={sites} />}
    </div>
  )
}
