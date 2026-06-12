'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Évite le flash d'hydratation
  useEffect(() => setMounted(true), [])
  if (!mounted) {
    return (
      <div className={cn('h-8 w-8 rounded-lg bg-muted animate-pulse', className)} aria-hidden="true" />
    )
  }

  const isDark = resolvedTheme === 'dark'

  function cycle() {
    if (theme === 'system') setTheme('light')
    else if (theme === 'light') setTheme('dark')
    else setTheme('system')
  }

  const icon = theme === 'system'
    ? <Monitor className="h-4 w-4" aria-hidden="true" />
    : isDark
      ? <Moon className="h-4 w-4" aria-hidden="true" />
      : <Sun className="h-4 w-4" aria-hidden="true" />

  const label = theme === 'system'
    ? 'Thème : Automatique (cliquer pour Clair)'
    : theme === 'light'
      ? 'Thème : Clair (cliquer pour Sombre)'
      : 'Thème : Sombre (cliquer pour Automatique)'

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground',
        'transition-colors hover:bg-muted hover:text-foreground active:scale-[0.95]',
        className
      )}
    >
      {icon}
    </button>
  )
}
