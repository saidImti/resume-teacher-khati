'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Check, Hash, Plus, Save, Search, Sparkles, Trash2,
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { unitRateForFamilySize } from '@/lib/pricing'
import type { AcademicYear, Level, Site, PricingRule, Group } from '@/types'

type Mode = 'new' | 'existing' | 'renewal'

interface FamilySearchResult {
  id: string
  name: string
  phone: string | null
  email: string | null
  registration_number: string | null
  site_id: string | null
  students_count: number
}

interface RenewalStudent {
  id: string
  name: string
  date_of_birth: string | null
  site_id: string | null
  level: Pick<Level, 'id' | 'name' | 'slug' | 'age_min' | 'age_max' | 'color' | 'emoji'> | null
  last_group: Pick<Group, 'id' | 'name' | 'day_of_week' | 'time_slot' | 'site_id' | 'level_id'> | null
  checked: boolean
  groupId: string
}

interface ChildDraft {
  uid: number
  prenom: string
  nom: string
  dob: string
  age: string
  gender: 'M' | 'F' | 'autre'
  jour: string
  levelId: string
  levelManual: boolean
  particularites: boolean
  medicalNote: string
  emergencyName: string
  emergencyPhone: string
  emergencyRelation: string
}

const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

function emptyChild(uid: number): ChildDraft {
  return {
    uid, prenom: '', nom: '', dob: '', age: '', gender: 'M', jour: '',
    levelId: '', levelManual: false,
    particularites: false, medicalNote: '', emergencyName: '', emergencyPhone: '', emergencyRelation: '',
  }
}

function ageFromDob(dob: string): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000))
}

function dobFromAge(age: string): string {
  const year = new Date().getFullYear() - Number(age)
  return `${year}-01-01`
}

function levelForAge(levels: Level[], age: number | null): Level | null {
  if (age === null) return null
  return levels.find((l) => age >= l.age_min && age <= l.age_max) ?? null
}

interface PricingItem { name: string; price: number | null; tag: string }
interface PricingResult { mode: 'per_session' | 'monthly_per_child' | 'monthly_family' | 'special' | 'none'; items: PricingItem[]; month: number }

export function NewRegistrationForm({
  sites, levels, academicYears,
}: { sites: Site[]; levels: Level[]; academicYears: AcademicYear[] }) {
  const router = useRouter()
  const activeYear = academicYears.find((y) => y.is_active) ?? academicYears[0] ?? null

  const [mode, setModeState] = useState<Mode>('new')
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '')
  const [registrationDate, setRegistrationDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [pricingRule, setPricingRule] = useState<PricingRule | null>(null)
  const [pricingLoading, setPricingLoading] = useState(false)

  // Famille — mode "new"
  const [parentFirst, setParentFirst] = useState('')
  const [parentLast, setParentLast] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [dupResults, setDupResults] = useState<FamilySearchResult[]>([])
  const dupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Famille — mode "existing" / "renewal"
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FamilySearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [pickedFamily, setPickedFamily] = useState<FamilySearchResult | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Enfants — mode "new" / "existing"
  const [children, setChildren] = useState<ChildDraft[]>([emptyChild(1)])
  const childSeq = useRef(2)

  // Rentrée — mode "renewal"
  const [renewalStudents, setRenewalStudents] = useState<RenewalStudent[]>([])
  const [renewalGroups, setRenewalGroups] = useState<Group[]>([])
  const [renewalLoading, setRenewalLoading] = useState(false)

  // Tarif spécial
  const [specialOn, setSpecialOn] = useState(false)
  const [specialAmount, setSpecialAmount] = useState('')
  const [specialNote, setSpecialNote] = useState('')

  // Autorisations
  const [authPhotos, setAuthPhotos] = useState(true)
  const [authActivities, setAuthActivities] = useState(true)
  const [authEmergency, setAuthEmergency] = useState(true)

  const [saving, setSaving] = useState(false)
  const submittingRef = useRef(false)

  const currentSite = sites.find((s) => s.id === siteId) ?? null

  // ── Chargement du tarif reel a chaque changement de site ─────────────────
  useEffect(() => {
    if (!siteId) { setPricingRule(null); return }
    let cancelled = false
    setPricingLoading(true)
    fetch(`/api/pricing-rules?siteId=${siteId}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setPricingRule(data ?? null) })
      .catch(() => { if (!cancelled) setPricingRule(null) })
      .finally(() => { if (!cancelled) setPricingLoading(false) })
    return () => { cancelled = true }
  }, [siteId])

  function setMode(m: Mode) {
    setModeState(m)
    setPickedFamily(null)
    setSearchResults([])
    setSearchQuery('')
    setRenewalStudents([])
    if (m !== 'existing') setChildren([emptyChild(childSeq.current++)])
  }

  // ── Detection de doublon en direct (mode nouvelle famille) ───────────────
  useEffect(() => {
    if (mode !== 'new') return
    if (dupTimer.current) clearTimeout(dupTimer.current)
    const q = parentPhone.trim().length >= 6 ? parentPhone : parentLast
    if (q.trim().length < 3) { setDupResults([]); return }
    dupTimer.current = setTimeout(() => {
      fetch(`/api/families/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => setDupResults(Array.isArray(data) ? data.slice(0, 3) : []))
        .catch(() => setDupResults([]))
    }, 350)
    return () => { if (dupTimer.current) clearTimeout(dupTimer.current) }
  }, [mode, parentPhone, parentLast])

  // ── Recherche famille (mode existing / renewal) ──────────────────────────
  function onSearchInput(value: string) {
    setSearchQuery(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (value.trim().length < 2) { setSearchResults([]); return }
    setSearchLoading(true)
    searchTimer.current = setTimeout(() => {
      fetch(`/api/families/search?q=${encodeURIComponent(value)}`)
        .then((r) => r.json())
        .then((data) => setSearchResults(Array.isArray(data) ? data : []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false))
    }, 300)
  }

  async function pickFamily(f: FamilySearchResult) {
    setPickedFamily(f)
    setSearchResults([])
    setSearchQuery('')
    setDupResults([])
    if (f.site_id) setSiteId(f.site_id)

    if (mode === 'renewal') {
      setRenewalLoading(true)
      try {
        const res = await fetch(`/api/families/${f.id}/students`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Erreur')
        const students: RenewalStudent[] = (data.students ?? []).map((s: RenewalStudent) => ({
          ...s, checked: true, groupId: s.last_group?.id ?? '',
        }))
        setRenewalStudents(students)

        if (activeYear && f.site_id) {
          const gRes = await fetch(`/api/groups?siteId=${f.site_id}&academicYearId=${activeYear.id}`)
          const groups = await gRes.json()
          setRenewalGroups(Array.isArray(groups) ? groups : [])
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Impossible de charger les élèves de cette famille')
      } finally {
        setRenewalLoading(false)
      }
    }
  }

  function clearFamily() {
    setPickedFamily(null)
    setRenewalStudents([])
  }

  // ── Enfants (mode new / existing) ─────────────────────────────────────────
  function addChild() {
    setChildren((cur) => [...cur, emptyChild(childSeq.current++)])
  }
  function removeChild(uid: number) {
    setChildren((cur) => cur.filter((c) => c.uid !== uid))
  }
  function updateChild(uid: number, patch: Partial<ChildDraft>) {
    setChildren((cur) => cur.map((c) => {
      if (c.uid !== uid) return c
      const next = { ...c, ...patch }
      if (patch.dob !== undefined && patch.dob) next.age = String(ageFromDob(patch.dob) ?? '')
      if (patch.age !== undefined && patch.age) next.dob = dobFromAge(patch.age)
      // Niveau auto-suggere tant que l'admin ne l'a pas change a la main
      if ((patch.dob !== undefined || patch.age !== undefined) && !next.levelManual) {
        const lvl = levelForAge(levels, ageFromDob(next.dob))
        next.levelId = lvl?.id ?? ''
      }
      return next
    }))
  }

  function setChildLevel(uid: number, levelId: string) {
    setChildren((cur) => cur.map((c) => c.uid === uid ? { ...c, levelId, levelManual: true } : c))
  }

  function toggleRenewalStudent(id: string) {
    setRenewalStudents((cur) => cur.map((s) => s.id === id ? { ...s, checked: !s.checked } : s))
  }
  function setRenewalGroup(id: string, groupId: string) {
    setRenewalStudents((cur) => cur.map((s) => s.id === id ? { ...s, groupId } : s))
  }

  // ── Calcul du tarif — 3 modes reels + tarif special ───────────────────────
  // En mode "existing", les enfants ajoutes ici s'empilent sur la fratrie deja
  // presente dans la famille (rang degressif = students_count existant + position).
  const siblingOffset = mode === 'existing' && pickedFamily ? pickedFamily.students_count : 0

  const activeNames: string[] = mode === 'renewal'
    ? renewalStudents.filter((s) => s.checked).map((s) => s.name)
    : children.map((c, i) => (c.prenom || c.nom) ? `${c.prenom} ${c.nom}`.trim() : `Enfant ${i + 1}`)

  const pricing: PricingResult = useMemo(() => {
    const amount = Number(specialAmount || 0)
    if (specialOn && amount > 0) {
      return { mode: 'special', items: activeNames.map((name) => ({ name, price: null, tag: 'inclus' })), month: amount }
    }
    if (!pricingRule || activeNames.length === 0) return { mode: 'none', items: [], month: 0 }

    if (pricingRule.billing_type === 'per_session') {
      const perChild = (pricingRule.price_per_session ?? 0) * 4
      return {
        mode: 'per_session',
        items: activeNames.map((name) => ({ name, price: perChild, tag: `${pricingRule.price_per_session}€ × 4` })),
        month: perChild * activeNames.length,
      }
    }
    if (pricingRule.billing_type === 'monthly_family') {
      return {
        mode: 'monthly_family',
        items: activeNames.map((name) => ({ name, price: null, tag: 'inclus' })),
        month: pricingRule.price_1_child ?? 0,
      }
    }
    // Tarif degressif : PAS un bareme progressif — un tarif unique par enfant,
    // determine par la taille totale de la fratrie (siblingOffset + nouveaux enfants).
    // Une famille de 3 enfants paie 30€/enfant/mois pour CHACUN, soit 90€, pas 40+35+30.
    const totalFamilySize = siblingOffset + activeNames.length
    const { unit } = unitRateForFamilySize(pricingRule, totalFamilySize)
    const items = activeNames.map((name) => ({ name, price: unit, tag: `${totalFamilySize} enfant${totalFamilySize > 1 ? 's' : ''}` }))
    return { mode: 'monthly_per_child', items, month: unit * activeNames.length }
  }, [pricingRule, activeNames, specialOn, specialAmount, siblingOffset])

  const modeMeta: Record<PricingResult['mode'], { label: string; sub: string; color: string }> = {
    per_session: { label: 'Tarif par séance', sub: 'Estimé sur 4 séances / mois / enfant', color: '#f59e0b' },
    monthly_per_child: { label: 'Dégressif standard', sub: 'Tarif par enfant selon la taille de la fratrie', color: '#6366f1' },
    monthly_family: { label: 'Forfait famille', sub: "Montant fixe, quel que soit le nombre d'enfants", color: '#8b5cf6' },
    special: { label: 'Tarif spécial famille', sub: 'Remplace le calcul standard — décision admin', color: '#10b981' },
    none: { label: 'Sélectionne un site', sub: '', color: '#8489a6' },
  }

  // ── Completion (indicatif) ────────────────────────────────────────────────
  const completion = useMemo(() => {
    if (mode === 'renewal') {
      const total = renewalStudents.length || 1
      const done = pickedFamily ? renewalStudents.filter((s) => s.checked).length : 0
      return pickedFamily ? Math.round((done / total) * 100) : 0
    }
    const familyOk = mode === 'existing' ? !!pickedFamily : (parentFirst && parentLast && parentPhone)
    const filled = children.filter((c) => c.prenom && c.nom && c.dob).length
    const total = children.length + 1
    const done = filled + (familyOk ? 1 : 0)
    return total ? Math.round((done / total) * 100) : 0
  }, [mode, pickedFamily, renewalStudents, parentFirst, parentLast, parentPhone, children])

  // ── Soumission ─────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (submittingRef.current) return

    if (mode === 'renewal') {
      const toEnroll = renewalStudents.filter((s) => s.checked)
      if (!pickedFamily) { toast.error('Sélectionne une famille'); return }
      if (!toEnroll.length) { toast.error('Coche au moins un élève'); return }
      const missingGroup = toEnroll.find((s) => !s.groupId)
      if (missingGroup) { toast.error(`Choisis un créneau pour ${missingGroup.name}`); return }

      submittingRef.current = true
      setSaving(true)
      try {
        const supabase = getSupabaseBrowserClient()
        for (const s of toEnroll) {
          const res = await fetch('/api/enrollments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: s.id, group_id: s.groupId, start_date: registrationDate, status: 'active' }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error ?? `Échec pour ${s.name}`)

          // Le niveau "courant" de l'eleve (students.level_id, affiche partout dans l'app) doit
          // suivre son age reel, pas rester fige sur son niveau de l'annee precedente.
          const newLevel = levelForAge(levels, ageFromDob(s.date_of_birth ?? ''))
          if (newLevel && newLevel.id !== s.level?.id) {
            await supabase.from('students').update({ level_id: newLevel.id }).eq('id', s.id)
          }
        }
        toast.success(`${toEnroll.length} élève${toEnroll.length > 1 ? 's' : ''} réinscrit${toEnroll.length > 1 ? 's' : ''}`)
        clearFamily()
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur lors de la réinscription')
        submittingRef.current = false
      } finally {
        setSaving(false)
      }
      return
    }

    // mode new / existing — creation d'enfant(s)
    const validChildren = children.filter((c) => c.prenom.trim() && c.nom.trim())
    if (!validChildren.length) { toast.error('Ajoute au moins un enfant (prénom et nom requis)'); return }
    if (mode === 'new' && (!parentFirst.trim() || !parentLast.trim() || !parentPhone.trim())) {
      toast.error('Nom, prénom et téléphone du parent sont requis')
      return
    }
    if (mode === 'existing' && !pickedFamily) { toast.error('Sélectionne une famille'); return }
    if (!siteId) { toast.error('Sélectionne un site'); return }

    submittingRef.current = true
    setSaving(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      let familyId = pickedFamily?.id ?? null
      if (mode === 'new') {
        const { data: fam, error: famErr } = await supabase
          .from('families')
          .insert({
            user_id: user.id,
            parent1_first: parentFirst.trim(),
            parent1_last: parentLast.trim(),
            parent1_phone: parentPhone.trim() || null,
            parent1_email: parentEmail.trim() || null,
            address: address.trim() || null,
            city: city.trim() || null,
            postal_code: postalCode.trim() || null,
            primary_site_id: siteId,
            custom_monthly_rate: specialOn && Number(specialAmount) > 0 ? Number(specialAmount) : null,
            custom_rate_note: specialOn ? (specialNote.trim() || null) : null,
          })
          .select('id, registration_number')
          .single()
        if (famErr) throw famErr
        familyId = fam.id
      } else if (specialOn && Number(specialAmount) > 0 && pickedFamily) {
        // Famille existante : appliquer le tarif special via la route dediee (admin-only)
        await fetch(`/api/families/${pickedFamily.id}/rate`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ custom_monthly_rate: Number(specialAmount), custom_rate_note: specialNote.trim() || null }),
        }).catch(() => {})
      }

      let created = 0
      for (const c of validChildren) {
        const { error: stuErr } = await supabase.from('students').insert({
          user_id: user.id,
          family_id: familyId,
          first_name: c.prenom.trim(),
          last_name: c.nom.trim(),
          date_of_birth: c.dob || null,
          gender: c.gender,
          site_id: siteId,
          level_id: c.levelId || null,
          status: 'active',
          enrollment_date: registrationDate,
          medical_notes: c.medicalNote.trim() || null,
          emergency_name: c.emergencyName.trim() || null,
          emergency_phone: c.emergencyPhone.trim() || null,
          emergency_relation: c.emergencyRelation.trim() || null,
          notes: c.jour.trim() ? `Créneau souhaité : ${c.jour.trim()}` : null,
        })
        if (stuErr) throw stuErr
        created++
      }

      toast.success(`${created} élève${created > 1 ? 's' : ''} inscrit${created > 1 ? 's' : ''}`)
      // Reset pour la saisie suivante (guichet de rentrée)
      setChildren([emptyChild(childSeq.current++)])
      setParentFirst(''); setParentLast(''); setParentPhone(''); setParentEmail('')
      setAddress(''); setCity(''); setPostalCode('')
      setSpecialOn(false); setSpecialAmount(''); setSpecialNote('')
      setPickedFamily(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
      submittingRef.current = false
    } finally {
      setSaving(false)
    }
  }

  function applyEmergencyToAll(uid: number) {
    const source = children.find((c) => c.uid === uid)
    if (!source) return
    setChildren((cur) => cur.map((c) => c.uid === uid ? c : {
      ...c,
      emergencyName: source.emergencyName,
      emergencyPhone: source.emergencyPhone,
      emergencyRelation: source.emergencyRelation,
    }))
    toast.success('Contact d’urgence appliqué à tous les enfants')
  }

  const meta = modeMeta[pricing.mode]

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            Nouvelle inscription
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Une page, toute la fratrie, tarif en direct.</p>
        </div>

        <div className="inline-flex rounded-full border border-border bg-card p-1">
          {(['new', 'existing', 'renewal'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m === 'new' ? 'Nouvelle famille' : m === 'existing' ? 'Ajouter à une famille' : 'Rentrée — élèves connus'}
            </button>
          ))}
        </div>

        {/* ① Site */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">1</span>
              Site & période
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Site</label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.registration_prefix ? ` (${s.registration_prefix})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Date d&apos;inscription</label>
              <input
                type="date"
                value={registrationDate}
                onChange={(e) => setRegistrationDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Hash className="h-3 w-3" />Préfixe du site
              </label>
              <input
                disabled
                value={currentSite?.registration_prefix ? `${currentSite.registration_prefix}-…` : 'Non attribué'}
                className="w-full rounded-lg border border-input bg-muted px-3 py-2 font-mono text-sm text-muted-foreground"
              />
            </div>
          </div>
          {pricingRule && !pricingLoading && (
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="mr-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ backgroundColor: meta.color }}>
                {modeMeta[pricingRule.billing_type].label}
              </span>
              {modeMeta[pricingRule.billing_type].sub}
            </p>
          )}
          {!pricingRule && !pricingLoading && siteId && (
            <p className="mt-3 text-xs text-amber-600">Aucun tarif configuré pour ce site — configure-le dans Paramètres → Tarification.</p>
          )}
        </section>

        {/* ② Famille */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">2</span>
              Parent / Tuteur
            </h2>
            <span className="text-xs text-muted-foreground">
              {mode === 'new' ? 'Saisi une seule fois pour toute la fratrie' : mode === 'existing' ? 'Recherche par nom, téléphone ou n° dossier' : 'La famille apparaît, ses élèves aussi'}
            </span>
          </div>

          {mode === 'new' ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Nom *</label>
                  <input value={parentLast} onChange={(e) => setParentLast(e.target.value)} placeholder="Dupont" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Prénom *</label>
                  <input value={parentFirst} onChange={(e) => setParentFirst(e.target.value)} placeholder="Marie" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Téléphone *</label>
                  <input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="06 12 34 56 78" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
                  <input value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="marie.dupont@email.fr" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Adresse</label>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Ville</label>
                  <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              {dupResults.length > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs dark:bg-amber-950/30">
                  <span>⚠️</span>
                  <div className="flex-1 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">Famille probable</div>
                    {dupResults.map((f) => (
                      <div key={f.id} className="flex items-center justify-between gap-2">
                        <span><b>{f.name}</b> · {f.phone ?? 'sans tél.'} · {f.students_count} enfant{f.students_count > 1 ? 's' : ''} {f.registration_number ? `(${f.registration_number})` : ''}</span>
                        <button
                          type="button"
                          onClick={() => { setMode('existing'); pickFamily(f) }}
                          className="shrink-0 rounded-md bg-foreground px-2 py-1 text-[11px] font-semibold text-background"
                        >
                          Utiliser
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {!pickedFamily ? (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={searchQuery}
                      onChange={(e) => onSearchInput(e.target.value)}
                      placeholder="Nom de famille, téléphone ou n° dossier…"
                      className="w-full rounded-lg border border-input bg-background py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {searchLoading && <p className="text-xs text-muted-foreground">Recherche…</p>}
                    {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
                      <p className="text-xs text-muted-foreground">Aucune famille trouvée.</p>
                    )}
                    {searchResults.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => pickFamily(f)}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-xs hover:border-primary hover:bg-primary/5"
                      >
                        <div>
                          <div className="font-semibold">{f.name}</div>
                          <div className="text-muted-foreground">{f.students_count} enfant{f.students_count > 1 ? 's' : ''} {f.phone ? `· ${f.phone}` : ''}</div>
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground">{f.registration_number}</div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-300/60 bg-emerald-50 p-3 dark:bg-emerald-950/30">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-white">
                    {pickedFamily.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{pickedFamily.name}</div>
                    <div className="text-xs text-muted-foreground">{pickedFamily.students_count} enfant{pickedFamily.students_count > 1 ? 's' : ''} · dossier {pickedFamily.registration_number}</div>
                  </div>
                  <button type="button" onClick={clearFamily} className="text-xs text-muted-foreground hover:text-foreground">Changer ✕</button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ③ Enfants */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">3</span>
              {mode === 'renewal' ? 'Élèves à réinscrire' : 'Enfants'}
            </h2>
            <span className="text-xs text-muted-foreground">
              {mode === 'renewal' ? 'Coche qui revient, ajuste le créneau si besoin' : "Niveau suggéré selon l'âge"}
            </span>
          </div>

          {mode === 'renewal' ? (
            <div className="space-y-2.5">
              {!pickedFamily && <p className="text-xs text-muted-foreground">Recherche une famille ci-dessus pour voir ses élèves.</p>}
              {pickedFamily && renewalLoading && <p className="text-xs text-muted-foreground">Chargement…</p>}
              {pickedFamily && !renewalLoading && renewalStudents.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucun élève actif pour cette famille.</p>
              )}
              {renewalStudents.map((s) => {
                const age = ageFromDob(s.date_of_birth ?? '')
                const newLvl = levelForAge(levels, age)
                const bumped = newLvl && s.level && newLvl.id !== s.level.id
                return (
                  <div key={s.id} className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${s.checked ? 'border-emerald-300/60 bg-emerald-50 dark:bg-emerald-950/20' : 'border-border bg-muted/30'}`}>
                    <input type="checkbox" checked={s.checked} onChange={() => toggleRenewalStudent(s.id)} className="h-4 w-4 accent-emerald-500" />
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">{s.name.slice(0, 2).toUpperCase()}</div>
                    <div className="min-w-[140px] flex-1">
                      <div className="text-sm font-semibold">{s.name}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {s.level && (
                          <span className="rounded-full px-2 py-0.5 font-semibold text-white" style={{ backgroundColor: s.level.color }}>{s.level.name}</span>
                        )}
                        {bumped && newLvl ? (
                          <>
                            <span>→</span>
                            <span className="rounded-full px-2 py-0.5 font-semibold text-white" style={{ backgroundColor: newLvl.color }}>{newLvl.name}</span>
                            <span>cette année</span>
                          </>
                        ) : <span>· même niveau cette année</span>}
                      </div>
                    </div>
                    <select
                      value={s.groupId}
                      onChange={(e) => setRenewalGroup(s.id, e.target.value)}
                      className="w-48 rounded-lg border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Choisir un créneau</option>
                      {renewalGroups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}{g.day_of_week !== null ? ` — ${DAY_LABELS[g.day_of_week]}` : ''}{g.time_slot ? ` ${g.time_slot}` : ''}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {children.map((c, i) => {
                  const lvl = levels.find((l) => l.id === c.levelId) ?? null
                  return (
                    <div key={c.uid} className="rounded-lg border border-border bg-muted/30 p-3.5">
                      <div className="mb-2.5 flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">{i + 1}</div>
                        <div className="flex-1 text-xs font-semibold">{c.prenom || c.nom ? `${c.prenom} ${c.nom}`.trim() : `Enfant ${i + 1}`}</div>
                        {lvl && (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: lvl.color }}>{lvl.emoji} {lvl.name}</span>
                        )}
                        {children.length > 1 && (
                          <button type="button" onClick={() => removeChild(c.uid)} className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Retirer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid gap-2.5 sm:grid-cols-4">
                        <input value={c.prenom} onChange={(e) => updateChild(c.uid, { prenom: e.target.value })} placeholder="Prénom *" className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        <input value={c.nom} onChange={(e) => updateChild(c.uid, { nom: e.target.value })} placeholder="Nom *" className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        <input type="number" min={1} max={18} value={c.age} onChange={(e) => updateChild(c.uid, { age: e.target.value })} placeholder="Âge" className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        <input type="date" value={c.dob} onChange={(e) => updateChild(c.uid, { dob: e.target.value })} className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                        <div>
                          <select
                            value={c.levelId}
                            onChange={(e) => setChildLevel(c.uid, e.target.value)}
                            className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="">Niveau — choisir</option>
                            {levels.map((l) => (
                              <option key={l.id} value={l.id}>{l.emoji} {l.name} ({l.age_min}-{l.age_max})</option>
                            ))}
                          </select>
                          {!c.levelManual && c.levelId && (
                            <p className="mt-1 text-[10px] text-muted-foreground">Suggéré selon l&apos;âge — modifiable</p>
                          )}
                        </div>
                        <input value={c.jour} onChange={(e) => updateChild(c.uid, { jour: e.target.value })} placeholder="Jour / créneau" className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <button
                        type="button"
                        onClick={() => updateChild(c.uid, { particularites: !c.particularites })}
                        className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-primary"
                      >
                        {c.particularites ? '−' : '+'} Contact d&apos;urgence / médical pour cet enfant
                      </button>
                      {c.particularites && (
                        <div className="mt-2 space-y-2">
                          <div className="grid gap-2 sm:grid-cols-3">
                            <input value={c.emergencyName} onChange={(e) => updateChild(c.uid, { emergencyName: e.target.value })} placeholder="Contact d'urgence" className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                            <input value={c.emergencyRelation} onChange={(e) => updateChild(c.uid, { emergencyRelation: e.target.value })} placeholder="Lien (père, mère…)" className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                            <input value={c.emergencyPhone} onChange={(e) => updateChild(c.uid, { emergencyPhone: e.target.value })} placeholder="Téléphone urgence" className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                          </div>
                          <textarea value={c.medicalNote} onChange={(e) => updateChild(c.uid, { medicalNote: e.target.value })} placeholder="Allergies, traitement, particularité médicale…" rows={2} className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                          {children.length > 1 && (
                            <button type="button" onClick={() => applyEmergencyToAll(c.uid)} className="text-[11px] font-semibold text-primary underline decoration-dotted">
                              Appliquer ce contact d&apos;urgence à tous les enfants
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <button type="button" onClick={addChild} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary">
                <Plus className="h-3.5 w-3.5" />Ajouter un enfant
              </button>

              <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={specialOn} onChange={(e) => setSpecialOn(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
                Appliquer un tarif spécial pour cette famille
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">Admin</span>
              </label>
              {specialOn && (
                <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                  <input type="number" value={specialAmount} onChange={(e) => setSpecialAmount(e.target.value)} placeholder="Montant mensuel forfaitaire" className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input value={specialNote} onChange={(e) => setSpecialNote(e.target.value)} placeholder="Motif (interne)" className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              )}
            </>
          )}
        </section>

        {mode !== 'renewal' && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">4</span>
              Autorisations
            </h2>
            <div className="flex flex-wrap gap-5 text-xs text-muted-foreground">
              <label className="flex items-center gap-2"><input type="checkbox" checked={authPhotos} onChange={(e) => setAuthPhotos(e.target.checked)} className="h-4 w-4 accent-primary" />Photos / vidéos pédagogiques</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={authActivities} onChange={(e) => setAuthActivities(e.target.checked)} className="h-4 w-4 accent-primary" />Participation aux activités</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={authEmergency} onChange={(e) => setAuthEmergency(e.target.checked)} className="h-4 w-4 accent-primary" />Urgence médicale</label>
            </div>
          </section>
        )}
      </div>

      {/* Panneau récapitulatif */}
      <div className="space-y-3">
        <div className="sticky top-4 space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Dossier</div>
            <Row k="Site" v={currentSite?.name ?? '—'} />
            <Row k="Famille" v={mode === 'new' ? (parentLast ? `${parentFirst} ${parentLast}`.trim() : 'À définir') : (pickedFamily?.name ?? 'À définir')} />
            <Row k="Élèves" v={String(activeNames.length)} mono last />
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Tarification</div>
            <div className="mb-2.5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
              <div>
                <div className="text-xs font-semibold">{meta.label}</div>
                <div className="text-[10px] text-muted-foreground">{meta.sub}</div>
              </div>
            </div>
            {siblingOffset > 0 && pricing.mode === 'monthly_per_child' && (
              <p className="mb-2 text-[11px] text-muted-foreground">
                Cette famille a déjà {siblingOffset} enfant{siblingOffset > 1 ? 's' : ''} — avec {activeNames.length} de plus, la fratrie passe à {siblingOffset + activeNames.length}, ce qui recalcule aussi le tarif des enfants déjà inscrits à la prochaine facture.
              </p>
            )}
            <div className="space-y-1.5">
              {pricing.items.length === 0 && <p className="text-[11px] text-muted-foreground">Ajoute un enfant pour voir le calcul</p>}
              {pricing.items.map((it, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-muted text-[9px] font-bold text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 truncate text-muted-foreground">{it.name}</span>
                  <span className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{it.tag}</span>
                  <span className="font-mono font-semibold">{it.price !== null ? `${it.price.toFixed(0)}€` : ''}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
              <span className="text-[11px] font-semibold text-muted-foreground">Total mensuel</span>
              <span className="font-mono text-xl font-bold">{pricing.month.toFixed(0)} €</span>
            </div>
            <div className="text-right font-mono text-[11px] font-semibold text-emerald-600">{(pricing.month * 10).toFixed(0)} € / an (10 mois)</div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-1 flex justify-between text-[10px] text-muted-foreground"><span>Fiche complétée</span><span>{completion}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${completion}%` }} /></div>
            <div className="mt-3.5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-105 disabled:opacity-60"
              >
                {saving ? 'Enregistrement…' : mode === 'renewal' ? <><Check className="h-4 w-4" />Réinscrire</> : <><Save className="h-4 w-4" />Enregistrer l&apos;inscription</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ k, v, mono, last }: { k: string; v: string; mono?: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 text-xs ${last ? '' : 'border-b border-border'}`}>
      <span className="text-muted-foreground">{k}</span>
      <span className={`font-semibold ${mono ? 'font-mono' : ''}`}>{v}</span>
    </div>
  )
}
