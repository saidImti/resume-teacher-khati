'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, MapPin, Key, UserCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/settings/groups',   label: 'Groupes', icon: Users       },
  { href: '/settings/sites',    label: 'Sites',   icon: MapPin      },
  { href: '/settings/users',    label: 'Comptes', icon: UserCircle2 },
  { href: '/settings/api-keys', label: 'Clés API', icon: Key        },
]

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 border-b mb-6 px-4 overflow-x-auto">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
