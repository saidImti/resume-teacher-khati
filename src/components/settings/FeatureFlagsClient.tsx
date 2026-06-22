'use client'

// ─── Dashboard Feature Flags ──────────────────────────────────────────────────
// Contrôle par fonctionnalité : visible pour Teacher / visible pour Parents
// + Configuration WhatsApp (mode test, numéro test, N8N webhook)

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Check, AlertCircle, MessageSquare, ShieldCheck,
  Users, Eye, EyeOff, Smartphone, Zap, TestTube2, Info,
  ClipboardCheck, FileText, TrendingUp, Star, Passport,
  Timer, Rss, Brain, Mic, QrCode, Globe, CreditCard, BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────
interface FeatureFlag {
  feature_key:          string
  label:                string
  description:          string
  category:             string
  icon:                 string
  sort_order:           number
  enabled_for_teacher:  boolean
  enabled_for_parents:  boolean
}

interface WhatsAppSettings {
  production_number:   string | null
  production_verified: boolean
  test_number:         string | null
  test_mode:           boolean
  n8n_webhook_url:     string | null
  n8n_enabled:         boolean
  messages_sent_today: number
  messages_sent_month: number
  last_message_at:     string | null
}

// ─── Icônes par clé ───────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ClipboardCheck, FileText, MessageSquare, TrendingUp, Star,
  ShieldCheck, Timer, Rss, Brain, Mic, QrCode, Globe, CreditCard, BarChart3,
  Passport: Globe,
}

function FeatureIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICON_MAP[icon] ?? Zap
  return <Icon className={className} />
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function FeatureFlagsClient() {
  const [flags, setFlags]         = useState<FeatureFlag[]>([])
  const [settings, setSettings]   = useState<WhatsAppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [toggling, setToggling]   = useState<string | null>(null)
  const [savingWA, setSavingWA]   = useState(false)
  const [toast, setToast]         = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  // Formulaire WhatsApp
  const [waForm, setWaForm] = useState({
    test_number:     '',
    production_number: '',
    n8n_webhook_url: '',
    n8n_enabled:     false,
    test_mode:       true,
  })

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [flagsRes, waRes] = await Promise.all([
        fetch('/api/feature-flags'),
        fetch('/api/whatsapp-settings'),
      ])
      const flagsData = await flagsRes.json() as { flags?: FeatureFlag[] }
      const waData    = await waRes.json() as { settings?: WhatsAppSettings }

      setFlags(flagsData.flags ?? [])
      if (waData.settings) {
        setSettings(waData.settings)
        setWaForm({
          test_number:       waData.settings.test_number ?? '',
          production_number: waData.settings.production_number ?? '',
          n8n_webhook_url:   waData.settings.n8n_webhook_url ?? '',
          n8n_enabled:       waData.settings.n8n_enabled,
          test_mode:         waData.settings.test_mode,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  // Toggle un flag (teacher ou parents)
  async function handleToggle(
    flag: FeatureFlag,
    field: 'enabled_for_teacher' | 'enabled_for_parents',
  ) {
    const key = `${flag.feature_key}:${field}`
    setToggling(key)
    try {
      const newValue = !flag[field]
      const res = await fetch('/api/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_key: flag.feature_key, field, value: newValue }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { showToast('err', data.error ?? 'Erreur'); return }
      setFlags((prev) => prev.map((f) =>
        f.feature_key === flag.feature_key ? { ...f, [field]: newValue } : f
      ))
    } finally {
      setToggling(null)
    }
  }

  // Sauvegarder settings WhatsApp
  async function handleSaveWhatsApp() {
    setSavingWA(true)
    try {
      const res = await fetch('/api/whatsapp-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_mode:         waForm.test_mode,
          test_number:       waForm.test_number || undefined,
          production_number: waForm.production_number || undefined,
          n8n_webhook_url:   waForm.n8n_webhook_url || undefined,
          n8n_enabled:       waForm.n8n_enabled,
        }),
      })
      const data = await res.json() as { settings?: WhatsAppSettings; error?: string }
      if (!res.ok) { showToast('err', data.error ?? 'Erreur'); return }
      setSettings(data.settings ?? null)
      showToast('ok', 'Paramètres WhatsApp sauvegardés')
    } finally {
      setSavingWA(false)
    }
  }

  // Grouper par catégorie
  const byCategory = flags.reduce<Record<string, FeatureFlag[]>>((acc, f) => {
    ;(acc[f.category] ??= []).push(f)
    return acc
  }, {})

  const categoryLabels: Record<string, string> = {
    core:          '🏫 Fonctionnalités de base',
    engagement:    '🌟 Engagement élèves',
    communication: '📲 Communication parents',
    admin:         '⚙️ Administration',
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg',
          toast.type === 'ok' ? 'bg-green-500 text-white' : 'bg-destructive text-destructive-foreground'
        )}>
          {toast.type === 'ok' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-primary">Déploiement progressif</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Toutes les fonctionnalités sont actives pour <strong>Teacher</strong> dès maintenant.
            Activez-les pour les <strong>Parents</strong> quand vous vous sentez prête — elles
            n'apparaîtront pas dans leur espace tant que vous ne les activez pas.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ─── Feature flags par catégorie ─────────────────────────────── */}
          {Object.entries(byCategory).map(([cat, catFlags]) => (
            <section key={cat} className="space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {categoryLabels[cat] ?? cat}
              </h2>

              {/* En-têtes colonnes */}
              <div className="grid grid-cols-[1fr_80px_80px] gap-3 px-4 pb-1">
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Fonctionnalité</span>
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider text-center flex items-center justify-center gap-1">
                  <Eye className="h-3 w-3" /> Teacher
                </span>
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider text-center flex items-center justify-center gap-1">
                  <Users className="h-3 w-3" /> Parents
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                {catFlags.map((flag) => (
                  <FlagRow
                    key={flag.feature_key}
                    flag={flag}
                    toggling={toggling}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </section>
          ))}

          {/* ─── WhatsApp Config ───────────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              📱 Configuration WhatsApp
            </h2>

            <div className="rounded-xl border border-border bg-card p-5 space-y-5">
              {/* Mode test */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <TestTube2 className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-medium text-foreground">Mode test</p>
                    {waForm.test_mode && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase">
                        Actif
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    En mode test, <strong>tous</strong> les messages sont envoyés à votre numéro test
                    — jamais aux vrais parents. Désactivez seulement quand vous êtes 100% prête.
                  </p>
                </div>
                <ToggleSwitch
                  checked={waForm.test_mode}
                  onChange={(v) => setWaForm({ ...waForm, test_mode: v })}
                  colorOn="#f59e0b"
                />
              </div>

              {/* Numéro test */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-amber-500" />
                  Numéro test (votre WhatsApp perso)
                </label>
                <input
                  value={waForm.test_number}
                  onChange={(e) => setWaForm({ ...waForm, test_number: e.target.value })}
                  placeholder="+33612345678"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                />
                <p className="text-[10px] text-muted-foreground">Format international : +33...</p>
              </div>

              <div className="border-t border-border pt-4 space-y-4">
                {/* Numéro de production */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-2">
                    <ShieldCheck className={cn('h-3.5 w-3.5', settings?.production_verified ? 'text-green-500' : 'text-muted-foreground')} />
                    Numéro WhatsApp Business (production)
                    {settings?.production_verified && (
                      <span className="text-[10px] text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                        Vérifié
                      </span>
                    )}
                  </label>
                  <input
                    value={waForm.production_number}
                    onChange={(e) => setWaForm({ ...waForm, production_number: e.target.value })}
                    placeholder="+33600000000"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                  />
                </div>

                {/* N8N */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-purple-500" />
                      N8N Webhook (votre automation Hostinger)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{waForm.n8n_enabled ? 'Activé' : 'Désactivé'}</span>
                      <ToggleSwitch
                        checked={waForm.n8n_enabled}
                        onChange={(v) => setWaForm({ ...waForm, n8n_enabled: v })}
                        colorOn="#8b5cf6"
                      />
                    </div>
                  </div>
                  <input
                    value={waForm.n8n_webhook_url}
                    onChange={(e) => setWaForm({ ...waForm, n8n_webhook_url: e.target.value })}
                    placeholder="https://votre-n8n.hostinger.com/webhook/..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Stats */}
              {settings && (
                <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-4 flex-wrap">
                  <Stat label="Aujourd'hui" value={settings.messages_sent_today} />
                  <Stat label="Ce mois" value={settings.messages_sent_month} />
                  {settings.last_message_at && (
                    <Stat
                      label="Dernier message"
                      value={new Date(settings.last_message_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    />
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button size="sm" onClick={handleSaveWhatsApp} disabled={savingWA}>
                  {savingWA ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <>
                      <Check className="mr-1.5 h-4 w-4" />
                      Sauvegarder WhatsApp
                    </>
                  )}
                </Button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

// ─── Ligne d'un flag ──────────────────────────────────────────────────────────
function FlagRow({
  flag, toggling, onToggle,
}: {
  flag:     FeatureFlag
  toggling: string | null
  onToggle: (flag: FeatureFlag, field: 'enabled_for_teacher' | 'enabled_for_parents') => void
}) {
  const tKey = `${flag.feature_key}:enabled_for_teacher`
  const pKey = `${flag.feature_key}:enabled_for_parents`

  return (
    <div className="grid grid-cols-[1fr_80px_80px] gap-3 items-center px-4 py-3 hover:bg-accent/30 transition-colors">
      {/* Info */}
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FeatureIcon icon={flag.icon} className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{flag.label}</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{flag.description}</p>
        </div>
      </div>

      {/* Toggle Teacher */}
      <div className="flex justify-center">
        {toggling === tKey ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <ToggleSwitch
            checked={flag.enabled_for_teacher}
            onChange={() => onToggle(flag, 'enabled_for_teacher')}
          />
        )}
      </div>

      {/* Toggle Parents */}
      <div className="flex justify-center">
        {toggling === pKey ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <ToggleSwitch
            checked={flag.enabled_for_parents}
            onChange={() => onToggle(flag, 'enabled_for_parents')}
            colorOn="#22c55e"
          />
        )}
      </div>
    </div>
  )
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function ToggleSwitch({
  checked, onChange, colorOn = '#6366f1',
}: {
  checked:  boolean
  onChange: (v: boolean) => void
  colorOn?: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none',
        'focus-visible:ring-2 focus-visible:ring-primary/40'
      )}
      style={{ background: checked ? colorOn : 'var(--muted)' }}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-1'
        )}
      />
    </button>
  )
}

// ─── Stat ─────────────────────────────────────────────────────────────────────
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}
