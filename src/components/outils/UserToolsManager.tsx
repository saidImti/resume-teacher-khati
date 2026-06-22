'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, ExternalLink, Loader2,
  CheckCircle2, X, ChevronDown,
} from 'lucide-react'

export interface UserTool {
  id: string
  name: string
  description: string | null
  icon_emoji: string | null
  category: string
  external_url: string | null
  webhook_url: string | null
  api_key: string | null
  is_active: boolean
  notes: string | null
  created_at: string
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'automation',    label: '⚡ Automation' },
  { value: 'crm',          label: '📋 CRM / Base de données' },
  { value: 'communication', label: '💬 Communication' },
  { value: 'stockage',      label: '☁️ Stockage' },
  { value: 'paiement',      label: '💳 Paiement' },
  { value: 'calendrier',    label: '📅 Calendrier' },
  { value: 'autre',         label: '🔧 Autre' },
]

const SUGGESTIONS = [
  { name: 'n8n',      emoji: '⚡', category: 'automation',    desc: 'Automatisation de workflows open-source' },
  { name: 'Make',     emoji: '🔄', category: 'automation',    desc: 'Automatisation visuelle (ex-Integromat)' },
  { name: 'Zapier',   emoji: '⚡', category: 'automation',    desc: 'Connecteur d\'applications no-code' },
  { name: 'Airtable', emoji: '📊', category: 'crm',           desc: 'Base de données collaborative' },
  { name: 'Notion',   emoji: '📝', category: 'crm',           desc: 'Espace de travail tout-en-un' },
  { name: 'Slack',    emoji: '💬', category: 'communication', desc: 'Messagerie d\'équipe' },
  { name: 'Discord',  emoji: '🎮', category: 'communication', desc: 'Communauté et communication' },
  { name: 'Google Drive', emoji: '📁', category: 'stockage', desc: 'Stockage et partage de fichiers' },
  { name: 'Stripe',   emoji: '💳', category: 'paiement',      desc: 'Paiements en ligne' },
  { name: 'Google Calendar', emoji: '📅', category: 'calendrier', desc: 'Agenda et planification' },
]

const EMPTY_FORM = {
  name: '', description: '', icon_emoji: '🔧',
  category: 'autre', external_url: '', webhook_url: '', api_key: '', notes: '',
  is_active: true,
}

type ToolForm = typeof EMPTY_FORM

interface Props {
  initialTools: UserTool[]
}

export function UserToolsManager({ initialTools }: Props) {
  const router = useRouter()
  const [tools, setTools] = useState<UserTool[]>(initialTools)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ToolForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setError(null)
    setShowModal(true)
    setShowSuggestions(false)
  }

  function openEdit(tool: UserTool) {
    setForm({
      name:         tool.name,
      description:  tool.description ?? '',
      icon_emoji:   tool.icon_emoji ?? '🔧',
      category:     tool.category,
      external_url: tool.external_url ?? '',
      webhook_url:  tool.webhook_url ?? '',
      api_key:      tool.api_key ?? '',
      notes:        tool.notes ?? '',
      is_active:    tool.is_active,
    })
    setEditingId(tool.id)
    setError(null)
    setShowModal(true)
    setShowSuggestions(false)
  }

  function applySuggestion(s: typeof SUGGESTIONS[number]) {
    setForm((f) => ({ ...f, name: s.name, icon_emoji: s.emoji, category: s.category, description: s.desc }))
    setShowSuggestions(false)
  }

  async function save() {
    if (!form.name.trim()) { setError('Le nom est obligatoire'); return }
    setSaving(true); setError(null)
    try {
      const payload = {
        ...form,
        external_url: form.external_url || undefined,
        webhook_url:  form.webhook_url  || undefined,
        api_key:      form.api_key      || undefined,
        description:  form.description  || undefined,
        notes:        form.notes        || undefined,
      }
      const url    = editingId ? `/api/outils/${editingId}` : '/api/outils'
      const method = editingId ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as UserTool & { error?: string }
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Erreur serveur')
      if (editingId) {
        setTools((t) => t.map((item) => item.id === editingId ? data : item))
      } else {
        setTools((t) => [...t, data])
      }
      setShowModal(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTool(id: string, name: string) {
    if (!confirm(`Supprimer "${name}" ? Cette action est irréversible.`)) return
    setDeletingId(id)
    try {
      await fetch(`/api/outils/${id}`, { method: 'DELETE' })
      setTools((t) => t.filter((item) => item.id !== id))
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  async function toggleActive(tool: UserTool) {
    const res = await fetch(`/api/outils/${tool.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !tool.is_active }),
    })
    const data = await res.json() as UserTool
    if (res.ok) setTools((t) => t.map((item) => item.id === tool.id ? data : item))
  }

  const catLabel = (cat: string) => CATEGORIES.find((c) => c.value === cat)?.label ?? cat

  return (
    <>
      {/* ── Liste des outils personnalisés ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Mes intégrations personnalisées</h2>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter un outil
          </button>
        </div>

        {tools.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-12 text-center">
            <p className="text-2xl mb-2">🔧</p>
            <p className="text-sm font-medium text-foreground">Aucune intégration ajoutée</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Ajoutez n8n, Make, Airtable, Zapier, Notion et bien d'autres.
            </p>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> Ajouter mon premier outil
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className={`group relative flex flex-col gap-3 rounded-2xl border p-4 transition-all ${
                  tool.is_active ? 'border-border bg-card' : 'border-border bg-muted/30 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl shrink-0">{tool.icon_emoji ?? '🔧'}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{tool.name}</p>
                      <p className="text-xs text-muted-foreground">{catLabel(tool.category)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => openEdit(tool)}
                      className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="Modifier"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTool(tool.id, tool.name)}
                      disabled={deletingId === tool.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                      title="Supprimer"
                    >
                      {deletingId === tool.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {tool.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{tool.description}</p>
                )}

                <div className="flex items-center gap-2 mt-auto pt-1 flex-wrap">
                  {tool.webhook_url && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-700 px-2 py-0.5 text-xs font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Webhook
                    </span>
                  )}
                  {tool.api_key && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-xs font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Clé API
                    </span>
                  )}
                  {tool.external_url && (
                    <a
                      href={tool.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground hover:text-foreground px-2 py-0.5 text-xs font-medium transition-colors ml-auto"
                    >
                      <ExternalLink className="h-3 w-3" /> Ouvrir
                    </a>
                  )}
                  <button
                    onClick={() => toggleActive(tool)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                      tool.is_active
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {tool.is_active ? 'Actif' : 'Inactif'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Ajouter / Modifier ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-background rounded-2xl border border-border shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                {editingId ? 'Modifier l\'outil' : 'Ajouter un outil'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">

              {/* Suggestions rapides */}
              {!editingId && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowSuggestions((s) => !s)}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
                    Suggestions rapides (n8n, Make, Airtable…)
                  </button>
                  {showSuggestions && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s.name}
                          type="button"
                          onClick={() => applySuggestion(s)}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors"
                        >
                          {s.emoji} {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Nom + Emoji */}
              <div className="flex gap-3">
                <div className="w-20 shrink-0">
                  <label className="text-xs font-medium text-foreground block mb-1">Icône</label>
                  <input
                    type="text"
                    value={form.icon_emoji}
                    onChange={(e) => setForm((f) => ({ ...f, icon_emoji: e.target.value }))}
                    maxLength={4}
                    className="w-full text-center text-xl rounded-xl border border-border bg-background px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="🔧"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-foreground block mb-1">Nom <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="ex. n8n, Airtable, Make…"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Description courte</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="ex. Automatisation des relances parents"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Catégorie */}
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Catégorie</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* URL externe */}
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">URL du service</label>
                <input
                  type="url"
                  value={form.external_url}
                  onChange={(e) => setForm((f) => ({ ...f, external_url: e.target.value }))}
                  placeholder="https://airtable.com"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-xs text-muted-foreground mt-0.5">Lien vers votre espace sur ce service</p>
              </div>

              {/* Webhook URL */}
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">URL Webhook</label>
                <input
                  type="url"
                  value={form.webhook_url}
                  onChange={(e) => setForm((f) => ({ ...f, webhook_url: e.target.value }))}
                  placeholder="https://hook.eu2.make.com/… ou https://n8n.example.com/webhook/…"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-xs text-muted-foreground mt-0.5">Pour n8n, Make, Zapier — l'URL que l'app peut appeler</p>
              </div>

              {/* Clé API */}
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Clé API</label>
                <input
                  type="password"
                  value={form.api_key}
                  onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
                  placeholder="pat… ou key…"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-xs text-muted-foreground mt-0.5">Pour Airtable, Notion, Slack, etc. Stockée de façon sécurisée.</p>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Usage, contexte, scénario d'automatisation…"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Actif */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  />
                  <div className={`w-9 h-5 rounded-full transition-colors ${form.is_active ? 'bg-primary' : 'bg-gray-200'}`} />
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'left-4' : 'left-0.5'}`} />
                </div>
                <span className="text-sm text-foreground">Outil actif</span>
              </label>

              {error && (
                <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl px-3 py-2">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
