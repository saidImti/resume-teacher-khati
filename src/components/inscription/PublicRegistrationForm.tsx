'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, ChevronRight, HeartPulse, Loader2, LockKeyhole, MapPin, ShieldCheck, Sparkles, User, Users } from 'lucide-react'
import type { Level, Site } from '@/types'

interface Props {
  token: string
  sites: Site[]
  levels: Level[]
}

type Step = 'student' | 'school' | 'family' | 'security'

const STEPS: Array<{ id: Step; label: string; icon: typeof User }> = [
  { id: 'student', label: 'Élève', icon: User },
  { id: 'school', label: 'Parcours', icon: MapPin },
  { id: 'family', label: 'Famille', icon: Users },
  { id: 'security', label: 'Santé', icon: HeartPulse },
]

const TODAY = new Date().toISOString().split('T')[0]!

export function PublicRegistrationForm({ token, sites, levels }: Props) {
  const [step, setStep] = useState<Step>('student')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ tariffText: string; parentMessage: string } | null>(null)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'M' as 'M' | 'F' | 'autre',
    site_id: sites[0]?.id ?? '',
    level_id: '',
    parent1_first: '',
    parent1_last: '',
    parent1_phone: '',
    parent1_email: '',
    parent1_whatsapp: '',
    address: '',
    city: '',
    postal_code: '',
    emergency_name: '',
    emergency_phone: '',
    emergency_relation: '',
    medical_notes: '',
    photo_consent: false,
  })

  const index = STEPS.findIndex((item) => item.id === step)
  const selectedSite = sites.find((site) => site.id === form.site_id)
  const selectedLevel = levels.find((level) => level.id === form.level_id)
  const completion = useMemo(() => {
    const checks = [
      Boolean(form.first_name && form.last_name),
      Boolean(form.site_id),
      Boolean(form.parent1_first && form.parent1_last && form.parent1_phone),
      Boolean(form.emergency_phone || form.medical_notes || form.photo_consent),
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [form])

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function next() {
    const nextStep = STEPS[index + 1]?.id
    if (nextStep) {
      setStep(nextStep)
      setError(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  async function submit() {
    if (!form.first_name || !form.last_name || !form.site_id || !form.parent1_first || !form.parent1_last || !form.parent1_phone) {
      setError('Merci de compléter le nom de l’élève, le site et le contact parent principal.')
      return
    }
    if (form.date_of_birth && (form.date_of_birth < '1900-01-01' || form.date_of_birth > TODAY)) {
      setError('La date de naissance n’est pas cohérente.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/public-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          student: {
            first_name: form.first_name,
            last_name: form.last_name,
            date_of_birth: form.date_of_birth,
            gender: form.gender,
            site_id: form.site_id,
            level_id: form.level_id,
            medical_notes: form.medical_notes,
            photo_consent: form.photo_consent,
          },
          family: {
            parent1_first: form.parent1_first,
            parent1_last: form.parent1_last,
            parent1_phone: form.parent1_phone,
            parent1_email: form.parent1_email,
            parent1_whatsapp: form.parent1_whatsapp || form.parent1_phone,
            address: form.address,
            city: form.city,
            postal_code: form.postal_code,
            emergency_name: form.emergency_name,
            emergency_phone: form.emergency_phone,
            emergency_relation: form.emergency_relation,
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Inscription impossible')
      setSuccess({ tariffText: data.tariffText, parentMessage: data.parentMessage })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible')
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#080806] px-4 py-10 text-[#f8f3e7]">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-emerald-400/30 bg-[#141412] p-8 text-center shadow-2xl">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-[#c9a84c]">Inscription reçue</p>
          <h1 className="mt-3 text-3xl font-semibold">Merci, votre dossier est transmis</h1>
          <p className="mt-4 whitespace-pre-line rounded-2xl border border-[#c9a84c]/20 bg-[#1c1c19] p-5 text-left text-sm leading-7 text-[#d9d1c0]">
            {success.parentMessage}
          </p>
          <p className="mt-4 rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            {success.tariffText}
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#080806] text-[#f8f3e7]">
      <header className="sticky top-0 z-20 border-b border-[#c9a84c]/20 bg-[#080806]/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="font-serif text-lg font-semibold text-[#c9a84c]">Teacher Khati</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#8f8878]">Inscription sécurisée</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#c9a84c]/25 px-3 py-2 text-xs text-[#cfc5b0]">
            <LockKeyhole className="h-3.5 w-3.5 text-[#c9a84c]" />
            QR privé
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[2rem] border border-[#2e2d28] bg-[#141412] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[#c9a84c]">Dossier premium</p>
            <h1 className="mt-3 font-serif text-3xl leading-tight">Inscrire votre enfant avec confiance</h1>
            <p className="mt-3 text-sm leading-7 text-[#a8a49a]">
              Un formulaire clair, sécurisé et transmis directement à Teacher Khati pour confirmer le bon site, le niveau et le tarif.
            </p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#24231f]">
              <div className="h-full rounded-full bg-[#c9a84c] transition-all" style={{ width: `${completion}%` }} />
            </div>
            <p className="mt-2 text-xs text-[#8f8878]">{completion}% complété</p>
          </div>

          <div className="rounded-[2rem] border border-[#2e2d28] bg-[#141412] p-4">
            {STEPS.map((item, itemIndex) => {
              const Icon = item.icon
              const active = item.id === step
              const done = itemIndex < index
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStep(item.id)}
                  className={`mb-2 flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition last:mb-0 ${
                    active ? 'border-[#c9a84c]/60 bg-[#c9a84c]/10' : 'border-transparent text-[#a8a49a] hover:border-[#2e2d28]'
                  }`}
                >
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${active ? 'bg-[#c9a84c] text-black' : done ? 'bg-emerald-500 text-white' : 'bg-[#1c1c19]'}`}>
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </span>
                  <span className="font-semibold">{item.label}</span>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="rounded-[2rem] border border-[#2e2d28] bg-[#141412] shadow-2xl">
          <div className="border-b border-[#2e2d28] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c9a84c]">
              Étape {index + 1} sur {STEPS.length}
            </p>
            <h2 className="mt-2 font-serif text-3xl">{titleFor(step)}</h2>
            <p className="mt-2 text-sm leading-7 text-[#a8a49a]">{helpFor(step)}</p>
          </div>

          <div className="space-y-5 p-6">
            {error && (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                {error}
              </div>
            )}

            {step === 'student' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Prénom de l’enfant" required><input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} className={inputCls} /></Field>
                <Field label="Nom de famille" required><input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} className={inputCls} /></Field>
                <Field label="Date de naissance"><input type="date" min="1900-01-01" max={TODAY} value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} className={inputCls} /></Field>
                <Field label="Genre">
                  <select value={form.gender} onChange={(e) => set('gender', e.target.value as 'M' | 'F' | 'autre')} className={inputCls}>
                    <option value="M">Garçon</option>
                    <option value="F">Fille</option>
                    <option value="autre">Autre / non précisé</option>
                  </select>
                </Field>
              </div>
            )}

            {step === 'school' && (
              <div className="space-y-5">
                <Field label="Site souhaité" required>
                  <select value={form.site_id} onChange={(e) => set('site_id', e.target.value)} className={inputCls}>
                    {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
                  </select>
                </Field>
                <div>
                  <p className="mb-3 text-sm font-semibold">Niveau souhaité</p>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    {levels.map((level) => (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => set('level_id', level.id)}
                        className={`rounded-2xl border p-4 text-center transition ${
                          form.level_id === level.id
                            ? 'border-[#c9a84c] bg-[#c9a84c]/12 text-[#f8f3e7] shadow-lg shadow-[#c9a84c]/10'
                            : 'border-[#2e2d28] bg-[#1c1c19] text-[#a8a49a] hover:border-[#c9a84c]/50'
                        }`}
                      >
                        <span className="text-2xl">{level.emoji}</span>
                        <span className="mt-2 block text-sm font-semibold">{level.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#c9a84c]/20 bg-[#c9a84c]/10 p-4 text-sm text-[#d9d1c0]">
                  Site sélectionné : <strong>{selectedSite?.name ?? 'à choisir'}</strong>
                  {selectedLevel && <> · Niveau : <strong>{selectedLevel.emoji} {selectedLevel.name}</strong></>}
                </div>
              </div>
            )}

            {step === 'family' && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Prénom parent" required><input value={form.parent1_first} onChange={(e) => set('parent1_first', e.target.value)} className={inputCls} /></Field>
                  <Field label="Nom parent" required><input value={form.parent1_last} onChange={(e) => set('parent1_last', e.target.value)} className={inputCls} /></Field>
                  <Field label="Téléphone" required><input inputMode="tel" value={form.parent1_phone} onChange={(e) => set('parent1_phone', e.target.value)} placeholder="+33 6 12 34 56 78" className={inputCls} /></Field>
                  <Field label="WhatsApp"><input inputMode="tel" value={form.parent1_whatsapp} onChange={(e) => set('parent1_whatsapp', e.target.value)} placeholder="si différent" className={inputCls} /></Field>
                </div>
                <Field label="Email"><input type="email" value={form.parent1_email} onChange={(e) => set('parent1_email', e.target.value)} className={inputCls} /></Field>
                <div className="grid gap-4 sm:grid-cols-[1.3fr_.8fr_.6fr]">
                  <Field label="Adresse"><input value={form.address} onChange={(e) => set('address', e.target.value)} className={inputCls} /></Field>
                  <Field label="Ville"><input value={form.city} onChange={(e) => set('city', e.target.value)} className={inputCls} /></Field>
                  <Field label="Code postal"><input value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} className={inputCls} /></Field>
                </div>
              </div>
            )}

            {step === 'security' && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Contact d’urgence"><input value={form.emergency_name} onChange={(e) => set('emergency_name', e.target.value)} className={inputCls} /></Field>
                  <Field label="Téléphone urgence"><input inputMode="tel" value={form.emergency_phone} onChange={(e) => set('emergency_phone', e.target.value)} className={inputCls} /></Field>
                </div>
                <Field label="Lien avec l’enfant"><input value={form.emergency_relation} onChange={(e) => set('emergency_relation', e.target.value)} placeholder="Père, mère, tante, tuteur..." className={inputCls} /></Field>
                <Field label="Informations médicales importantes">
                  <textarea value={form.medical_notes} onChange={(e) => set('medical_notes', e.target.value)} rows={5} placeholder="Allergies, asthme, consignes particulières..." className={inputCls} />
                </Field>
                <label className="flex items-start gap-3 rounded-2xl border border-[#2e2d28] bg-[#1c1c19] p-4">
                  <input type="checkbox" checked={form.photo_consent} onChange={(e) => set('photo_consent', e.target.checked)} className="mt-1 h-4 w-4" />
                  <span>
                    <span className="block font-semibold">J’autorise les photos/vidéos pédagogiques</span>
                    <span className="block text-sm text-[#a8a49a]">Utilisées uniquement dans le cadre de l’école et de la communication Teacher Khati.</span>
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-[#2e2d28] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-[#8f8878]">
              <ShieldCheck className="h-4 w-4 text-[#c9a84c]" />
              Données transmises de façon sécurisée.
            </div>
            {index < STEPS.length - 1 ? (
              <button type="button" onClick={next} className={primaryBtn}>
                Continuer <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={saving} className={primaryBtn}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Envoyer l’inscription
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#b8b0a0]">
        {label}{required && <span className="text-[#c9a84c]"> *</span>}
      </span>
      {children}
    </label>
  )
}

function titleFor(step: Step) {
  return {
    student: 'Qui inscrit-on ?',
    school: 'Quel parcours choisir ?',
    family: 'Qui contacter ?',
    security: 'Santé et autorisations',
  }[step]
}

function helpFor(step: Step) {
  return {
    student: 'Quelques informations simples pour identifier l’enfant correctement.',
    school: 'Le site et le niveau permettent d’attribuer le bon tarif et le bon suivi.',
    family: 'Ces coordonnées servent à confirmer l’inscription et envoyer les informations importantes.',
    security: 'Dernières informations utiles pour accueillir l’enfant dans de bonnes conditions.',
  }[step]
}

const inputCls = 'w-full rounded-xl border border-[#2e2d28] bg-[#1c1c19] px-4 py-3 text-sm text-[#f8f3e7] outline-none transition placeholder:text-[#6f685c] focus:border-[#c9a84c]/70 focus:ring-4 focus:ring-[#c9a84c]/10'
const primaryBtn = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#c9a84c] px-5 py-3 text-sm font-bold text-black shadow-lg shadow-[#c9a84c]/15 transition hover:bg-[#d8b85d] disabled:cursor-not-allowed disabled:opacity-60'
