'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  HeartPulse,
  Loader2,
  MapPin,
  Save,
  Shield,
  Sparkles,
  User,
  Users,
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Site, Level, Family, Student } from '@/types'

interface Props {
  mode: 'create' | 'edit'
  sites: Site[]
  levels: Level[]
  existingFamilies: Family[]
  student?: Student
}

type FormData = {
  first_name: string
  last_name: string
  date_of_birth: string
  gender: 'M' | 'F' | 'autre'
  photo_consent: boolean
  site_id: string
  level_id: string
  status: string
  enrollment_date: string
  family_mode: 'existing' | 'new'
  family_id: string
  parent1_first: string
  parent1_last: string
  parent1_phone: string
  parent1_email: string
  parent1_whatsapp: string
  parent2_first: string
  parent2_last: string
  parent2_phone: string
  parent2_email: string
  address: string
  city: string
  postal_code: string
  emergency_name: string
  emergency_phone: string
  emergency_relation: string
  medical_notes: string
  notes: string
}

const INIT: FormData = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: 'M',
  photo_consent: false,
  site_id: '',
  level_id: '',
  status: 'active',
  enrollment_date: new Date().toISOString().split('T')[0]!,
  family_mode: 'new',
  family_id: '',
  parent1_first: '',
  parent1_last: '',
  parent1_phone: '',
  parent1_email: '',
  parent1_whatsapp: '',
  parent2_first: '',
  parent2_last: '',
  parent2_phone: '',
  parent2_email: '',
  address: '',
  city: '',
  postal_code: '',
  emergency_name: '',
  emergency_phone: '',
  emergency_relation: '',
  medical_notes: '',
  notes: '',
}

const SECTIONS = [
  { id: 'identity', label: 'Identité', title: 'Profil élève', icon: User },
  { id: 'school', label: 'Scolarité', title: 'Parcours', icon: MapPin },
  { id: 'family', label: 'Famille', title: 'Contacts', icon: Users },
  { id: 'emergency', label: 'Urgence', title: 'Santé', icon: Shield },
] as const

type SectionId = typeof SECTIONS[number]['id']

export function StudentForm({ mode, sites, levels, existingFamilies, student }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormData>(student ? formFromStudent(student) : INIT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [section, setSection] = useState<SectionId>('identity')

  const activeIndex = SECTIONS.findIndex((item) => item.id === section)
  const selectedSite = sites.find((site) => site.id === form.site_id)
  const selectedLevel = levels.find((level) => level.id === form.level_id)

  const completion = useMemo(() => {
    const items = [
      Boolean(form.first_name && form.last_name),
      Boolean(form.site_id),
      form.family_mode === 'existing' ? Boolean(form.family_id) : Boolean(form.parent1_phone || form.parent1_email),
      Boolean(form.emergency_phone || form.medical_notes),
    ]
    return Math.round((items.filter(Boolean).length / items.length) * 100)
  }, [form])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function goNext() {
    if (activeIndex < SECTIONS.length - 1) {
      setSection(SECTIONS[activeIndex + 1]!.id)
      setError(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name || !form.last_name || !form.site_id) {
      setError('Prénom, nom et site sont obligatoires.')
      setSection(!form.first_name || !form.last_name ? 'identity' : 'school')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      let familyId = form.family_id
      if (form.family_mode === 'new') {
        const { data: fam, error: famErr } = await supabase
          .from('families')
          .insert({
            user_id: user.id,
            parent1_first: form.parent1_first || form.last_name,
            parent1_last: form.parent1_last || form.last_name,
            parent1_phone: form.parent1_phone || null,
            parent1_email: form.parent1_email || null,
            parent1_whatsapp: form.parent1_whatsapp || null,
            parent2_first: form.parent2_first || null,
            parent2_last: form.parent2_last || null,
            parent2_phone: form.parent2_phone || null,
            parent2_email: form.parent2_email || null,
            address: form.address || null,
            city: form.city || null,
            postal_code: form.postal_code || null,
            primary_site_id: form.site_id || null,
          })
          .select()
          .single()
        if (famErr) throw famErr
        familyId = fam.id
      }

      const payload = {
        user_id: user.id,
        family_id: familyId || null,
        first_name: form.first_name,
        last_name: form.last_name,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender,
        photo_consent: form.photo_consent,
        site_id: form.site_id || null,
        level_id: form.level_id || null,
        status: form.status,
        enrollment_date: form.enrollment_date,
        emergency_name: form.emergency_name || null,
        emergency_phone: form.emergency_phone || null,
        emergency_relation: form.emergency_relation || null,
        medical_notes: form.medical_notes || null,
        notes: form.notes || null,
      }

      if (mode === 'create') {
        const { data: savedStudent, error: studentErr } = await supabase.from('students').insert(payload).select().single()
        if (studentErr) throw studentErr
        router.push(`/eleves/${savedStudent.id}`)
      } else if (student) {
        const { error: studentErr } = await supabase.from('students').update(payload).eq('id', student.id)
        if (studentErr) throw studentErr
        router.push(`/eleves/${student.id}`)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/80 px-4 py-5 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-press rounded-xl border border-border bg-background p-2.5 text-muted-foreground transition hover:text-foreground"
              aria-label="Retour"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
                <Sparkles className="h-3.5 w-3.5" />
                Dossier élève premium
              </p>
              <h1 className="truncate text-2xl font-semibold text-foreground">
                {mode === 'create' ? 'Inscrire un élève' : 'Modifier le profil'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Une fiche claire pour piloter la scolarité, la famille et les urgences au même endroit.
              </p>
            </div>
          </div>
          <div className="hidden rounded-2xl border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-right sm:block">
            <p className="text-xs font-medium text-muted-foreground">Fiche complétée</p>
            <p className="text-2xl font-semibold text-violet-500">{completion}%</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Étapes</span>
              <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-500">
                {activeIndex + 1}/{SECTIONS.length}
              </span>
            </div>
            <div className="space-y-2">
              {SECTIONS.map((item, index) => {
                const Icon = item.icon
                const active = section === item.id
                const done = index < activeIndex
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSection(item.id)
                      setError(null)
                    }}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      active
                        ? 'border-violet-500/50 bg-violet-500/10 text-foreground shadow-sm'
                        : 'border-transparent text-muted-foreground hover:border-border hover:bg-background hover:text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`grid h-9 w-9 place-items-center rounded-xl ${active ? 'bg-violet-600 text-white' : 'bg-background text-muted-foreground'}`}>
                        {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{item.label}</span>
                        <span className="block text-xs">{item.title}</span>
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Résumé rapide</p>
            <div className="mt-4 space-y-3 text-sm">
              <SummaryRow label="Élève" value={[form.first_name, form.last_name].filter(Boolean).join(' ') || 'À renseigner'} />
              <SummaryRow label="Site" value={selectedSite?.name ?? 'À choisir'} />
              <SummaryRow label="Niveau" value={selectedLevel ? `${selectedLevel.emoji} ${selectedLevel.name}` : 'Optionnel'} />
              <SummaryRow label="Statut" value={statusLabel(form.status)} />
            </div>
          </div>
        </aside>

        <main className="space-y-5">
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-300/60 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {sites.length === 0 && (
            <div className="rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Aucun site actif disponible.</p>
                    <p className="text-amber-800/80 dark:text-amber-100/80">
                      Crée un site avant d'inscrire un élève. Le champ site est obligatoire.
                    </p>
                  </div>
                </div>
                <Link
                  href="/settings/sites"
                  className="rounded-xl bg-amber-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-amber-700"
                >
                  Configurer les sites
                </Link>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-gradient-to-r from-violet-500/10 via-transparent to-cyan-500/10 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
                    {SECTIONS[activeIndex]?.label}
                  </p>
                  <h2 className="text-xl font-semibold text-foreground">{SECTIONS[activeIndex]?.title}</h2>
                </div>
                <p className="max-w-sm text-sm text-muted-foreground">{sectionHelp(section)}</p>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {section === 'identity' && (
                <div className="space-y-6">
                  <SectionIntro
                    icon={User}
                    title="Identité de l'élève"
                    text="Les informations essentielles pour reconnaître l'élève rapidement dans les listes, les groupes et les fiches."
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Prénom" required>
                      <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="ex. Emma" className={inputCls} required />
                    </Field>
                    <Field label="Nom" required>
                      <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="ex. Martin" className={inputCls} required />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Date de naissance">
                      <input type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Genre">
                      <select value={form.gender} onChange={(e) => set('gender', e.target.value as 'M' | 'F' | 'autre')} className={selectCls}>
                      <option value="M">Garçon</option>
                        <option value="F">Fille</option>
                        <option value="autre">Autre</option>
                      </select>
                    </Field>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background p-4 transition hover:border-violet-400/60">
                    <input
                      type="checkbox"
                      checked={form.photo_consent}
                      onChange={(e) => set('photo_consent', e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-border text-violet-600 focus:ring-violet-500"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-foreground">Autorisation photo / vidéo</span>
                      <span className="block text-sm text-muted-foreground">Activée uniquement si les parents ont donné leur accord.</span>
                    </span>
                  </label>
                </div>
              )}

              {section === 'school' && (
                <div className="space-y-6">
                  <SectionIntro
                    icon={MapPin}
                    title="Scolarité et rattachement"
                    text="Le site est obligatoire : il alimente les groupes, les statistiques, le planning et les finances."
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Site" required hint={sites.length === 0 ? 'Aucun site actif trouvé.' : 'Choisis le lieu principal de cours.'}>
                      <select value={form.site_id} onChange={(e) => set('site_id', e.target.value)} className={selectCls} required disabled={sites.length === 0}>
                        <option value="">Choisir un site</option>
                        {sites.map((site) => (
                          <option key={site.id} value={site.id}>{site.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Niveau" hint="Lisible en clair, même dans le menu ouvert.">
                      <select value={form.level_id} onChange={(e) => set('level_id', e.target.value)} className={selectCls}>
                        <option value="">Choisir un niveau</option>
                        {levels.map((level) => (
                          <option key={level.id} value={level.id}>{level.emoji} {level.name}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Statut">
                      <select value={form.status} onChange={(e) => set('status', e.target.value)} className={selectCls}>
                        <option value="trial">En essai</option>
                        <option value="active">Actif</option>
                        <option value="suspended">Suspendu</option>
                        <option value="departed">Parti</option>
                      </select>
                    </Field>
                    <Field label="Date d'inscription">
                      <input type="date" value={form.enrollment_date} onChange={(e) => set('enrollment_date', e.target.value)} className={inputCls} />
                    </Field>
                  </div>

                  <Field label="Notes internes">
                    <textarea
                      value={form.notes}
                      onChange={(e) => set('notes', e.target.value)}
                      rows={4}
                      placeholder="Progression, comportement, objectifs, points d’attention..."
                      className={inputCls}
                    />
                  </Field>
                </div>
              )}

              {section === 'family' && (
                <div className="space-y-6">
                  <SectionIntro
                    icon={Users}
                    title="Famille et contacts"
                    text="Rattache une famille existante ou crée un contact propre pour les messages, factures et urgences."
                  />

                  {existingFamilies.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ModeButton active={form.family_mode === 'new'} onClick={() => set('family_mode', 'new')} title="Nouvelle famille" text="Création d'un nouveau foyer." />
                      <ModeButton active={form.family_mode === 'existing'} onClick={() => set('family_mode', 'existing')} title="Famille existante" text="Rattacher à un contact déjà créé." />
                    </div>
                  )}

                  {form.family_mode === 'existing' ? (
                    <Field label="Famille">
                      <select value={form.family_id} onChange={(e) => set('family_id', e.target.value)} className={selectCls}>
                        <option value="">Choisir une famille</option>
                        {existingFamilies.map((family) => (
                          <option key={family.id} value={family.id}>
                            {family.parent1_first} {family.parent1_last}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : (
                    <div className="space-y-6">
                      <Fieldset title="Parent principal">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Prénom"><input value={form.parent1_first} onChange={(e) => set('parent1_first', e.target.value)} placeholder="Prénom" className={inputCls} /></Field>
                          <Field label="Nom"><input value={form.parent1_last} onChange={(e) => set('parent1_last', e.target.value)} placeholder="Nom" className={inputCls} /></Field>
                          <Field label="Téléphone"><input value={form.parent1_phone} onChange={(e) => set('parent1_phone', e.target.value)} placeholder="+33 6 ..." className={inputCls} /></Field>
                          <Field label="WhatsApp"><input value={form.parent1_whatsapp} onChange={(e) => set('parent1_whatsapp', e.target.value)} placeholder="+33 6 ..." className={inputCls} /></Field>
                        </div>
                        <Field label="Email"><input type="email" value={form.parent1_email} onChange={(e) => set('parent1_email', e.target.value)} placeholder="parent@email.com" className={inputCls} /></Field>
                      </Fieldset>

                      <Fieldset title="Parent secondaire">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Prénom"><input value={form.parent2_first} onChange={(e) => set('parent2_first', e.target.value)} placeholder="Prénom" className={inputCls} /></Field>
                          <Field label="Nom"><input value={form.parent2_last} onChange={(e) => set('parent2_last', e.target.value)} placeholder="Nom" className={inputCls} /></Field>
                          <Field label="Téléphone"><input value={form.parent2_phone} onChange={(e) => set('parent2_phone', e.target.value)} placeholder="+33 6 ..." className={inputCls} /></Field>
                          <Field label="Email"><input type="email" value={form.parent2_email} onChange={(e) => set('parent2_email', e.target.value)} placeholder="parent2@email.com" className={inputCls} /></Field>
                        </div>
                      </Fieldset>

                      <Fieldset title="Adresse">
                        <Field label="Rue"><input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="15 rue des Lilas" className={inputCls} /></Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Ville"><input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Maisons-Alfort" className={inputCls} /></Field>
                          <Field label="Code postal"><input value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} placeholder="94700" className={inputCls} /></Field>
                        </div>
                      </Fieldset>
                    </div>
                  )}
                </div>
              )}

              {section === 'emergency' && (
                <div className="space-y-6">
                  <SectionIntro
                    icon={HeartPulse}
                    title="Urgence et santé"
                    text="Des informations visibles vite, mais séparées du reste pour garder le dossier propre."
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Contact d'urgence">
                      <input value={form.emergency_name} onChange={(e) => set('emergency_name', e.target.value)} placeholder="Nom du contact" className={inputCls} />
                    </Field>
                    <Field label="Lien de parenté">
                      <input value={form.emergency_relation} onChange={(e) => set('emergency_relation', e.target.value)} placeholder="Grand-mère, oncle..." className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Téléphone d'urgence">
                    <input value={form.emergency_phone} onChange={(e) => set('emergency_phone', e.target.value)} placeholder="+33 6 ..." className={inputCls} />
                  </Field>
                  <Field label="Notes médicales">
                    <textarea
                      value={form.medical_notes}
                      onChange={(e) => set('medical_notes', e.target.value)}
                      rows={5}
                      placeholder="Allergies, asthme, besoins particuliers, consignes confidentielles..."
                      className={inputCls}
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-press rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background"
            >
              Annuler
            </button>
            <div className="flex flex-col gap-3 sm:flex-row">
              {activeIndex < SECTIONS.length - 1 && (
                <button
                  type="button"
                  onClick={goNext}
                  className="btn-press inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/40 px-5 py-3 text-sm font-semibold text-violet-500 transition hover:bg-violet-500/10"
                >
                  Suivant <ArrowRight className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={saving || sites.length === 0}
                className="btn-press inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {mode === 'create' ? "Inscrire l'élève" : 'Enregistrer'}
              </button>
            </div>
          </div>
        </main>
      </form>
    </div>
  )
}

function Field({ label, children, required, hint }: { label: string; children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-foreground">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-background/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}

function SectionIntro({ icon: Icon, title, text }: { icon: typeof User; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-white">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}

function ModeButton({ active, onClick, title, text }: { active: boolean; onClick: () => void; title: string; text: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? 'border-violet-500/50 bg-violet-500/10 text-foreground'
          : 'border-border bg-background text-muted-foreground hover:border-violet-400/60 hover:text-foreground'
      }`}
    >
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-1 block text-xs">{text}</span>
    </button>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    trial: 'En essai',
    active: 'Actif',
    suspended: 'Suspendu',
    departed: 'Parti',
  }
  return labels[status] ?? status
}

function sectionHelp(section: SectionId) {
  const help: Record<SectionId, string> = {
    identity: 'Commence par le nom : le reste du dossier peut être complété ensuite.',
    school: 'Site obligatoire, niveau optionnel mais recommandé pour les groupes et le suivi.',
    family: 'Un contact propre rend WhatsApp, factures et urgences beaucoup plus simples.',
    emergency: 'Les informations sensibles restent dans une zone séparée et facile à retrouver.',
  }
  return help[section]
}

const inputCls = 'w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15 disabled:cursor-not-allowed disabled:opacity-60'
const selectCls = `${inputCls} cursor-pointer`

function formFromStudent(s: Student): FormData {
  return {
    ...INIT,
    first_name: s.first_name,
    last_name: s.last_name,
    date_of_birth: s.date_of_birth ?? '',
    gender: s.gender,
    photo_consent: s.photo_consent,
    site_id: s.site_id ?? '',
    level_id: s.level_id ?? '',
    status: s.status,
    enrollment_date: s.enrollment_date,
    emergency_name: s.emergency_name ?? '',
    emergency_phone: s.emergency_phone ?? '',
    emergency_relation: s.emergency_relation ?? '',
    medical_notes: s.medical_notes ?? '',
    notes: s.notes ?? '',
    family_mode: s.family_id ? 'existing' : 'new',
    family_id: s.family_id ?? '',
    parent1_first: s.family?.parent1_first ?? '',
    parent1_last: s.family?.parent1_last ?? '',
    parent1_phone: s.family?.parent1_phone ?? '',
    parent1_email: s.family?.parent1_email ?? '',
    parent1_whatsapp: s.family?.parent1_whatsapp ?? '',
    parent2_first: s.family?.parent2_first ?? '',
    parent2_last: s.family?.parent2_last ?? '',
    parent2_phone: s.family?.parent2_phone ?? '',
    parent2_email: s.family?.parent2_email ?? '',
    address: s.family?.address ?? '',
    city: s.family?.city ?? '',
    postal_code: s.family?.postal_code ?? '',
  }
}
