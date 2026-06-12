'use client'

import { Menu, Plus, Bell, Search } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/utils'

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
      {/* Toggle sidebar (mobile) */}
      <button
        onClick={toggleSidebar}
        aria-label="Ouvrir/fermer le menu"
        className="lg:hidden p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors active:scale-[0.95]"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Titre */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Cmd+K trigger — visible sur desktop */}
        <button
          onClick={openCommandPalette}
          aria-label="Ouvrir la palette de commandes"
          title="Recherche rapide Cmd+K"
          className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-accent/40 hover:bg-accent text-muted-foreground text-xs transition-colors btn-press"
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden md:inline">Recherche</span>
          <kbd className="hidden md:flex items-center gap-0.5 text-xs font-mono bg-background px-1 py-0.5 rounded border border-border">
            Cmd+K
          </kbd>
        </button>

        {/* Dark mode toggle */}
        <ThemeToggle />

        {/* Notifications (placeholder — Phase 5) */}
        <button
          aria-label="Notifications (bientôt disponible)"
          title="Notifications (bientôt disponible)"
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors relative active:scale-[0.95]"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Action principale */}
        {action && (
          <Button
            size="sm"
            onClick={action.onClick}
            asChild={!!action.href}
            className="ml-1 active:scale-[0.97]"
          >
            {action.href ? (
              <a href={action.href}>
                <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                {action.label}
              </a>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                {action.label}
              </>
            )}
          </Button>
        )}
      </div>
    </header>
  )
}
