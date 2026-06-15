'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, MapPin, Pencil, Plus, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Site } from '@/types'

interface SiteFormState {
  id?: string
  name: string
  address: string
  color: string
  is_active: boolean
}

const EMPTY_FORM: SiteFormState = {
  name: '',
  address: '',
  color: '#6366f1',
  is_active: true,
}

const COLOR_PRESETS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function SitesManager({ initialSites }: { initialSites: Site[] }) {
  const router = useRouter()
  const [sites, setSites] = useState(initialSites)
  const [form, setForm] = useState<SiteFormState>(EMPTY_FORM)
  const [open, setOpen] = useState(initialSites.length === 0)
  const [saving, setSaving] = useState(false)

  function edit(site: Site) {
    setForm({
      id: site.id,
      name: site.name,
      address: site.address ?? '',
      color: site.color || '#6366f1',
      is_active: site.is_active,
    })
    setOpen(true)
  }

  function reset() {
    setForm(EMPTY_FORM)
    setOpen(false)
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error('Le nom du site est requis')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(form.id ? `/api/sites/${form.id}` : '/api/sites', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address.trim() || null,
          color: form.color,
          is_active: form.is_active,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Impossible de sauvegarder ce site')
        return
      }

      setSites((current) => {
        if (form.id) return current.map((site) => site.id === data.id ? data : site)
        return [...current, data].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      })
      toast.success(form.id ? 'Site mis a jour' : 'Site ajoute')
      reset()
      router.refresh()
    } catch {
      toast.error('Erreur reseau')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(site: Site) {
    const nextActive = !site.is_active
    setSites((current) => current.map((item) => item.id === site.id ? { ...item, is_active: nextActive } : item))
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextActive }),
      })
      if (!res.ok) throw new Error('save failed')
      toast.success(nextActive ? 'Site active' : 'Site masque')
      router.refresh()
    } catch {
      setSites((current) => current.map((item) => item.id === site.id ? site : item))
      toast.error('Impossible de modifier le statut')
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Organisation
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">Sites d'enseignement</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajoutez vos lieux, couleurs et adresses sans passer par Supabase.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setForm(EMPTY_FORM); setOpen(true) }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nouveau site
          </button>
        </div>

        {open && (
          <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Nom du site</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="ex. Maison-Alfort"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Adresse</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Adresse ou salle"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Couleur</label>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-10 w-16 rounded-lg border border-input bg-background p-1"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color }))}
                    className="h-7 w-7 rounded-full border border-border"
                    style={{ backgroundColor: color }}
                    aria-label={`Choisir ${color}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {sites.map((site) => (
          <article key={site.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: site.color || '#6366f1' }}
              >
                {site.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-foreground">{site.name}</h3>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    site.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'
                  }`}>
                    {site.is_active && <CheckCircle2 className="h-3 w-3" />}
                    {site.is_active ? 'Actif' : 'Masque'}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {site.address || 'Adresse a completer'}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => edit(site)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                <Pencil className="h-3.5 w-3.5" />
                Modifier
              </button>
              <button
                type="button"
                onClick={() => void toggleActive(site)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                {site.is_active ? 'Masquer' : 'Reactiver'}
              </button>
            </div>
          </article>
        ))}
      </section>

      {sites.length === 0 && !open && (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="font-medium">Aucun site configure</p>
          <p className="mt-1 text-sm text-muted-foreground">Ajoutez votre premier lieu pour organiser les groupes et le planning.</p>
        </div>
      )}
    </div>
  )
}
