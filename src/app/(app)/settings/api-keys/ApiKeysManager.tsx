'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Copy, Trash2, Eye, EyeOff, Key, Zap, CheckCircle2, Clock, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────
interface ApiKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  is_active: boolean
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

const SCOPE_LABELS: Record<string, { label: string; color: string }> = {
  read:  { label: 'Lecture',    color: 'bg-blue-100 text-blue-700' },
  write: { label: 'Écriture',   color: 'bg-amber-100 text-amber-700' },
  admin: { label: 'Admin',      color: 'bg-red-100 text-red-700' },
}

// ── Composant principal ───────────────────────────────────────
export function ApiKeysManager() {
  const [keys, setKeys]         = useState<ApiKey[]>([])
  const [loading, setLoading]   = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newKey, setNewKey]     = useState<string | null>(null)
  const [showRaw, setShowRaw]   = useState(false)

  // Formulaire
  const [name, setName]           = useState('')
  const [scopes, setScopes]       = useState<string[]>(['read'])

  const loadKeys = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/keys')
      const data = await res.json()
      setKeys(data.keys ?? [])
    } catch {
      toast.error('Impossible de charger les clés')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadKeys() }, [loadKeys])

  // ── Créer une clé ─────────────────────────────────────────
  async function handleCreate() {
    if (!name.trim()) { toast.error('Donne un nom à cette clé'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), scopes }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }

      setNewKey(data.key)
      setShowForm(false)
      setName('')
      setScopes(['read'])
      await loadKeys()
      toast.success('Clé créée ! Sauvegarde-la maintenant.')
    } catch {
      toast.error('Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }

  // ── Révoquer une clé ─────────────────────────────────────
  async function handleRevoke(id: string, keyName: string) {
    if (!confirm(`Révoquer la clé "${keyName}" ? Cette action est irréversible.`)) return
    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Erreur lors de la révocation'); return }
      setKeys(k => k.filter(x => x.id !== id))
      toast.success('Clé révoquée')
    } catch {
      toast.error('Erreur réseau')
    }
  }

  // ── Copier dans le presse-papiers ─────────────────────────
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success('Copié !'))
  }

  // ── Toggle scope ─────────────────────────────────────────
  function toggleScope(scope: string) {
    setScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Bannière clé nouvelle ── */}
      {newKey && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-semibold">
            <Shield className="h-5 w-5" />
            Sauvegarde cette clé maintenant — elle ne sera plus affichée !
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-white border border-amber-200 px-3 py-2 text-sm font-mono break-all">
              {showRaw ? newKey : newKey.replace(/./g, '•')}
            </code>
            <button onClick={() => setShowRaw(v => !v)} className="p-2 text-amber-700 hover:bg-amber-100 rounded-lg">
              {showRaw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button onClick={() => copyToClipboard(newKey)} className="p-2 text-amber-700 hover:bg-amber-100 rounded-lg">
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setNewKey(null)} className="border-amber-300">
            J&apos;ai sauvegardé la clé
          </Button>
        </div>
      )}

      {/* ── Formulaire de création ── */}
      {showForm ? (
        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <h3 className="font-semibold">Nouvelle clé API</h3>

          <div className="space-y-1.5">
            <Label htmlFor="key-name">Nom (ex : &quot;n8n production&quot;)</Label>
            <Input
              id="key-name"
              placeholder="Mon intégration n8n"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="flex gap-2">
              {Object.entries(SCOPE_LABELS).map(([s, { label, color }]) => (
                <button
                  key={s}
                  onClick={() => toggleScope(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all',
                    scopes.includes(s)
                      ? `${color} border-current`
                      : 'bg-muted text-muted-foreground border-transparent'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Lecture = GET uniquement · Écriture = POST/PATCH · Admin = tout
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreate} loading={creating} className="gap-2">
              <Plus className="h-4 w-4" />
              Générer la clé
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Créer une clé API
        </Button>
      )}

      {/* ── Liste des clés ── */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground animate-pulse">Chargement…</div>
        ) : keys.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/30 p-8 text-center space-y-2">
            <Key className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Aucune clé API. Crée-en une pour connecter n8n, Make ou Zapier.</p>
          </div>
        ) : (
          keys.map(key => (
            <div key={key.id} className={cn(
              'rounded-2xl border bg-card p-4 flex items-start gap-4',
              !key.is_active && 'opacity-50'
            )}>
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-primary" />
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{key.name}</span>
                  {!key.is_active && (
                    <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Révoquée</span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{key.key_prefix}</code>
                  {key.scopes.map(s => (
                    <span key={s} className={cn('text-xs px-2 py-0.5 rounded-full font-medium', SCOPE_LABELS[s]?.color)}>
                      {SCOPE_LABELS[s]?.label ?? s}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Créée le {new Date(key.created_at).toLocaleDateString('fr-FR')}
                  </span>
                  {key.last_used_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Utilisée le {new Date(key.last_used_at).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleRevoke(key.id, key.name)}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                title="Révoquer cette clé"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* ── Guide d'utilisation ── */}
      <div className="rounded-2xl border bg-muted/30 p-5 space-y-3">
        <h3 className="font-semibold text-sm">Comment utiliser ta clé API</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Ajoute le header suivant à chaque requête vers <code className="bg-muted px-1 rounded text-xs">https://ton-site.com/api/*</code> :</p>
          <pre className="bg-background border rounded-lg p-3 text-xs overflow-x-auto">
{`X-API-Key: rtk_xxxxx...

# Ou avec Authorization :
Authorization: Bearer rtk_xxxxx...`}
          </pre>
          <p className="font-medium text-foreground">Endpoints disponibles :</p>
          <ul className="space-y-1 text-xs font-mono">
            <li><span className="text-emerald-600">GET</span>  /api/resumes/list — liste les résumés</li>
            <li><span className="text-blue-600">POST</span> /api/resumes/generate — générer un résumé</li>
            <li><span className="text-emerald-600">GET</span>  /api/groups — liste les groupes</li>
            <li><span className="text-emerald-600">GET</span>  /api/padlet/my-boards — liste les Padlets</li>
          </ul>
        </div>
      </div>

    </div>
  )
}
