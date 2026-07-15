'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CalendarClock, CheckCircle2, ChevronDown, Equal, Euro, Home, Layers, Plus, Pencil,
  Save, Search, Sparkles, Trash2, TrendingUp, Users, Wallet, X,
} from 'lucide-react'
import type { PricingRule, Site, BillingType } from '@/types'
import { FadeIn } from '@/components/ui/FadeIn'
import { cn } from '@/lib/utils'

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

const MODE_OPTIONS: Array<{ value: UiMode; label: string; description: string; icon: React.ElementType }> = [
  { value: 'monthly_per_child', label: 'Dégressif par fratrie', description: '5 paliers selon le nombre d’enfants', icon: Layers },
  { value: 'monthly_flat', label: 'Mensuel fixe', description: 'Même tarif pour chaque enfant', icon: Equal },
  { value: 'monthly_family', label: 'Forfait famille', description: 'Montant fixe, quel que soit le nombre d’enfants', icon: Home },
  { value: 'per_session', label: 'Par séance', description: 'Facturé au nombre de séances réelles', icon: CalendarClock },
]

interface RuleFormState {
  name: string
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
  is_active: boolean
  effective_from: string
  effective_until: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function emptyRuleForm(name: string): RuleFormState {
  return {
    name,
    ui_mode: 'monthly_per_child',
    price_per_session: '',
    price_flat: '',
    price_1_child: '40', price_2_children: '35', price_3_children: '30', price_4_children: '26', price_5plus: '22',
    registration_fee: '',
    registration_fee_scope: 'per_child',
    months_per_year: '10',
    sessions_per_month: '4',
    annual_discount_pct: '',
    is_active: true,
    effective_from: todayIso(),
    effective_until: '',
  }
}

function isFlatRule(rule: PricingRule): boolean {
  return rule.billing_type === 'monthly_per_child'
    && rule.price_1_child !== null
    && rule.price_1_child === rule.price_2_children
    && rule.price_1_child === rule.price_3_children
    && rule.price_1_child === rule.price_4_children
    && rule.price_1_child === rule.price_5plus
}

function ruleToForm(rule: PricingRule): RuleFormState {
  const flat = isFlatRule(rule)
  return {
    name: rule.name,
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
    is_active: rule.is_active,
    effective_from: rule.effective_from,
    effective_until: rule.effective_until ?? '',
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

function sortRules(rules: PricingRule[]): PricingRule[] {
  return [...rules].sort((a, b) => b.effective_from.localeCompare(a.effective_from))
}

// Tarif « en vigueur » : actif, deja demarre, pas encore termine, le plus
// recent en cas de chevauchement — meme convention que generate-monthly et
// GET /api/pricing-rules. Sert a l'affichage resume (badge, description)
// quand la carte du site est repliee ET au badge "En vigueur" dans la liste
// detaillee — si aucun tarif n'est reellement actif/en cours, retourne null
// (pas de repli sur le premier tarif trouve : un tarif inactif ne doit
// jamais s'afficher comme "en vigueur", meme s'il est le seul du site).
function currentRuleOf(rules: PricingRule[]): PricingRule | null {
  const today = todayIso()
  return rules.find((r) => r.is_active && r.effective_from <= today && (!r.effective_until || r.effective_until >= today)) ?? null
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function TarificationManager({
  sites, initialRules, siteStats, familiesWithSpecialRate, totalMonthly, isAdmin,
}: {
  sites: Site[]
  initialRules: { siteId: string; rules: PricingRule[] }[]
  siteStats: SiteStat[]
  familiesWithSpecialRate: FamilyRate[]
  totalMonthly: number
  isAdmin: boolean
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'sites' | 'familles'>('sites')

  const [rulesBySite, setRulesBySite] = useState<Record<string, PricingRule[]>>(() => {
    const map: Record<string, PricingRule[]> = {}
    for (const s of sites) map[s.id] = sortRules(initialRules.find((r) => r.siteId === s.id)?.rules ?? [])
    return map
  })
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<{ siteId: string; ruleId: string | null } | null>(null)
  const [ruleForm, setRuleForm] = useState<RuleFormState>(emptyRuleForm(''))
  const [savingRule, setSavingRule] = useState(false)
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null)

  const [families, setFamilies] = useState(familiesWithSpecialRate)
  const [famSearch, setFamSearch] = useState('')
  const [famResults, setFamResults] = useState<FamilySearchResult[]>([])
  const [famSearching, setFamSearching] = useState(false)
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null)
  const [rateAmount, setRateAmount] = useState('')
  const [rateNote, setRateNote] = useState('')
  const [savingRate, setSavingRate] = useState(false)

  function toggleExpanded(siteId: string) {
    setEditingKey(null)
    setExpandedSiteId((cur) => (cur === siteId ? null : siteId))
  }

  function startCreateRule(site: Site) {
    const count = (rulesBySite[site.id] ?? []).length
    setRuleForm(emptyRuleForm(count > 0 ? `Tarif ${site.name} ${count + 1}` : `Tarif ${site.name}`))
    setEditingKey({ siteId: site.id, ruleId: null })
    setExpandedSiteId(site.id)
  }

  function startEditRule(siteId: string, rule: PricingRule) {
    setRuleForm(ruleToForm(rule))
    setEditingKey({ siteId, ruleId: rule.id })
    setExpandedSiteId(siteId)
  }

  async function saveRule() {
    if (!editingKey) return
    const { siteId, ruleId } = editingKey
    // Le mode « tarif unique par enfant » (raccourci UI) se sauvegarde en
    // monthly_per_child avec les 5 paliers égaux.
    const isFlat = ruleForm.ui_mode === 'monthly_flat'
    const billingType: BillingType = ruleForm.ui_mode === 'monthly_flat' ? 'monthly_per_child' : ruleForm.ui_mode
    const payload = {
      site_id: siteId,
      name: ruleForm.name.trim() || `Tarif ${sites.find((s) => s.id === siteId)?.name ?? ''}`.trim(),
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
      is_active: ruleForm.is_active,
      effective_from: ruleForm.effective_from || todayIso(),
      effective_until: ruleForm.effective_until || null,
    }
    setSavingRule(true)
    try {
      const res = await fetch(ruleId ? `/api/pricing-rules/${ruleId}` : '/api/pricing-rules', {
        method: ruleId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Impossible de sauvegarder ce tarif'); return }
      setRulesBySite((cur) => {
        const existing = cur[siteId] ?? []
        const next = ruleId ? existing.map((r) => (r.id === ruleId ? (data as PricingRule) : r)) : [...existing, data as PricingRule]
        return { ...cur, [siteId]: sortRules(next) }
      })
      toast.success('Tarif enregistré')
      setEditingKey(null)
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSavingRule(false)
    }
  }

  async function deleteRule(siteId: string, rule: PricingRule) {
    if (!confirm(`Supprimer définitivement le tarif « ${rule.name} » ?\n\nCette action est irréversible.`)) return
    setDeletingRuleId(rule.id)
    try {
      const res = await fetch(`/api/pricing-rules/${rule.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Impossible de supprimer ce tarif')
        return
      }
      setRulesBySite((cur) => ({ ...cur, [siteId]: (cur[siteId] ?? []).filter((r) => r.id !== rule.id) }))
      toast.success('Tarif supprimé')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setDeletingRuleId(null)
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

  const configuredCount = sites.filter((s) => currentRuleOf(rulesBySite[s.id] ?? [])).length
  const totalAnnual = useMemo(
    () => siteStats.reduce((sum, s) => {
      const rule = currentRuleOf(rulesBySite[s.siteId] ?? [])
      return sum + s.monthly * (rule?.months_per_year ?? 10)
    }, 0),
    [siteStats, rulesBySite]
  )
  const revenueBars = useMemo(
    () => siteStats
      .filter((s) => s.monthly > 0)
      .map((s) => ({ stat: s, site: sites.find((site) => site.id === s.siteId) }))
      .filter((row): row is { stat: SiteStat; site: Site } => Boolean(row.site))
      .sort((a, b) => b.stat.monthly - a.stat.monthly),
    [siteStats, sites]
  )

  return (
    <div className="space-y-6">
      {/* ── HERO ── */}
      <FadeIn from="bottom">
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Tarification par organisation
                </span>
                {!isAdmin && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                    Lecture seule — réservé aux administrateurs
                  </span>
                )}
              </div>

              <div className="max-w-3xl">
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Tarification</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Crée, modifie ou supprime autant de tarifs que tu veux par site — dégressif par fratrie,
                  mensuel fixe, forfait famille ou par séance — avec frais d&apos;inscription, mensualités
                  par an, remise paiement annuel, dates de validité, et tarif spécial par famille qui prend
                  toujours priorité.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <HeroMetric icon={Layers} label="Sites" value={sites.length} helper="au total" />
                <HeroMetric icon={CheckCircle2} label="Tarifs en vigueur" value={configuredCount} helper={`sur ${sites.length} sites`} />
                <HeroMetric icon={Users} label="Tarifs spéciaux" value={families.length} helper="familles aidées" />
                <HeroMetric icon={Wallet} label="Total mensuel" value={`${totalMonthly.toFixed(0)}€`} helper="tous sites" />
              </div>
            </div>

            <div className="border-t border-border bg-muted/30 p-5 sm:p-6 lg:border-l lg:border-t-0">
              <div className="flex h-full flex-col justify-between gap-5">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Répartition du chiffre d&apos;affaires
                  </div>
                  {revenueBars.length > 0 ? (
                    <div className="space-y-3">
                      {revenueBars.slice(0, 5).map(({ stat, site }) => (
                        <div key={stat.siteId}>
                          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                            <span className="flex min-w-0 items-center gap-1.5 truncate font-medium text-foreground">
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: site.color || '#6366f1' }} />
                              <span className="truncate">{site.name}</span>
                            </span>
                            <span className="shrink-0 font-mono text-muted-foreground">{stat.pctRevenue}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-background">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.max(stat.pctRevenue, 3)}%`, backgroundColor: site.color || '#6366f1' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-background/70 p-4">
                      <p className="text-sm font-medium text-foreground">Aucun revenu suivi pour l&apos;instant</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Dès qu&apos;une famille active sera rattachée à un site tarifé, la répartition apparaîtra ici.
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-background/70 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Total annuel estimé</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{totalAnnual.toFixed(0)} €</p>
                  <p className="mt-1 text-xs text-muted-foreground">sur la base des mensualités configurées par site</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ── TAB SWITCHER ── */}
      <FadeIn delay={60} from="bottom">
        <div className="inline-flex gap-1 rounded-lg bg-muted/40 p-1">
          {([
            ['sites', 'Par site'],
            ['familles', 'Par famille (exceptions)'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition',
                tab === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </FadeIn>

      {tab === 'sites' && (
        <div className="space-y-3">
          {sites.map((site, index) => {
            const rules = rulesBySite[site.id] ?? []
            const rule = currentRuleOf(rules)
            const stats = siteStats.find((s) => s.siteId === site.id)
            const isExpanded = expandedSiteId === site.id
            const isCreatingHere = editingKey?.siteId === site.id && editingKey.ruleId === null
            const siteColor = site.color || '#6366f1'
            return (
              <FadeIn key={site.id} delay={90 + index * 45} from="bottom">
                <article className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/20">
                  {/* Résumé toujours visible */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${siteColor}22`, color: siteColor }}
                    >
                      <Euro className="h-5 w-5" />
                    </div>
                    <div className="min-w-[200px] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{site.name}</h3>
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          rule ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        )}>
                          {rule ? (isFlatRule(rule) ? 'Mensuel fixe' : MODE_LABELS[rule.billing_type]) : 'Non configuré'}
                        </span>
                        {rules.length > 1 && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {rules.length} tarifs
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{describeRule(rule)}</p>
                      {stats && stats.pctRevenue > 0 && (
                        <div className="mt-2 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(stats.pctRevenue, 3)}%`, backgroundColor: siteColor }} />
                        </div>
                      )}
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
                      <button
                        type="button"
                        onClick={() => toggleExpanded(site.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:border-primary/40 hover:bg-accent"
                      >
                        Gérer les tarifs ({rules.length})
                        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')} />
                      </button>
                    )}
                  </div>

                  {/* Panneau de gestion complète (créer / modifier / supprimer) */}
                  {isExpanded && isAdmin && (
                    <div className="mt-4 space-y-2 border-t border-border pt-4">
                      {rules.length === 0 && !isCreatingHere && (
                        <p className="text-sm text-muted-foreground">Aucun tarif pour ce site pour le moment.</p>
                      )}

                      {rules.map((r) => (
                        editingKey?.ruleId === r.id ? (
                          <RuleEditor
                            key={r.id}
                            form={ruleForm}
                            setForm={setRuleForm}
                            saving={savingRule}
                            onSave={() => void saveRule()}
                            onCancel={() => setEditingKey(null)}
                          />
                        ) : (
                          <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">{r.name}</p>
                                <span className={cn(
                                  'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                  r.is_active
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : 'bg-muted text-muted-foreground'
                                )}>
                                  {r.is_active ? 'Actif' : 'Inactif'}
                                </span>
                                {r === rule && (
                                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">En vigueur</span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">{describeRule(r)}</p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                Depuis le {formatDate(r.effective_from)}
                                {r.effective_until ? ` jusqu'au ${formatDate(r.effective_until)}` : ''}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                onClick={() => startEditRule(site.id, r)}
                                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition hover:border-primary/40 hover:bg-accent"
                              >
                                <Pencil className="h-3.5 w-3.5" />Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteRule(site.id, r)}
                                disabled={deletingRuleId === r.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-2.5 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
                              >
                                <Trash2 className="h-3.5 w-3.5" />{deletingRuleId === r.id ? 'Suppression…' : 'Supprimer'}
                              </button>
                            </div>
                          </div>
                        )
                      ))}

                      {isCreatingHere ? (
                        <RuleEditor
                          form={ruleForm}
                          setForm={setRuleForm}
                          saving={savingRule}
                          onSave={() => void saveRule()}
                          onCancel={() => setEditingKey(null)}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startCreateRule(site)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                        >
                          <Plus className="h-3.5 w-3.5" />Nouveau tarif pour {site.name}
                        </button>
                      )}
                    </div>
                  )}
                </article>
              </FadeIn>
            )
          })}

          {sites.length === 0 && (
            <FadeIn delay={90} from="bottom">
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                <p className="font-medium text-foreground">Aucun site configuré</p>
                <p className="mt-1 text-sm text-muted-foreground">Ajoute d&apos;abord un site dans l&apos;onglet Sites.</p>
              </div>
            </FadeIn>
          )}

          {sites.length > 0 && (
            <FadeIn delay={90 + sites.length * 45} from="bottom">
              <div className="flex items-center gap-4 rounded-xl bg-foreground px-4 py-3 text-background">
                <span className="flex-1 text-xs font-semibold uppercase tracking-wide">Total tous sites</span>
                <Stat value={`${totalMonthly.toFixed(0)}€`} label="/ mois" mono inverted />
                <Stat value={`${totalAnnual.toFixed(0)}€`} label="/ an" mono inverted />
              </div>
            </FadeIn>
          )}
        </div>
      )}

      {tab === 'familles' && (
        <div className="space-y-4">
          {isAdmin && (
            <FadeIn delay={90} from="bottom">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Users className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Appliquer un tarif spécial</h3>
                </div>
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
                    <button key={f.id} type="button" onClick={() => pickFamilyForRate(f)} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-xs transition hover:border-primary hover:bg-primary/5">
                      <span><b>{f.name}</b> — {f.students_count} enfant{f.students_count > 1 ? 's' : ''} {f.phone ? `· ${f.phone}` : ''}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{f.registration_number}</span>
                    </button>
                  ))}
                </div>

                {editingFamilyId && (
                  <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="mb-2 text-xs font-semibold text-foreground">{families.find((f) => f.id === editingFamilyId)?.name}</p>
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
            </FadeIn>
          )}

          <div className="space-y-2">
            {families.length === 0 && (
              <FadeIn delay={130} from="bottom">
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                  <p className="font-medium text-foreground">Aucune exception famille configurée</p>
                  <p className="mt-1 text-sm text-muted-foreground">Toutes les familles paient le tarif standard de leur site.</p>
                </div>
              </FadeIn>
            )}
            {families.map((f, index) => (
              <FadeIn key={f.id} delay={130 + index * 45} from="bottom">
                <article className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm">👨‍👩‍👧</div>
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
              </FadeIn>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RuleEditor({
  form, setForm, saving, onSave, onCancel,
}: {
  form: RuleFormState
  setForm: React.Dispatch<React.SetStateAction<RuleFormState>>
  saving: boolean
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Nom du tarif (ex. Tarif standard, Tarif solidaire…)"
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button type="button" onClick={onCancel} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Mode de facturation</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODE_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const active = form.ui_mode === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, ui_mode: opt.value }))}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3 text-left transition',
                  active
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border bg-background hover:border-primary/30'
                )}
              >
                <div className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className={cn('text-sm font-semibold', active ? 'text-primary' : 'text-foreground')}>{opt.label}</p>
                  <p className="text-xs leading-4 text-muted-foreground">{opt.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {form.ui_mode === 'per_session' && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Tarif (€ / séance / enfant)">
            <input type="number" step="0.01" value={form.price_per_session} onChange={(e) => setForm((f) => ({ ...f, price_per_session: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Séances par mois">
            <input type="number" min="1" max="31" value={form.sessions_per_month} onChange={(e) => setForm((f) => ({ ...f, sessions_per_month: e.target.value }))} className={inputCls} />
          </Field>
        </div>
      )}
      {form.ui_mode === 'monthly_family' && (
        <div className="mt-3">
          <Field label="Forfait (€ / mois / famille)">
            <input type="number" step="0.01" value={form.price_1_child} onChange={(e) => setForm((f) => ({ ...f, price_1_child: e.target.value }))} className={inputCls} />
          </Field>
        </div>
      )}
      {form.ui_mode === 'monthly_flat' && (
        <div className="mt-3">
          <Field label="Tarif (€ / mois / enfant)">
            <input type="number" step="0.01" value={form.price_flat} onChange={(e) => setForm((f) => ({ ...f, price_flat: e.target.value }))} className={inputCls} />
          </Field>
        </div>
      )}
      {form.ui_mode === 'monthly_per_child' && (
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
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={label}
                  className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="mt-1 text-center text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Options avancées */}
      <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Options avancées</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Frais d'inscription (€, une fois)">
            <input type="number" step="0.01" min="0" value={form.registration_fee} onChange={(e) => setForm((f) => ({ ...f, registration_fee: e.target.value }))} placeholder="0 = aucun" className={inputCls} />
          </Field>
          <Field label="Frais appliqués">
            <select value={form.registration_fee_scope} onChange={(e) => setForm((f) => ({ ...f, registration_fee_scope: e.target.value as 'per_child' | 'per_family' }))} className={inputCls}>
              <option value="per_child">Par enfant</option>
              <option value="per_family">Par famille</option>
            </select>
          </Field>
          <Field label="Mensualités par an">
            <input type="number" min="1" max="12" value={form.months_per_year} onChange={(e) => setForm((f) => ({ ...f, months_per_year: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Remise paiement annuel (%)">
            <input type="number" step="0.5" min="0" max="100" value={form.annual_discount_pct} onChange={(e) => setForm((f) => ({ ...f, annual_discount_pct: e.target.value }))} placeholder="0 = aucune" className={inputCls} />
          </Field>
        </div>
      </div>

      {/* Validité */}
      <div className="mt-3 rounded-xl border border-border bg-muted/20 p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Validité</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="En vigueur à partir du">
            <input type="date" value={form.effective_from} onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Jusqu'au (optionnel)">
            <input type="date" value={form.effective_until} onChange={(e) => setForm((f) => ({ ...f, effective_until: e.target.value }))} className={inputCls} />
          </Field>
          <label className="flex items-center gap-2 self-end rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 rounded border-input" />
            Tarif actif
          </label>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">
          <X className="h-4 w-4" />Annuler
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />{saving ? 'Sauvegarde…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

function HeroMetric({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  helper: string
}) {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
        <p className="pb-1 text-[11px] text-muted-foreground">{helper}</p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
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

const inputCls = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
