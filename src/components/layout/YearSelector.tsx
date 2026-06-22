'use client'

// ─── Sélecteur d'année scolaire ───────────────────────────────────────────────
// Affiché dans le Header. Permet de basculer entre les années.
// L'année active est mise en évidence. Les années passées sont en lecture seule.

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, GraduationCap, Settings } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useAcademicYear } from '@/contexts/AcademicYearContext'

export function YearSelector() {
  const { years, currentYear, isLoading, setCurrentYear } = useAcademicYear()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fermer au clic extérieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (isLoading || !currentYear) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border border-border bg-background',
          'px-2.5 py-1.5 text-xs font-medium transition-colors',
          'hover:bg-accent hover:border-primary/30',
          open && 'bg-accent border-primary/30'
        )}
      >
        {/* Pastille couleur */}
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ background: currentYear.color }}
        />
        <span className="text-foreground hidden sm:inline">{currentYear.name}</span>
        {currentYear.is_active && (
          <span className="hidden sm:inline text-[10px] text-primary/70 font-normal">· Active</span>
        )}
        <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={cn(
          'absolute top-full right-0 mt-1.5 z-50 min-w-[220px]',
          'rounded-xl border border-border bg-background shadow-lg',
          'overflow-hidden py-1',
        )}>
          {/* En-tête */}
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" />
              Années scolaires
            </p>
          </div>

          {/* Liste des années */}
          {years.map((year) => (
            <button
              key={year.id}
              onClick={() => { setCurrentYear(year); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                'hover:bg-accent',
                currentYear.id === year.id && 'bg-primary/5'
              )}
            >
              {/* Pastille couleur */}
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: year.color }}
              />

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{year.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(year.start_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                  {' — '}
                  {new Date(year.end_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {year.is_active && (
                  <span className="text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                    Active
                  </span>
                )}
                {currentYear.id === year.id && (
                  <Check className="h-3 w-3 text-primary" />
                )}
              </div>
            </button>
          ))}

          {/* Lien vers la gestion */}
          <div className="border-t border-border mt-1 pt-1">
            <Link
              href="/settings/annees"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              Gérer les années scolaires
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
