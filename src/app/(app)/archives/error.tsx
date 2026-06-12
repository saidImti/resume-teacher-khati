'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function SectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[SectionError]', error)
  }, [error])

  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">Erreur de chargement</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          {"Impossible de charger cette section. Veuillez réessayer."}
        </p>
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted active:scale-[0.97]"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Réessayer
      </button>
    </div>
  )
}
