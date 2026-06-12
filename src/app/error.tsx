'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">Une erreur est survenue</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          {error.message ?? "Quelque chose s'est mal passé. Veuillez réessayer."}
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-muted-foreground/60">Réf : {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted active:scale-[0.97]"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Réessayer
      </button>
    </div>
  )
}
