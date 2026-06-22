'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, CheckCircle2, AlertCircle, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface GenerateResult {
  created: number
  updated: number
  skipped: number
  errors: number
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export function GenerateInvoicesButton() {
  const router = useRouter()
  const now = new Date()

  const [open, setOpen]           = useState(false)
  const [month, setMonth]         = useState(now.getMonth() + 1)    // 1-12
  const [year, setYear]           = useState(now.getFullYear())
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<GenerateResult | null>(null)
  const [error, setError]         = useState<string | null>(null)

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 1 + i)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/invoices/generate-monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erreur inconnue')
        return
      }

      setResult(data as GenerateResult)
      router.refresh()
    } catch {
      setError('Erreur réseau — réessaie.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setOpen(false)
    setResult(null)
    setError(null)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950"
      >
        <Sparkles className="h-4 w-4" />
        Générer les factures
      </Button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-card shadow-2xl p-6 space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">Générer les factures</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Crée automatiquement une facture par famille active.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Période */}
            {!result && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Période de facturation</p>
                <div className="flex gap-3">
                  {/* Mois */}
                  <div className="relative flex-1">
                    <select
                      value={month}
                      onChange={e => setMonth(Number(e.target.value))}
                      className="w-full appearance-none rounded-xl border bg-background px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {MONTHS.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>

                  {/* Année */}
                  <div className="relative w-28">
                    <select
                      value={year}
                      onChange={e => setYear(Number(e.target.value))}
                      className="w-full appearance-none rounded-xl border bg-background px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Note */}
                <div className="rounded-xl bg-muted/50 p-3.5 text-xs text-muted-foreground space-y-1.5">
                  <p className="font-medium text-foreground">Ce que ça fait :</p>
                  <ul className="space-y-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      Crée une facture en attente par famille active ayant des élèves inscrits
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      Applique les tarifs configurés (ou tarif personnalisé famille)
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-500 mt-0.5">→</span>
                      Les factures déjà payées ne sont jamais modifiées
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Résultat */}
            {result && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Génération terminée</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Créées',    value: result.created, color: 'text-emerald-700 bg-emerald-50' },
                    { label: 'Mises à jour', value: result.updated, color: 'text-blue-700 bg-blue-50' },
                    { label: 'Ignorées',  value: result.skipped, color: 'text-muted-foreground bg-muted/50' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={cn('rounded-xl p-3 text-center', color)}>
                      <div className="text-2xl font-bold">{value}</div>
                      <div className="text-xs mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
                {result.errors > 0 && (
                  <p className="text-xs text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {result.errors} erreur{result.errors > 1 ? 's' : ''} — vérifiez les logs serveur.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Période : {MONTHS[month - 1]} {year}
                </p>
              </div>
            )}

            {/* Erreur API */}
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              {result ? (
                <Button onClick={handleClose} className="flex-1">
                  Fermer
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="flex-1 gap-2"
                  >
                    {loading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Génération…</>
                    ) : (
                      <><Sparkles className="h-4 w-4" /> Générer {MONTHS[month - 1]} {year}</>
                    )}
                  </Button>
                  <Button variant="ghost" onClick={handleClose} disabled={loading}>
                    Annuler
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
