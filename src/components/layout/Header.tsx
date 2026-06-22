'use client'

import { Menu, Plus, Search } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/utils'
import { NotificationCenter } from './NotificationCenter'
import { YearSelector } from './YearSelector'

interface HeaderProps {
  title: string
  subtitle?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function Header({ title, subtitle, action }: HeaderProps) {
  const { toggleSidebar } = useUIStore()

  function openCommandPalette() {
    const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
    document.dispatchEvent(e)
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-10 flex h-14 items-center gap-4',
        'border-b border-border bg-background/80 backdrop-blur-sm',
        'px-4 lg:px-6'
      )}
    >
      <button
        onClick={toggleSidebar}
        aria-label="Ouvrir/fermer le menu"
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent lg:hidden active:scale-[0.95]"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={openCommandPalette}
          aria-label="Ouvrir la palette de commandes"
          title="Recherche rapide Cmd+K"
          className="btn-press hidden items-center gap-2 rounded-lg border border-border bg-accent/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent sm:flex"
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden md:inline">Recherche</span>
          <kbd className="hidden items-center gap-0.5 rounded border border-border bg-background px-1 py-0.5 font-mono text-xs md:flex">
            Cmd+K
          </kbd>
        </button>

        <YearSelector />
        <ThemeToggle />
        <NotificationCenter />

        {action && (
          <Button
            size="sm"
            onClick={action.onClick}
            asChild={!!action.href}
            className="ml-1 active:scale-[0.97]"
          >
            {action.href ? (
              <a href={action.href}>
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                {action.label}
              </a>
            ) : (
              <>
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                {action.label}
              </>
            )}
          </Button>
        )}
      </div>
    </header>
  )
}
