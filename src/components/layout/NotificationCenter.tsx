'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Archive, Bell, CalendarDays, CheckCircle2, Wallet, X } from 'lucide-react'

const ITEMS = [
  {
    title: 'Cours du jour',
    description: 'Verifier le planning et preparer le prochain cours.',
    href: '/planning',
    icon: CalendarDays,
    tone: 'text-sky-600 bg-sky-50',
  },
  {
    title: 'Paiements a suivre',
    description: 'Controler les factures en attente ou en retard.',
    href: '/finances',
    icon: Wallet,
    tone: 'text-emerald-600 bg-emerald-50',
  },
  {
    title: 'Resumes non envoyes',
    description: 'Reprendre les brouillons et archives recentes.',
    href: '/archives',
    icon: Archive,
    tone: 'text-violet-600 bg-violet-50',
  },
]

export function NotificationCenter() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Ouvrir le centre de suivi"
        title="Centre de suivi"
        className="relative rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-[0.95]"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Centre de suivi</p>
              <p className="text-xs text-muted-foreground">Les raccourcis qui gardent l'ecole sous controle.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-2">
            {ITEMS.map(({ title, description, href, icon: Icon, tone }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex gap-3 rounded-lg p-3 transition hover:bg-accent"
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span>
                </span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Les alertes automatiques detaillees pourront se brancher ici.
          </div>
        </div>
      )}
    </div>
  )
}
