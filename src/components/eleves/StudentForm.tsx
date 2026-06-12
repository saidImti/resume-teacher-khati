'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, MapPin, Shield,
  ChevronLeft, Save, Loader2, AlertCircle, Users,
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
  // Identité
  first_name: string
  last_name: string
  date_of_birth: string
  gender: 'M' | 'F' | 'autre'
  photo_consent: boolean
  // Scolarité
  site_id: string
  level_id: string
  status: string
  enrollment_date: string
  // Famille
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
  // Adresse
  address: string
  city: string
  postal_code: string
  // Urgence & santé
  emergency_name: string
  emergency_phone: string
  emergency_relation: string
  medical_notes: string
  notes: string
}

const INIT: FormData = {
  first_name: '', last_name: '', date_of_birth: '', gender: 'M', photo_consent: false,
  site_id: '', level_id: '', status: 'active', enrollment_date: new Date().toISOString().split('T')[0]!,
  family_mode: 'new',
  family_id: '',
  parent1_first: '', parent1_last: '', parent1_phone: '', parent1_email: '', parent1_whatsapp: '',
  parent2_first: '', parent2_last: '', parent2_phone: '', parent2_email: '',
  address: '', city: '', postal_code: '',
  emergency_name: '', emergency_phone: '', emergency_relation: '',
  medical_notes: '', notes: '',
}

const SECTIONS = [
  { id: 'identity',   label: 'Identité',   icon: User },
  { id: 'school',     label: 'Scolarité',  icon: MapPin },
  { id: 'family',     label: 'Famille',    icon: Users },
  { id: 'emergency',  label: 'Urgence',    icon: Shield },
]

export function StudentForm({ mode, sites, levels, existingFamilies, student }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormData>(student ? formFromStudent(student) : INIT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [section, setSection] = useState('identity')

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name || !form.last_name || !form.site_id) {
      setError('Prénom, nom et site sont obligatoires.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      // 1. Famille
      let familyId = form.family_id
      if (form.family_mode === 'new') {
        const { data: fam, error: famErr } = await supabase
          .from('families')
          .insert({
            user_id: user.id,
            parent1_first: form.parent1_first || form.last_name,
            parent1_last:  form.parent1_last  || form.last_name,
            parent1_phone: form.parent1_phone  || null,
            parent1_email: form.parent1_email  || null,
            parent1_whatsapp: form.parent1_whatsapp || null,
            parent2_first: form.parent2_first || null,
            parent2_last:  form.parent2_last  || null,
            parent2_phone: form.parent2_phone  || null,
            parent2_email: form.parent2_email  || null,
            address:     form.address     || null,
            city:        form.city        || null,
            postal_code: form.postal_code || null,
            primary_site_id: form.site_id || null,
          })
          .select()
          .single()
        if (famErr) throw famErr
        familyId = fam.id
      }

      // 2. Élève
      const payload = {
        user_id:          user.id,
        family_id:        familyId || null,
        first_name:       form.first_name,
        last_name:        form.last_name,
        date_of_birth:    form.date_of_birth || null,
        gender:           form.gender,
        photo_consent:    form.photo_consent,
        site_id:          form.site_id   || null,
        level_id:         form.level_id  || null,
        status:           form.status,
        enrollment_date:  form.enrollment_date,
        emergency_name:   form.emergency_name   || null,
        emergency_phone:  form.emergency_phone  || null,
        emergency_relation: form.emergency_relation || null,
        medical_notes:    form.medical_notes || null,
        notes:            form.notes || null,
      }

      if (mode === 'create') {
        const { data: s, error: sErr } = await supabase.from('students').insert(payload).select().single()
        if (sErr) throw sErr
        router.push(`/eleves/${s.id}`)
      } else if (student) {
        const { error: sErr } = await supabase.from('students').update(payload).eq('id', student.id)
        if (sErr) throw sErr
        router.push(`/eleves/${student.id}`)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5">
        <div className="mx-auto max-w-3xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-[var(--color-text)]">
                {mode === 'create' ? 'Inscrire un élève' : 'Modifier le profil'}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)]">Remplissez les informations de l'élève</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl w-full px-6 py-6">
        {/* Tabs sections */}
        <div className="flex gap-1 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] p-1 mb-6">
          {SECTIONS.map(s => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all ${
                  section === s.id
                    ? 'bg-[var(--color-surface)] text-violet-600 shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {s.label}
              </button>
            )
          })}
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── IDENTITÉ ── */}
          {section === 'identity' && (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-5">
              <h2 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
                <User className="h-4 w-4 text-violet-500" />
                Identité de l'élève
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Prénom *" required>
                  <input
                    value={form.first_name}
                    onChange={e => set('first_name', e.target.value)}
                    placeholder="ex. Emma"
                    className={inputCls}
                    required
                  />
                </Field>
                <Field label="Nom *" required>
                  <input
                    value={form.last_name}
                    onChange={e => set('last_name', e.target.value)}
                    placeholder="ex. Martin"
                    className={inputCls}
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Date de naissance">
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={e => set('date_of_birth', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Genre">
                  <select value={form.gender} onChange={e => set('gender', e.target.value as 'M' | 'F' | 'autre')} className={inputCls}>
                    <option value="M">Garçon</option>
                    <option value="F">Fille</option>
                    <option value="autre">Autre</option>
                  </select>
                </Field>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] p-4">
                <input
                  id="photo_consent"
                  type="checkbox"
                  checked={form.photo_consent}
                  onChange={e => set('photo_consent', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <label htmlFor="photo_consent" className="text-sm text-[var(--color-text)] cursor-pointer">
                  Autorisation photo / vidéo accordée par les parents
                </label>
              </div>
            </div>
          )}

          {/* ── SCOLARITÉ ── */}
          {section === 'school' && (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-5">
              <h2 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
                <MapPin className="h-4 w-4 text-violet-500" />
                Informations scolaires
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Site *" required>
                  <select value={form.site_id} onChange={e => set('site_id', e.target.value)} className={inputCls} required>
                    <option value="">— Choisir un site —</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="Niveau">
                  <select value={form.level_id} onChange={e => set('level_id', e.target.value)} className={inputCls}>
                    <option value="">— Choisir un niveau —</option>
                    {levels.map(l => <option key={l.id} value={l.id}>{l.emoji} {l.name}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Statut">
                  <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                    <option value="trial">En essai</option>
                    <option value="active">Actif</option>
                    <option value="suspended">Suspendu</option>
                    <option value="departed">Parti</option>
                  </select>
                </Field>
                <Field label="Date d'inscription">
                  <input
                    type="date"
                    value={form.enrollment_date}
                    onChange={e => set('enrollment_date', e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Notes internes">
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  rows={3}
                  placeholder="Notes sur l'élève (comportement, progression…)"
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {/* ── FAMILLE ── */}
          {section === 'family' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-5">
                <h2 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-500" />
                  Rattachement famille
                </h2>

                {existingFamilies.length > 0 && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => set('family_mode', 'new')}
                      className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all ${
                        form.family_mode === 'new'
                          ? 'border-violet-400 bg-violet-50 text-violet-700'
                          : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-violet-300'
                      }`}
                    >
                      Nouvelle famille
                    </button>
                    <button
                      type="button"
                      onClick={() => set('family_mode', 'existing')}
                      className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all ${
                        form.family_mode === 'existing'
                          ? 'border-violet-400 bg-violet-50 text-violet-700'
                          : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-violet-300'
                      }`}
                    >
                      Famille existante
                    </button>
                  </div>
                )}

                {form.family_mode === 'existing' ? (
                  <Field label="Famille">
                    <select
                      value={form.family_id}
                      onChange={e => set('family_id', e.target.value)}
                      className={inputCls}
                    >
                      <option value="">— Choisir une famille —</option>
                      {existingFamilies.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.parent1_first} {f.parent1_last}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Parent principal</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Prénom">
                        <input value={form.parent1_first} onChange={e => set('parent1_first', e.target.value)} placeholder="Prénom" className={inputCls} />
                      </Field>
                      <Field label="Nom">
                        <input value={form.parent1_last} onChange={e => set('parent1_last', e.target.value)} placeholder="Nom" className={inputCls} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Téléphone">
                        <input value={form.parent1_phone} onChange={e => set('parent1_phone', e.target.value)} placeholder="+33 6 …" className={inputCls} />
                      </Field>
                      <Field label="WhatsApp">
                        <input value={form.parent1_whatsapp} onChange={e => set('parent1_whatsapp', e.target.value)} placeholder="+33 6 …" className={inputCls} />
                      </Field>
                    </div>
                    <Field label="Email">
                      <input type="email" value={form.parent1_email} onChange={e => set('parent1_email', e.target.value)} placeholder="parent@email.com" className={inputCls} />
                    </Field>

                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] pt-2">Parent secondaire (optionnel)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Prénom">
                        <input value={form.parent2_first} onChange={e => set('parent2_first', e.target.value)} placeholder="Prénom" className={inputCls} />
                      </Field>
                      <Field label="Nom">
                        <input value={form.parent2_last} onChange={e => set('parent2_last', e.target.value)} placeholder="Nom" className={inputCls} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Téléphone">
                        <input value={form.parent2_phone} onChange={e => set('parent2_phone', e.target.value)} placeholder="+33 6 …" className={inputCls} />
                      </Field>
                      <Field label="Email">
                        <input type="email" value={form.parent2_email} onChange={e => set('parent2_email', e.target.value)} placeholder="parent2@email.com" className={inputCls} />
                      </Field>
                    </div>

                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] pt-2">Adresse</p>
                    <Field label="Rue">
                      <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="15 rue des Lilas" className={inputCls} />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Ville">
                        <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Maisons-Alfort" className={inputCls} />
                      </Field>
                      <Field label="Code postal">
                        <input value={form.postal_code} onChange={e => set('postal_code', e.target.value)} placeholder="94700" className={inputCls} />
                      </Field>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── URGENCE ── */}
          {section === 'emergency' && (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-5">
              <h2 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
                <Shield className="h-4 w-4 text-violet-500" />
                Urgence & santé
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Contact d'urgence">
                  <input value={form.emergency_name} onChange={e => set('emergency_name', e.target.value)} placeholder="Nom du contact" className={inputCls} />
                </Field>
                <Field label="Lien de parenté">
                  <input value={form.emergency_relation} onChange={e => set('emergency_relation', e.target.value)} placeholder="Grand-mère, oncle…" className={inputCls} />
                </Field>
              </div>
              <Field label="Téléphone d'urgence">
                <input value={form.emergency_phone} onChange={e => set('emergency_phone', e.target.value)} placeholder="+33 6 …" className={inputCls} />
              </Field>
              <Field label="Notes médicales (allergies, besoins particuliers)">
                <textarea
                  value={form.medical_notes}
                  onChange={e => set('medical_notes', e.target.value)}
                  rows={4}
                  placeholder="Allergie aux arachides, asthme, TDAH… (confidentiel)"
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
            >
              Annuler
            </button>
            <div className="flex gap-3">
              {section !== SECTIONS[SECTIONS.length - 1]!.id && (
                <button
                  type="button"
                  onClick={() => {
                    const idx = SECTIONS.findIndex(s => s.id === section)
                    if (idx < SECTIONS.length - 1) setSection(SECTIONS[idx + 1]!.id)
                  }}
                  className="rounded-xl border border-violet-300 px-5 py-2.5 text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors"
                >
                  Suivant →
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {mode === 'create' ? "Inscrire l'élève" : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[var(--color-text)]">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-colors'

function formFromStudent(s: Student): FormData {
  return {
    ...INIT,
    first_name:      s.first_name,
    last_name:       s.last_name,
    date_of_birth:   s.date_of_birth ?? '',
    gender:          s.gender,
    photo_consent:   s.photo_consent,
    site_id:         s.site_id    ?? '',
    level_id:        s.level_id   ?? '',
    status:          s.status,
    enrollment_date: s.enrollment_date,
    emergency_name:     s.emergency_name     ?? '',
    emergency_phone:    s.emergency_phone    ?? '',
    emergency_relation: s.emergency_relation ?? '',
    medical_notes:   s.medical_notes ?? '',
    notes:           s.notes        ?? '',
    family_mode:     s.family_id ? 'existing' : 'new',
    family_id:       s.family_id ?? '',
    parent1_first:   s.family?.parent1_first ?? '',
    parent1_last:    s.family?.parent1_last  ?? '',
    parent1_phone:   s.family?.parent1_phone ?? '',
    parent1_email:   s.family?.parent1_email ?? '',
    parent1_whatsapp: s.family?.parent1_whatsapp ?? '',
    parent2_first:   s.family?.parent2_first ?? '',
    parent2_last:    s.family?.parent2_last  ?? '',
    parent2_phone:   s.family?.parent2_phone ?? '',
    parent2_email:   s.family?.parent2_email ?? '',
    address:         s.family?.address      ?? '',
    city:            s.family?.city         ?? '',
    postal_code:     s.family?.postal_code  ?? '',
  }
}
