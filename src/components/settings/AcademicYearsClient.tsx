'use client'

// ─── Gestion des Années Scolaires ─────────────────────────────────────────────
// CRUD complet + wizard de copie des groupes + activation

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, GraduationCap, Check, Trash2, Edit2, Copy,
  ChevronRight, Loader2, X, AlertCircle, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAcademicYear, type AcademicYear } from '@/contexts/AcademicYearContext'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────
interface YearWithStats extends AcademicYear {
  group_count: number
  notes?: string
}

// ─── Palette de couleurs ──────────────────────────────────────────────────────
const COLOR_PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#64748b', '#a78bfa',
]

// ─── Composant principal ──────────────────────────────────────────────────────
export function AcademicYearsClient() {
  const { years: ctxYears, refreshYears, setCurrentYear } = useAcademicYear()
  const [years, setYears]           = useState<YearWithStats[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [editYear, setEditYear]     = useState<YearWithStats | null>(null)
  const [activating, setActivating] = useState<string | null>(null)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [toast, setToast]           = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const loadYears = useCallback(async () => {
    setIsLoading(true)
    try {
      const res  = await fetch('/api/academic-years')
      const data = await res.json() as { years?: YearWithStats[] }
      setYears(data.years ?? [])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void loadYears() }, [loadYears])

  async function handleActivate(year: YearWithStats) {
    setActivating(year.id)
    try {
      const res  = await fetch('/api/academic-years/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearId: year.id }),
      })
      const data = await res.json() as { message?: string; error?: string }
      if (!res.ok) { showToast('err', data.error ?? 'Erreur'); return }
      showToast('ok', data.message ?? `${year.name} activée`)
      await loadYears()
      await refreshYears()
      setCurrentYear(year)
    } finally {
      setActivating(null)
    }
  }

  async function handleDelete(year: YearWithStats) {
    if (!confirm(`Supprimer "${year.name}" ? Cette action est irréversible.`)) return
    setDeleting(year.id)
    try {
      const res  = await fetch(`/api/academic-years/${year.id}`, { method: 'DELETE' })
      const data = await res.json() as { message?: string; error?: string }
      if (!res.ok) { showToast('err', data.error ?? 'Erreur'); return }
      showToast('ok', data.message ?? 'Supprimée')
      await loadYears()
      await refreshYears()
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all',
          toast.type === 'ok' ? 'bg-green-500 text-white' : 'bg-destructive text-destructive-foreground'
        )}>
          {toast.type === 'ok' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Toutes les années</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {years.length} année{years.length > 1 ? 's' : ''} · Une seule peut être active à la fois
          </p>
        </div>
        <Button size="sm" onClick={() => setShowWizard(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nouvelle année
        </Button>
      </div>

      {/* Liste des années */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {years.map((year) => (
            <YearCard
              key={year.id}
              year={year}
              activating={activating === year.id}
              deleting={deleting === year.id}
              onActivate={() => handleActivate(year)}
              onEdit={() => setEditYear(year)}
              onDelete={() => handleDelete(year)}
            />
          ))}
          {years.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <GraduationCap className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Aucune année scolaire</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Créez votre première année pour commencer</p>
            </div>
          )}
        </div>
      )}

      {/* Wizard création */}
      {showWizard && (
        <YearWizard
          years={years}
          onClose={() => setShowWizard(false)}
          onCreated={async () => {
            setShowWizard(false)
            await loadYears()
            await refreshYears()
          }}
          onToast={showToast}
        />
      )}

      {/* Modal édition */}
      {editYear && (
        <YearEditModal
          year={editYear}
          onClose={() => setEditYear(null)}
          onSaved={async (updated) => {
            setEditYear(null)
            await loadYears()
            await refreshYears()
            showToast('ok', `${updated.name} mise à jour`)
          }}
          onToast={showToast}
        />
      )}
    </div>
  )
}

// ─── Carte d'une année ────────────────────────────────────────────────────────
function YearCard({
  year, activating, deleting, onActivate, onEdit, onDelete,
}: {
  year:       YearWithStats
  activating: boolean
  deleting:   boolean
  onActivate: () => void
  onEdit:     () => void
  onDelete:   () => void
}) {
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className={cn(
      'group relative rounded-xl border bg-card p-4 transition-all',
      year.is_active
        ? 'border-primary/40 shadow-sm shadow-primary/10'
        : 'border-border hover:border-border/80 hover:shadow-sm',
    )}>
      <div className="flex items-start gap-3">
        {/* Pastille couleur */}
        <div
          className="mt-0.5 h-9 w-9 rounded-lg shrink-0 flex items-center justify-center"
          style={{ background: year.color + '20' }}
        >
          <GraduationCap className="h-5 w-5" style={{ color: year.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">{year.name}</h3>
            {year.is_active && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
                <Zap className="h-2.5 w-2.5" />
                Active
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">
            {fmt(year.start_date)} → {fmt(year.end_date)}
          </p>

          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{year.group_count}</span> groupe{year.group_count > 1 ? 's' : ''}
            </span>
            {/* Barre de progression de l'année */}
            <YearProgress start={year.start_date} end={year.end_date} color={year.color} />
          </div>

          {year.notes && (
            <p className="mt-1.5 text-xs text-muted-foreground italic">{year.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!year.is_active && (
            <button
              onClick={onActivate}
              disabled={activating}
              title="Activer cette année"
              className="rounded-lg p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={onEdit}
            title="Modifier"
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          {!year.is_active && (
            <button
              onClick={onDelete}
              disabled={deleting}
              title="Supprimer"
              className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Barre couleur active */}
      {year.is_active && (
        <div
          className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
          style={{ background: year.color }}
        />
      )}
    </div>
  )
}

// ─── Barre de progression de l'année ─────────────────────────────────────────
function YearProgress({ start, end, color }: { start: string; end: string; color: string }) {
  const now   = Date.now()
  const s     = new Date(start).getTime()
  const e     = new Date(end).getTime()
  const pct   = Math.max(0, Math.min(100, ((now - s) / (e - s)) * 100))
  const future = now < s
  const past   = now > e

  if (future) return <span className="text-xs text-muted-foreground/60">À venir</span>
  if (past)   return <span className="text-xs text-muted-foreground/60">Terminée</span>

  return (
    <div className="flex items-center gap-1.5 flex-1">
      <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden max-w-[80px]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] text-muted-foreground">{Math.round(pct)}%</span>
    </div>
  )
}

// ─── Wizard Nouvelle Année ────────────────────────────────────────────────────
function YearWizard({
  years, onClose, onCreated, onToast,
}: {
  years:     YearWithStats[]
  onClose:   () => void
  onCreated: () => Promise<void>
  onToast:   (type: 'ok' | 'err', msg: string) => void
}) {
  const [step, setStep]       = useState<1 | 2>(1)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({
    name:             '',
    start_date:       '',
    end_date:         '',
    color:            '#6366f1',
    copy_from_year_id: '',
    notes:            '',
  })

  // Suggestion automatique du nom
  const currentYear = new Date().getFullYear()
  const suggestions = [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear + 1}-${currentYear + 2}`,
  ]

  async function handleCreate() {
    if (!form.name || !form.start_date || !form.end_date) {
      onToast('err', 'Nom, date début et date fin requis')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:             form.name,
          start_date:       form.start_date,
          end_date:         form.end_date,
          color:            form.color,
          notes:            form.notes || undefined,
          copy_from_year_id: form.copy_from_year_id || undefined,
        }),
      })
      const data = await res.json() as { message?: string; error?: string; copied_groups?: number }
      if (!res.ok) { onToast('err', data.error ?? 'Erreur'); return }
      onToast('ok', data.message ?? 'Année créée')
      await onCreated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl">
        {/* En-tête */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Nouvelle année scolaire</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Étape {step}/2</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Indicateur d'étapes */}
        <div className="flex gap-1 px-5 pt-4">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={cn('h-1 flex-1 rounded-full transition-colors', s <= step ? 'bg-primary' : 'bg-muted')}
            />
          ))}
        </div>

        <div className="p-5 space-y-4">
          {step === 1 && (
            <>
              {/* Nom */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Nom de l'année *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="ex. 2026-2027"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {/* Suggestions */}
                <div className="flex gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setForm({ ...form, name: s })}
                      className="text-[10px] text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Date de début *</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Date de fin *</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Couleur */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Couleur</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className={cn(
                        'h-6 w-6 rounded-full transition-transform hover:scale-110',
                        form.color === c && 'ring-2 ring-offset-2 ring-primary scale-110'
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {/* Copie des groupes */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Copy className="h-4 w-4 text-primary" />
                    Copier la structure
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Optionnel — recopie automatiquement tous les groupes d'une année précédente
                    (sans les élèves ni les cours).
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Copier depuis</label>
                  <select
                    value={form.copy_from_year_id}
                    onChange={(e) => setForm({ ...form, copy_from_year_id: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">— Ne pas copier —</option>
                    {years.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name} ({y.group_count} groupe{y.group_count > 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                </div>

                {form.copy_from_year_id && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                    <p className="text-xs text-primary font-medium">
                      ✓ Les groupes de {years.find((y) => y.id === form.copy_from_year_id)?.name} seront
                      recréés pour {form.name || 'la nouvelle année'} (sans élèves ni cours).
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Notes (optionnel)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Objectifs, changements prévus..."
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-border">
          <button
            onClick={step === 1 ? onClose : () => setStep(1)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {step === 1 ? 'Annuler' : '← Retour'}
          </button>

          {step === 1 ? (
            <Button
              size="sm"
              onClick={() => setStep(2)}
              disabled={!form.name || !form.start_date || !form.end_date}
            >
              Suivant
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  Créer l'année
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal Édition ────────────────────────────────────────────────────────────
function YearEditModal({
  year, onClose, onSaved, onToast,
}: {
  year:    YearWithStats
  onClose: () => void
  onSaved: (updated: YearWithStats) => Promise<void>
  onToast: (type: 'ok' | 'err', msg: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm]     = useState({
    name:       year.name,
    start_date: year.start_date.split('T')[0],
    end_date:   year.end_date.split('T')[0],
    color:      year.color,
    notes:      year.notes ?? '',
  })

  async function handleSave() {
    setSaving(true)
    try {
      const res  = await fetch(`/api/academic-years/${year.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json() as { year?: YearWithStats; error?: string }
      if (!res.ok) { onToast('err', data.error ?? 'Erreur'); return }
      await onSaved({ ...year, ...form, group_count: year.group_count })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-sm font-semibold">Modifier {year.name}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Nom</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Début</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Fin</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Couleur</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={cn(
                    'h-6 w-6 rounded-full transition-transform hover:scale-110',
                    form.color === c && 'ring-2 ring-offset-2 ring-primary scale-110'
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Annuler
          </button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  )
}
