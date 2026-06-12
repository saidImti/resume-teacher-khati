'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  LayoutDashboard, Archive, BookOpen,
  Settings, Pin, LogOut, Search, Plus,
  Users, Globe, ChevronRight, Moon, Sun,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string
  label: string
  group: string
  shortcut?: string[]
  icon: React.ReactNode
  action: () => void
  keywords?: string
}

// ─── CommandPalette ────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  // Ouvrir avec Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const go = useCallback(
    (href: string) => {
      setOpen(false)
      setSearch('')
      router.push(href)
    },
    [router]
  )

  const items: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Dashboard',
      group: 'Navigation',
      icon: <LayoutDashboard className="h-4 w-4" />,
      action: () => go('/dashboard'),
      keywords: 'accueil home',
    },
    {
      id: 'nav-padlets',
      label: 'Mes Padlets',
      group: 'Navigation',
      icon: <Pin className="h-4 w-4" />,
      action: () => go('/mes-padlets'),
      keywords: 'cours génération',
    },
    {
      id: 'nav-archives',
      label: 'Archives',
      group: 'Navigation',
      icon: <Archive className="h-4 w-4" />,
      action: () => go('/archives'),
      keywords: 'résumés historique',
    },
    {
      id: 'nav-activites',
      label: 'Activités',
      group: 'Navigation',
      icon: <BookOpen className="h-4 w-4" />,
      action: () => go('/activites'),
      keywords: 'bibliothèque fiches',
    },
    // Paramètres
    {
      id: 'nav-settings-groups',
      label: 'Paramètres · Groupes',
      group: 'Paramètres',
      icon: <Settings className="h-4 w-4" />,
      action: () => go('/settings/groups'),
      keywords: 'groupes classes configuration',
    },
    {
      id: 'nav-settings-sites',
      label: 'Paramètres · Sites',
      group: 'Paramètres',
      icon: <Globe className="h-4 w-4" />,
      action: () => go('/settings/sites'),
      keywords: 'sites lieux maison-alfort champigny',
    },
    {
      id: 'nav-settings-users',
      label: 'Paramètres · Utilisateurs',
      group: 'Paramètres',
      icon: <Users className="h-4 w-4" />,
      action: () => go('/settings/users'),
      keywords: 'enseignants équipe',
    },
    // Actions rapides
    {
      id: 'action-new-resume',
      label: 'Nouveau résumé',
      group: 'Actions',
      icon: <Plus className="h-4 w-4 text-primary" />,
      action: () => go('/resumes/new'),
      keywords: 'créer générer',
    },
    {
      id: 'action-theme',
      label: theme === 'dark' ? 'Passer en clair' : theme === 'light' ? 'Mode système' : 'Passer en sombre',
      group: 'Actions',
      icon: theme === 'dark'
        ? <Sun className="h-4 w-4" />
        : <Moon className="h-4 w-4" />,
      action: () => {
        setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')
        setOpen(false)
      },
      keywords: 'apparence couleur dark light',
    },
    {
      id: 'action-logout',
      label: 'Se déconnecter',
      group: 'Actions',
      icon: <LogOut className="h-4 w-4 text-destructive" />,
      action: () => go('/auth/logout'),
      keywords: 'quitter sortir',
    },
  ]

  // Grouper les items
  const groups = Array.from(new Set(items.map((i) => i.group)))

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      aria-modal="true"
      role="dialog"
      aria-label="Palette de commandes"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => { setOpen(false); setSearch('') }}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden',
          'bg-background border border-border',
          'animate-fade-in-up'
        )}
        style={{ animationDuration: '0.18s' }}
      >
        <Command className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground/60 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
          {/* Champ de recherche */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Rechercher une page, action…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              autoFocus
            />
            <kbd className="hidden sm:flex items-center gap-0.5 text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
              ESC
            </kbd>
          </div>

          {/* Résultats */}
          <Command.List className="max-h-[340px] overflow-y-auto py-2 overscroll-contain">
            <Command.Empty className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground">
              <Search className="h-8 w-8 mb-3 opacity-30" />
              Aucun résultat pour « {search} »
            </Command.Empty>

            {groups.map((group) => (
              <Command.Group key={group} heading={group}>
                {items
                  .filter((i) => i.group === group)
                  .map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${item.label} ${item.keywords ?? ''}`}
                      onSelect={item.action}
                      className={cn(
                        'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg',
                        'text-sm text-foreground cursor-pointer select-none',
                        'transition-colors duration-75',
                        'aria-selected:bg-accent aria-selected:text-accent-foreground',
                        'hover:bg-accent/60'
                      )}
                    >
                      <span className="text-muted-foreground shrink-0">{item.icon}</span>
                      <span className="flex-1 truncate">{item.label}</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                    </Command.Item>
                  ))}
              </Command.Group>
            ))}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border text-xs text-muted-foreground/60">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-muted px-1 py-0.5 rounded border border-border">↑↓</kbd>
              naviguer
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-muted px-1 py-0.5 rounded border border-border">↵</kbd>
              ouvrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-muted px-1 py-0.5 rounded border border-border">⌘K</kbd>
              fermer
            </span>
          </div>
        </Command>
      </div>
    </div>
  )
}

// ─── Hook utilitaire ──────────────────────────────────────────────────────────

export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return { open, setOpen }
}
