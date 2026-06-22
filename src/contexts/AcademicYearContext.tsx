'use client'

// ─── Contexte Année Scolaire ──────────────────────────────────────────────────
// Fournit l'année scolaire active à toute l'application.
// Le sélecteur dans le Header permet de basculer entre les années
// (mode lecture pour les années passées).

import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react'

export interface AcademicYear {
  id:         string
  name:       string
  start_date: string
  end_date:   string
  is_active:  boolean
  color:      string
}

interface AcademicYearContextValue {
  years:           AcademicYear[]
  currentYear:     AcademicYear | null
  isLoading:       boolean
  setCurrentYear:  (year: AcademicYear) => void
  refreshYears:    () => Promise<void>
}

const AcademicYearContext = createContext<AcademicYearContextValue>({
  years:          [],
  currentYear:    null,
  isLoading:      true,
  setCurrentYear: () => undefined,
  refreshYears:   async () => undefined,
})

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const [years, setYears]               = useState<AcademicYear[]>([])
  const [currentYear, setCurrentYearState] = useState<AcademicYear | null>(null)
  const [isLoading, setIsLoading]       = useState(true)

  const refreshYears = useCallback(async () => {
    try {
      const res  = await fetch('/api/academic-years')
      const data = await res.json() as { years?: AcademicYear[]; error?: string }
      if (!res.ok || !data.years) return
      setYears(data.years)

      // Priorité : année active → dernière année
      const active = data.years.find((y) => y.is_active)
      const latest = data.years[0]
      if (active || latest) {
        setCurrentYearState((prev) => prev ?? active ?? latest ?? null)
      }
    } catch { /* silencieux */ }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { void refreshYears() }, [refreshYears])

  function setCurrentYear(year: AcademicYear) {
    setCurrentYearState(year)
    // Persiste en localStorage pour survivre aux navigations
    try { localStorage.setItem('tk_current_year_id', year.id) } catch { /* */ }
  }

  return (
    <AcademicYearContext.Provider value={{ years, currentYear, isLoading, setCurrentYear, refreshYears }}>
      {children}
    </AcademicYearContext.Provider>
  )
}

export function useAcademicYear() {
  return useContext(AcademicYearContext)
}
