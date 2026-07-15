'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Euro, Pencil, Save, Search, X } from 'lucide-react'
import type { PricingRule, Site, BillingType } from '@/types'

interface SiteStat { siteId: string; families: number; children: number; monthly: number; pctRevenue: number }
interface FamilyRate {
  id: string
  name: string
  registration_number: string | null
  custom_monthly_rate: number | null
  custom_rate_note: string | null
  students_count: number
}
interface FamilySearchResult {
  id: string
  name: string
  phone: string | null
  registration_number: string | null
  students_count: number
}

const MODE_LABELS: Record<BillingType, string> = {
  per_session: 'Par séance',
  monthly_per_child: 'Dégressif standard',
  monthly_family: 'Forfait famille',
}

// Mode d'affichage du formulaire : « flat » est un raccourci UI (tarif unique
// par enfant) qui se sauvegarde en monthly_per_child avec 5 paliers égaux.
type UiMode = BillingType | 'monthly_flat'

interface RuleFormState {
  ui_mode: UiMode
  price_per_session: string
  price_flat: string
  price_1_child: string
  price_2_children: string
  price_3_children: string
  price_4_children: string
  price_5plus: string
  registration_fee: string
  registration_fee_scope: 'per_child' | 'per_family'
  months_per_year: string
  sessions_per_month: string
  annual_discount_pct: string
}

const EMPTY_RULE_FORM: RuleFormState = {
  ui_mode: 'monthly_per_child',
  price_per_session: '',
  price_flat: '',
  price_1_child: '40', price_2_children: '35', price_3_children: '30', price_4_children: '26', price_5plus: '22',
  registration_fee: '',
  registration_fee_scope: 'per_child',
  months_per_year: '10',
  sessions_per_month: '4',
  annual_discount_pct: '',
}

function isFlatRule(rule: PricingRule): boolean {
  return rule.billing_type === 'monthly_per_child'
    && rule.price_1_child !== null
    && rule.price_1_child === rule.price_2_children
    && rule.price_1_child === rule.price_3_children
    && rule.price_1_child === rule.price_4_children
    && rule.price_1_child === rule.price_5plus
}

function ruleToForm(rule: PricingRule | null): RuleFormState {
  if (!rule) return EMPTY_RULE_FORM
  const flat = isFlatRule(rule)
  return {
    ui_mode: flat ? 'monthly_flat' : rule.billing_type,
    price_per_session: rule.price_per_session?.toString() ?? '',
    price_flat: flat ? (rule.price_1_child?.toString() ?? '') : '',
    price_1_child: rule.price_1_child?.toString() ?? '',
    price_2_children: rule.price_2_children?.toString() ?? '',
    price_3_children: rule.price_3_children?.toString() ?? '',
    price_4_children: rule.price_4_children?.toString() ?? '',
    price_5plus: rule.price_5plus?.toString() ?? '',
    registration_fee: rule.registration_fee?.toString() ?? '',
    registration_fee_scope: rule.registration_fee_scope ?? 'per_child',
    months_per_year: (rule.months_per_year ?? 10).toString(),
    sessions_per_month: (rule.sessions_per_month ?? 4).toString(),
    annual_discount_pct: rule.annual_discount_pct?.toString() ?? '',
  }
}

function describeRule(rule: PricingRule | null): string {
  if (!rule) return 'Aucun tarif configuré'
  const extras: string[] = []
  if (rule.registration_fee && rule.registration_fee > 0) {
    extras.push(`+ ${rule.registration_fee}€ d'inscription (${rule.registration_fee_scope === 'per_family' ? 'par famille' : 'par enfant'})`)
  }
  if (rule.months_per_year && rule.months_per_year !== 10) extras.push(`${rule.months_per_year} mensualités/an`)
  if (rule.annual_discount_pct && rule.annual_discount_pct > 0) extras.push(`-${rule.annual_discount_pct}% si paiement annuel`)
  const suffix = extras.length > 0 ? ` · ${extras.join(' · ')}` : ''
  if (rule.billing_type === 'per_session') return `${rule.price_per_session}€ / séance / enfant (${rule.sessions_per_month ?? 4} séances/mois)${suffix}`
  if (rule.billing_type === 'monthly_family') return `${rule.price_1_child}€ / mois / famille (forfait)${suffix}`
  if (isFlatRule(rule)) return `${rule.price_1_child}€ / mois / enfant (tarif unique)${suffix}`
  return `${rule.price_1_child} / ${rule.price_2_children} / ${rule.price_3_children} / ${rule.price_4_children} / ${rule.price_5plus}€ selon la taille de la fratrie${suffix}`
}

export function TarificationManager({
  sites, initialRules, siteStats, familiesWithSpecialRate, totalMonthly, isAdmin,
}: {
  sites: Site[]
  initialRules: { siteId: string; rule: PricingRule }[]
  siteStats: SiteStat[]
  familiesWithSpecialRate: FamilyRate[]
  totalMonthly: number
  isAdmin: boolean
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'sites' | 'familles'>('sites')

  const [rulesBySite, setRulesBySite] = useState<Record<string, PricingRule | null>>(() => {
    const map: Record<string, PricingRule | null> = {}
    for (const s of sites) map[s.id] = initialRules.find((r) => r.siteId === s.id)?.rule ?? null
    return map
  })
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null)
  const [ruleForm, setRuleForm] = useState<RuleFormState>(EMPTY_RULE_FORM)
  const [savingRule, setSavingRule] = useState(false)

  const [families, setFamilies] = useState(familiesWithSpecialRate)
  const [famSearch, setFamSearch] = useState('')
  const [famResults, setFamResults] = useState<FamilySearchResult[]>([])
  const [famSearching, setFamSearching] = useState(false)
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null)
  const [rateAmount, setRateAmount] = useState('')
  const [rateNote, setRateNote] = useState('')
  const [savingRate, setSavingRate] = useState(false)

  function startEditRule(siteId: string) {
    setRuleForm(ruleToForm(rulesBySite[siteId] ?? null))
    setEditingSiteId(siteId)
  }

  async function saveRule(siteId: string) {
    const rule = rulesBySite[siteId]
    // Le mode « tarif unique par enfant » (raccourci UI) se sauvegarde en
    // monthly_per_child avec les 5 paliers égaux.
    const isFlat = ruleForm.ui_mode === 'monthly_flat'
    const billingType: BillingType = ruleForm.ui_mode === 'monthly_flat' ? 'monthly_per_child' : ruleForm.ui_mode
    const payload = {
      site_id: siteId,
      name: `Tarif ${sites.find((s) => s.id === siteId)?.name ?? ''}`.trim(),
      billing_type: billingType,
      price_per_session: ruleForm.price_per_session || null,
      price_1_child: (isFlat ? ruleForm.price_flat : ruleForm.price_1_child) || null,
      price_2_children: (isFlat ? ruleForm.price_flat : ruleForm.price_2_children) || null,
      price_3_children: (isFlat ? ruleForm.price_flat : ruleForm.price_3_children) || null,
      price_4_children: (isFlat ? ruleForm.price_flat : ruleForm.price_4_children) || null,
      price_5plus: (isFlat ? ruleForm.price_flat : ruleForm.price_5plus) || null,
      registration_fee: ruleForm.registration_fee || null,
      registration_fee_scope: ruleForm.registration_fee_scope,
      months_per_year: ruleForm.months_per_year || '10',
      sessions_per_month: ruleForm.sessions_per_month || '4',
      annual_discount_pct: ruleForm.annual_discount_pct || null,
      effective_from: new Date().toISOString().slice(0, 10),
    }
    setSavingRule(true)
    try {
      const res = await fetch(rule ? `/api/pricing-rules/${rule.id}` : '/api/pricing-rules', {
        method: rule ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Impossible de sauvegarder ce tarif'); return }
      setRulesBySite((cur) => ({ ...cur, [siteId]: data }))
      toast.success('Tarif enregistré')
      setEditingSiteId(null)
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSavingRule(false)
    }
  }

  function onFamSearch(value: string) {
    setFamSearch(value)
    if (value.trim().length < 2) { setFamResults([]); return }
    setFamSearching(true)
    fetch(`/api/families/search?q=${encodeURIComponent(value)}`)
      .then((r) => r.json())
      .then((data) => setFamResults(Array.isArray(data) ? data : []))
      .catch(() => setFamResults([]))
      .finally(() => setFamSearching(false))
  }

  function pickFamilyForRate(f: FamilySearchResult) {
    setEditingFamilyId(f.id)
    const existing = families.find((fam) => fam.id === f.id)
    setRateAmount(existing?.custom_monthly_rate?.toString() ?? '')
    setRateNote(existing?.custom_rate_note ?? '')
    setFamResults([])
    setFamSearch('')
    if (!existing) {
      setFamilies((cur) => [...cur, {
        id: f.id, name: f.name, registration_number: f.registration_number,
        custom_monthly_rate: null, custom_rate_note: null, students_count: f.students_count,
      }])
    }
  }

  async function saveFamilyRate(familyId: string, amount: number | null, note: string | null) {
    setSavingRate(true)
    try {
      const res = await fetch(`/api/families/${familyId}/rate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_monthly_rate: amount, custom_rate_note: note }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Impossible de sauvegarder ce tarif'); return }
      if (amount && amount > 0) {
        setFamilies((cur) => cur.map((f) => f.id === familyId ? { ...f, custom_monthly_rate: amount, custom_rate_note: note } : f))
        toast.success('Tarif spécial enregistré')
      } else {
        setFamilies((cur) => cur.filter((f) => f.id !== familyId))
        toast.success('Tarif spécial retiré — retour au tarif standard du site')
      }
      setEditingFamilyId(null)
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSavingRate(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Organisation</p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">Tarification</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Un tarif par site — dégressif par fratrie, mensuel fixe, forfait famille ou par séance — avec frais d&apos;inscription, mensualités par an, remise paiement annuel, et tarif spécial par famille qui prend toujours priorité.
        </p>
        {!isAdmin && (
          <p className="mt-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            Lecture seule — réservé aux administrateurs.
          </p>
        )}
      </div>

      <div className="inline-flex rounded-full border border-border bg-card p-1">
        <button type="button" onClick={() => setTab('sites')} className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${tab === 'sites' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Par site</button>
        <button type="button" onClick={() => setTab('familles')} className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${tab === 'familles' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Par famille (exceptions)</button>
      </div>

      {tab === 'sites' && (
        <div className="space-y-3">
          {sites.map((site) => {
            const rule = rulesBySite[site.id] ?? null
            const stats = siteStats.find((s) => s.siteId === site.id)
            const isEditing = editingSiteId === site.id
            return (
              <article key={site.id} className="rounded-xl border border-border bg-card p-4">
                {isEditing ? (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Tarif — {site.name}</h3>
                      <button type="button" onClick={() => setEditingSiteId(null)} className="rounded-md p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Mode de facturation</label>
                        <select
                          value={ruleForm.ui_mode}
                          onChange={(e) => setRuleForm((f) => ({ ...f, ui_mode: e.target.value as UiMode }))}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="monthly_per_child">Dégressif par fratrie (5 paliers)</option>
                          <option value="monthly_flat">Mensuel fixe par enfant (tarif unique)</option>
                          <option value="monthly_family">Forfait famille (montant fixe)</option>
                          <option value="per_session">Par séance</option>
                        </select>
                      </div>
                      {ruleForm.ui_mode === 'per_session' && (
                        <>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tarif (€ / séance / enfant)</label>
                            <input type="number" step="0.01" value={ruleForm.price_per_session} onChange={(e) => setRuleForm((f) => ({ ...f, price_per_session: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Séances par mois</label>
                            <input type="number" min="1" max="31" value={ruleForm.sessions_per_month} onChange={(e) => setRuleForm((f) => ({ ...f, sessions_per_month: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                          </div>
                        </>
                      )}
                      {ruleForm.ui_mode === 'monthly_family' && (
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Forfait (€ / mois / famille)</label>
                          <input type="number" step="0.01" value={ruleForm.price_1_child} onChange={(e) => setRuleForm((f) => ({ ...f, price_1_child: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                      )}
                      {ruleForm.ui_mode === 'monthly_flat' && (
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tarif (€ / mois / enfant)</label>
                          <input type="number" step="0.01" value={ruleForm.price_flat} onChange={(e) => setRuleForm((f) => ({ ...f, price_flat: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                      )}
                    </div>
                    {ruleForm.ui_mode === 'monthly_per_child' && (
                      <div className="mt-3">
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tarif par enfant selon la taille de la fratrie (€/mois)</label>
                        <div className="grid grid-cols-5 gap-2">
                          {([
                            ['price_1_child', '1 enfant'],
                            ['price_2_children', '2 enfants'],
                            ['price_3_children', '3 enfants'],
                            ['price_4_children', '4 enfants'],
                            ['price_5plus', '5+ enfants'],
                          ] as const).map(([key, label]) => (
                            <div key={key}>
                              <input
                                type="number" step="0.01"
                                value={ruleForm[key]}
                                onChange={(e) => setRuleForm((f) => ({ ...f, [key]: e.target.value }))}
                                placeholder={label}
                                className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                              <p className="mt-1 text-center text-[10px] text-muted-foreground">{label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Options communes à tous les modes */}
                    <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Options</p>
                      <div className="grid gap-3 sm:grid-cols-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Frais d&apos;inscription (€, une fois)</label>
                          <input type="number" step="0.01" min="0" value={ruleForm.registration_fee} onChange={(e) => setRuleForm((f) => ({ ...f, registration_fee: e.target.value }))} placeholder="0 = aucun" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Frais appliqués</label>
                          <select value={ruleForm.registration_fee_scope} onChange={(e) => setRuleForm((f) => ({ ...f, registration_fee_scope: e.target.value as 'per_child' | 'per_family' }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                            <option value="per_child">Par enfant</option>
                            <option value="per_family">Par famille</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Mensualités par an</label>
                          <input type="number" min="1" max="12" value={ruleForm.months_per_year} onChange={(e) => setRuleForm((f) => ({ ...f, months_per_year: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Remise paiement annuel (%)</label>
                          <input type="number" step="0.5" min="0" max="100" value={ruleForm.annual_discount_pct} onChange={(e) => setRuleForm((f) => ({ ...f, annual_discount_pct: e.target.value }))} placeholder="0 = aucune" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button type="button" onClick={() => setEditingSiteId(null)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><X className="h-4 w-4" />Annuler</button>
                      <button type="button" onClick={() => void saveRule(site.id)} disabled={savingRule} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"><Save className="h-4 w-4" />{savingRule ? 'Sauvegarde…' : 'Enregistrer'}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: site.color || '#6366f1' }}>
                      <Euro className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-[180px] flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{site.name}</h3>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{rule ? (isFlatRule(rule) ? 'Mensuel fixe' : MODE_LABELS[rule.billing_type]) : 'Non configuré'}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{describeRule(rule)}</p>
                    </div>
                    {stats && (
                      <div className="flex gap-4">
                        <Stat value={stats.families} label="familles" />
                        <Stat value={stats.children} label="enfants" />
                        <Stat value={`${stats.monthly.toFixed(0)}€`} label="/ mois" mono accent />
                        <Stat value={`${(stats.monthly * (rule?.months_per_year ?? 10)).toFixed(0)}€`} label="/ an" mono />
                        <Stat value={`${stats.pctRevenue}%`} label="du CA" />
                      </div>
                    )}
                    {isAdmin && (
                      <button type="button" onClick={() => startEditRule(site.id)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent">
                        <Pencil className="h-3.5 w-3.5" />Modifier
                      </button>
                    )}
                  </div>
                )}
              </article>
            )
          })}

          {sites.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <p className="font-medium">Aucun site configuré</p>
              <p className="mt-1 text-sm text-muted-foreground">Ajoute d&apos;abord un site dans l&apos;onglet Sites.</p>
            </div>
          )}

          {sites.length > 0 && (
            <div className="flex items-center gap-4 rounded-xl bg-foreground px-4 py-3 text-background">
              <span className="flex-1 text-xs font-semibold uppercase tracking-wide">Total tous sites</span>
              <Stat value={`${totalMonthly.toFixed(0)}€`} label="/ mois" mono inverted />
              <Stat
                value={`${siteStats.reduce((sum, s) => sum + s.monthly * (rulesBySite[s.siteId]?.months_per_year ?? 10), 0).toFixed(0)}€`}
                label="/ an"
                mono
                inverted
              />
            </div>
          )}
        </div>
      )}

      {tab === 'familles' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Appliquer un tarif spécial</h3>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={famSearch}
                  onChange={(e) => onFamSearch(e.target.value)}
                  placeholder="Rechercher une famille par nom, téléphone ou n° dossier…"
                  className="w-full rounded-lg border border-input bg-background py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="mt-2 flex flex-col gap-1.5">
                {famSearching && <p className="text-xs text-muted-foreground">Recherche…</p>}
                {famResults.map((f) => (
                  <button key={f.id} type="button" onClick={() => pickFamilyForRate(f)} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-xs hover:border-primary hover:bg-primary/5">
                    <span><b>{f.name}</b> — {f.students_count} enfant{f.students_count > 1 ? 's' : ''} {f.phone ? `· ${f.phone}` : ''}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{f.registration_number}</span>
                  </button>
                ))}
              </div>

              {editingFamilyId && (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="mb-2 text-xs font-semibold">{families.find((f) => f.id === editingFamilyId)?.name}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input type="number" value={rateAmount} onChange={(e) => setRateAmount(e.target.value)} placeholder="Montant mensuel forfaitaire (€)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <input value={rateNote} onChange={(e) => setRateNote(e.target.value)} placeholder="Motif (interne)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingFamilyId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent">Annuler</button>
                    <button
                      type="button"
                      disabled={savingRate}
                      onClick={() => void saveFamilyRate(editingFamilyId, Number(rateAmount) > 0 ? Number(rateAmount) : null, rateNote || null)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {savingRate ? 'Sauvegarde…' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            {families.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                <p className="font-medium">Aucune exception famille configurée</p>
                <p className="mt-1 text-sm text-muted-foreground">Toutes les familles paient le tarif standard de leur site.</p>
              </div>
            )}
            {families.map((f) => (
              <article key={f.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm">👨‍👩‍👧</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{f.students_count} enfant{f.students_count > 1 ? 's' : ''} {f.custom_rate_note ? `· ${f.custom_rate_note}` : ''} {f.registration_number ? `· ${f.registration_number}` : ''}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-primary">{f.custom_monthly_rate}€<span className="ml-1 text-[10px] font-normal text-muted-foreground">/mois</span></div>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Tarif spécial</span>
                {isAdmin && (
                  <>
                    <button type="button" onClick={() => pickFamilyForRate({ id: f.id, name: f.name, phone: null, registration_number: f.registration_number, students_count: f.students_count })} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent">Modifier</button>
                    <button type="button" onClick={() => void saveFamilyRate(f.id, null, null)} className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10">Retirer</button>
                  </>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ value, label, mono, accent, inverted }: { value: string | number; label: string; mono?: boolean; accent?: boolean; inverted?: boolean }) {
  return (
    <div className="text-center" style={{ minWidth: 52 }}>
      <div className={`text-sm font-bold ${mono ? 'font-mono' : ''} ${accent ? 'text-primary' : inverted ? 'text-background' : 'text-foreground'}`}>{value}</div>
      <div className={`text-[9px] uppercase tracking-wide ${inverted ? 'text-background/60' : 'text-muted-foreground'}`}>{label}</div>
    </div>
  )
}
