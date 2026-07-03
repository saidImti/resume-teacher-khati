'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Image as ImageIcon, Loader2, PenLine, Plus, Sparkles,
  Trash2, Upload, Users2, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { FadeIn } from '@/components/ui/FadeIn'
import type { Signatory } from '@/lib/branding'

interface Props {
  initialLogoUrl: string | null
  initialSignatories: Signatory[]
}

const SLOT_LABEL = ["Bloc « L'enseignant(e) »", 'Bloc « Direction »']

export function BrandingClient({ initialLogoUrl, initialSignatories }: Props) {
  const router = useRouter()
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [signatories, setSignatories] = useState(initialSignatories)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [addingSignatory, setAddingSignatory] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [savingNew, setSavingNew] = useState(false)
  const [busySignatoryId, setBusySignatoryId] = useState<string | null>(null)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const newSignatoryFileRef = useRef<HTMLInputElement>(null)
  const replaceInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  async function uploadLogo(file: File) {
    setUploadingLogo(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/branding/logo', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Échec du téléversement'); return }
      setLogoUrl(data.logoUrl)
      toast.success('Logo mis à jour')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function removeLogo() {
    if (!confirm('Retirer le logo ? Le repère par défaut réapparaîtra partout.')) return
    setUploadingLogo(true)
    try {
      const res = await fetch('/api/branding/logo', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Échec de la suppression'); return }
      setLogoUrl(null)
      toast.success('Logo retiré')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function createSignatory() {
    if (!newLabel.trim()) { toast.error('Indique un nom (ex. « Teacher Khati », « Directeur »…)'); return }
    setSavingNew(true)
    try {
      const form = new FormData()
      form.append('label', newLabel.trim())
      if (newFile) form.append('file', newFile)
      const res = await fetch('/api/signatories', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Échec de la création'); return }
      setSignatories(data.signatories)
      setAddingSignatory(false)
      setNewLabel('')
      setNewFile(null)
      toast.success('Signataire ajouté')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSavingNew(false)
    }
  }

  async function replaceSignature(id: string, file: File) {
    setBusySignatoryId(id)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/signatories/${id}`, { method: 'PATCH', body: form })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Échec du remplacement'); return }
      setSignatories(data.signatories)
      toast.success('Signature mise à jour')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setBusySignatoryId(null)
    }
  }

  async function removeSignatory(id: string, label: string) {
    if (!confirm(`Supprimer « ${label} » ? Ce signataire n'apparaîtra plus sur les documents.`)) return
    setBusySignatoryId(id)
    try {
      const res = await fetch(`/api/signatories/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Échec de la suppression'); return }
      setSignatories(data.signatories)
      toast.success('Signataire supprimé')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setBusySignatoryId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Hero ────────────────────────────────────────────── */}
      <FadeIn from="bottom">
        <section className="overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Identité de l&apos;école
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Marque</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Ton logo remplace automatiquement le repère par défaut partout où il apparaît — menu, page de connexion,
            factures, fiches de présence. Chaque signataire ajouté ici s&apos;appose automatiquement sur les documents imprimés.
          </p>
        </section>
      </FadeIn>

      {/* ─── Logo ────────────────────────────────────────────── */}
      <FadeIn delay={45} from="bottom">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
              <ImageIcon className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Logo de l&apos;école</h2>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo actuel" className="h-full w-full object-contain p-1" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg text-primary-foreground">📚</div>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="btn-press inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {logoUrl ? 'Remplacer le logo' : 'Téléverser un logo'}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => void removeLogo()}
                  disabled={uploadingLogo}
                  className="btn-press inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Retirer
                </button>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadLogo(f); e.target.value = '' }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">PNG, JPG ou WebP · 4 Mo maximum · fond transparent recommandé.</p>
        </section>
      </FadeIn>

      {/* ─── Signataires ─────────────────────────────────────── */}
      <FadeIn delay={90} from="bottom">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
                <Users2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Signataires des documents</h2>
                <p className="text-xs text-muted-foreground">Le 1ᵉʳ remplit le bloc « Enseignant(e) », le 2ᵉ le bloc « Direction » de la fiche de présence.</p>
              </div>
            </div>
            {!addingSignatory && (
              <button
                type="button"
                onClick={() => setAddingSignatory(true)}
                className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </button>
            )}
          </div>

          {/* Liste des signataires */}
          <div className="space-y-2">
            {signatories.length === 0 && !addingSignatory && (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <Sparkles className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">Aucun signataire configuré</p>
                <p className="mt-1 text-xs text-muted-foreground">Ajoute « Teacher Khati » pour signer automatiquement tes documents.</p>
              </div>
            )}

            {signatories.map((s, index) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {SLOT_LABEL[index] ?? 'Hors document'}
                </span>
                <div className="flex h-12 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
                  {s.signatureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.signatureUrl} alt={`Signature de ${s.label}`} className="h-full w-full object-contain p-1" />
                  ) : (
                    <PenLine className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{s.label}</p>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => replaceInputRefs.current[s.id]?.click()}
                    disabled={busySignatoryId === s.id}
                    className="btn-press inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition hover:bg-accent disabled:opacity-60"
                  >
                    {busySignatoryId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    {s.signatureUrl ? 'Remplacer' : 'Uploader'}
                  </button>
                  <input
                    ref={(el) => { replaceInputRefs.current[s.id] = el }}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void replaceSignature(s.id, f); e.target.value = '' }}
                  />
                  <button
                    type="button"
                    onClick={() => void removeSignatory(s.id, s.label)}
                    disabled={busySignatoryId === s.id}
                    className="btn-press rounded-lg border border-red-200 p-1.5 text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:hover:bg-red-950/30"
                    aria-label={`Supprimer ${s.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Formulaire d'ajout */}
            {addingSignatory && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Nouveau signataire</p>
                  <button type="button" onClick={() => { setAddingSignatory(false); setNewLabel(''); setNewFile(null) }} aria-label="Annuler">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="ex. Teacher Khati, Directeur, Directrice…"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => newSignatoryFileRef.current?.click()}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition',
                      newFile ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-border hover:bg-accent'
                    )}
                  >
                    <Upload className="h-4 w-4" />
                    {newFile ? newFile.name : 'Signature (optionnel)'}
                  </button>
                  <input
                    ref={newSignatoryFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void createSignatory()}
                  disabled={savingNew}
                  className="btn-press mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
                >
                  {savingNew ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Ajouter
                </button>
              </div>
            )}
          </div>
        </section>
      </FadeIn>
    </div>
  )
}
