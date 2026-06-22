'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Save, Loader2, CheckCircle2, AlertCircle, Send, FlaskConical, Phone } from 'lucide-react'

interface WaSettings {
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

const DEFAULT: WaSettings = {
  production_number:   '',
  production_verified: false,
  test_number:         '',
  test_mode:           true,
  n8n_webhook_url:     '',
  n8n_enabled:         false,
  messages_sent_today: 0,
  messages_sent_month: 0,
  last_message_at:     null,
}

export function WhatsAppSettingsClient() {
  const [settings, setSettings] = useState<WaSettings>(DEFAULT)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [testPhone, setTestPhone] = useState('')
  const [testMsg, setTestMsg]   = useState('Bonjour ! Ceci est un message de test de Teacher Khati 📚')
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult]  = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/whatsapp-settings')
        const data = await res.json() as { settings?: WaSettings; error?: string }
        if (data.settings) setSettings({ ...DEFAULT, ...data.settings })
      } catch {
        setError('Impossible de charger les paramètres.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true); setSaved(false); setError(null)
    try {
      const res = await fetch('/api/whatsapp-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_mode:          settings.test_mode,
          test_number:        settings.test_number || null,
          production_number:  settings.production_number || null,
          n8n_webhook_url:    settings.n8n_webhook_url   || null,
          n8n_enabled:        settings.n8n_enabled,
        }),
      })
      const data = await res.json() as { settings?: WaSettings; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Erreur de sauvegarde')
      if (data.settings) setSettings({ ...DEFAULT, ...data.settings })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  async function sendTestMessage() {
    if (!testPhone.trim()) return
    setSendingTest(true); setTestResult(null)
    try {
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testPhone.trim(), message: testMsg }),
      })
      const data = await res.json() as { success?: boolean; simulated?: boolean; error?: string; messageId?: string }
      if (!res.ok) throw new Error(data.error ?? 'Erreur envoi')
      setTestResult({
        success: true,
        message: data.simulated
          ? `Simulation (pas de credentials) — le message serait envoyé à ${testPhone}`
          : `Envoyé ! ID: ${data.messageId ?? 'OK'}`,
      })
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Erreur' })
    } finally {
      setSendingTest(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Chargement…</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Statut ── */}
      <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${settings.test_mode ? 'bg-amber-100' : 'bg-green-100'}`}>
          <MessageCircle className={`h-5 w-5 ${settings.test_mode ? 'text-amber-600' : 'text-green-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">
            {settings.test_mode ? 'Mode test activé' : 'Mode production actif'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {settings.test_mode
              ? 'Les messages sont redirigés vers le numéro de test. Aucun parent n\'est contacté.'
              : 'Les messages sont envoyés directement aux numéros réels des parents.'}
          </p>
          {settings.messages_sent_month > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {settings.messages_sent_today} message(s) envoyé(s) aujourd'hui · {settings.messages_sent_month} ce mois
            </p>
          )}
        </div>
        <span className={`shrink-0 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${settings.test_mode ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
          {settings.test_mode ? 'TEST' : 'PROD'}
        </span>
      </div>

      {/* ── Formulaire ── */}
      <form onSubmit={save} className="rounded-xl border border-border bg-card p-5 space-y-5">
        <h2 className="text-sm font-semibold text-foreground">Configuration</h2>

        {/* Mode test toggle */}
        <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={settings.test_mode}
              onChange={(e) => setSettings((s) => ({ ...s, test_mode: e.target.checked }))}
            />
            <div className={`w-10 h-6 rounded-full transition-colors ${settings.test_mode ? 'bg-amber-400' : 'bg-gray-200'}`} />
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.test_mode ? 'left-5' : 'left-1'}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-amber-500" />
              Mode test
            </p>
            <p className="text-xs text-muted-foreground">Redirige tous les messages vers le numéro de test ci-dessous</p>
          </div>
        </label>

        {/* Numéro de test */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Numéro de test</label>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="tel"
              value={settings.test_number ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, test_number: e.target.value }))}
              placeholder="ex. +33612345678"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">Votre numéro WhatsApp personnel pour recevoir les messages de test</p>
        </div>

        {/* Numéro de production */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            Numéro de production WhatsApp Business
            {settings.production_verified && (
              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Vérifié
              </span>
            )}
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="tel"
              value={settings.production_number ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, production_number: e.target.value }))}
              placeholder="ex. +33612345678"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Le numéro enregistré dans Meta for Developers. Requis pour passer en mode production.
          </p>
        </div>

        {/* Info credentials .env */}
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Variables d'environnement requises</p>
          <div className="space-y-1 font-mono text-xs text-foreground">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">WHATSAPP_API_TOKEN</span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-sans ${process.env.NODE_ENV ? 'bg-muted' : ''}`}>
                → à configurer dans Vercel
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">WHATSAPP_PHONE_NUMBER_ID</span>
              <span className="text-xs font-sans text-muted-foreground">→ à configurer dans Vercel</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Sans ces variables, tous les messages sont simulés (mode hors-ligne). Obtenir ces valeurs dans <strong>Meta for Developers → Mon Application → WhatsApp → Configuration API</strong>.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Enregistrement…' : saved ? '✓ Enregistré' : 'Enregistrer'}
        </button>
      </form>

      {/* ── Test d'envoi ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Tester l'envoi</h2>
        <p className="text-xs text-muted-foreground">
          Envoyez un message de test pour vérifier que la configuration fonctionne.
          {settings.test_mode && ' En mode test, le message sera redirigé vers votre numéro de test.'}
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="Numéro destinataire (ex. +33612345678)"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <textarea
            value={testMsg}
            onChange={(e) => setTestMsg(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <button
            type="button"
            onClick={sendTestMessage}
            disabled={sendingTest || !testPhone.trim()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Envoyer le test
          </button>

          {testResult && (
            <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
              testResult.success ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'
            }`}>
              {testResult.success
                ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
              {testResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
