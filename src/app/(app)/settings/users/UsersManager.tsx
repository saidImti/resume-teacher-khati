'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Plus, Trash2, Pencil, X, Check, UserCircle2,
  ShieldCheck, GraduationCap, Crown, Mail, Lock,
  User, RefreshCw, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────
interface AppUser {
  id: string
  email: string
  role: 'admin' | 'teacher' | 'viewer'
  displayName: string | null
  createdAt: string
  lastSignIn: string | null
  confirmed: boolean
  banned: boolean
}

// ── Rôles ─────────────────────────────────────────────────────────────────
const ROLES = [
  {
    value: 'admin',
    label: 'Administrateur',
    desc: 'Accès complet — gère tout',
    icon: Crown,
    color: 'text-amber-600',
    bg:    'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
  },
  {
    value: 'teacher',
    label: 'Enseignant',
    desc: 'Crée des résumés, gère ses cours',
    icon: GraduationCap,
    color: 'text-primary',
    bg:    'bg-primary/5 border-primary/20',
    badge: 'bg-primary/10 text-primary',
  },
  {
    value: 'viewer',
    label: 'Observateur',
    desc: 'Lecture seule',
    icon: ShieldCheck,
    color: 'text-slate-500',
    bg:    'bg-slate-50 border-slate-200',
    badge: 'bg-slate-100 text-slate-600',
  },
] as const

type Role = typeof ROLES[number]['value']

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find((x) => x.value === role) ?? ROLES[1]
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', r.badge)}>
      <r.icon className="h-3 w-3" />
      {r.label}
    </span>
  )
}

function Avatar({ name, email, size = 'md' }: { name?: string | null; email?: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : (email?.[0] ?? '?').toUpperCase()

  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' }
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-amber-600',
    'from-pink-500 to-rose-600',
  ]
  const colorIdx = (email?.charCodeAt(0) ?? 0) % colors.length

  return (
    <div className={cn(
      'rounded-2xl bg-gradient-to-br flex items-center justify-center font-bold text-white shrink-0 shadow-sm',
      sizes[size],
      colors[colorIdx]
    )}>
      {initials}
    </div>
  )
}

// ── Formulaire de création ─────────────────────────────────────────────────
interface CreateFormProps {
  onCreated: (u: AppUser) => void
  onCancel: () => void
}

function CreateUserForm({ onCreated, onCancel }: CreateFormProps) {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [displayName, setDisplay] = useState('')
  const [role, setRole]           = useState<Role>('teacher')
  const [loading, setLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error('Email et mot de passe requis')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName, role }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success(`Compte créé pour ${email}`)
      onCreated(data.user)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-6 space-y-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <UserCircle2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Nouveau compte</h3>
          <p className="text-xs text-muted-foreground">Le compte sera immédiatement actif</p>
        </div>
      </div>

      {/* Champs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="u-name">Prénom / Pseudo</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="u-name"
              placeholder="Teacher Khati"
              value={displayName}
              onChange={(e) => setDisplay(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="u-email">Email <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="u-email"
              type="email"
              placeholder="prof@ecole.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="u-pwd">Mot de passe <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="u-pwd"
              type="password"
              placeholder="8 caractères minimum"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9"
              required
              minLength={8}
            />
          </div>
          {password.length > 0 && password.length < 8 && (
            <p className="text-xs text-destructive">Trop court — 8 caractères minimum</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Rôle</Label>
          <div className="flex gap-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={cn(
                  'flex-1 rounded-xl border-2 px-2 py-1.5 text-center transition-all',
                  role === r.value ? `${r.bg} ${r.color}` : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted'
                )}
              >
                <r.icon className="h-4 w-4 mx-auto mb-0.5" />
                <span className="text-xs font-medium block leading-tight">{r.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={loading} className="gap-2">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Créer le compte
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button>
      </div>
    </form>
  )
}

// ── Carte utilisateur ──────────────────────────────────────────────────────
interface UserCardProps {
  user: AppUser
  currentUserId?: string
  onUpdated: (u: AppUser) => void
  onDeleted: (id: string) => void
}

function UserCard({ user, currentUserId, onUpdated, onDeleted }: UserCardProps) {
  const [editing, setEditing]       = useState(false)
  const [delConfirm, setDelConfirm] = useState(false)
  const [name, setName]             = useState(user.displayName ?? '')
  const [role, setRole]             = useState<Role>(user.role as Role)
  const [password, setPassword]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)

  const isSelf = user.id === currentUserId

  async function handleSave() {
    setSaving(true)
    try {
      const body: Record<string, string> = { displayName: name, role }
      if (password.length >= 8) body.password = password

      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      onUpdated({ ...user, ...data.user })
      setEditing(false)
      setPassword('')
      toast.success('Compte mis à jour')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); toast.error(d.error); return }
      onDeleted(user.id)
      toast.success('Compte supprimé')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={cn(
      'rounded-2xl border bg-card p-4 transition-all',
      editing ? 'ring-2 ring-primary/30 shadow-md' : 'hover:shadow-sm',
      isSelf && 'border-primary/30'
    )}>
      <div className="flex items-start gap-3">
        <Avatar name={user.displayName} email={user.email} />

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Prénom / Pseudo</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nom affiché"
                    className="h-8 text-sm"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nouveau mot de passe</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Laisser vide = inchangé"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Rôle</Label>
                <div className="flex gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      disabled={isSelf}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all',
                        role === r.value ? `${r.bg} ${r.color}` : 'border-transparent bg-muted/40 text-muted-foreground',
                        isSelf && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      <r.icon className="h-3 w-3" />
                      {r.label}
                    </button>
                  ))}
                </div>
                {isSelf && <p className="text-xs text-muted-foreground">Vous ne pouvez pas changer votre propre rôle.</p>}
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 gap-1.5">
                  {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Enregistrer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setPassword('') }} className="h-7">
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">
                  {user.displayName ?? user.email?.split('@')[0]}
                </span>
                <RoleBadge role={user.role} />
                {isSelf && (
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                    Vous
                  </span>
                )}
                {!user.confirmed && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                    Non confirmé
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Créé le {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                {user.lastSignIn && ` · Dernière connexion ${new Date(user.lastSignIn).toLocaleDateString('fr-FR')}`}
              </p>
            </>
          )}
        </div>

        {!editing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Modifier"
            >
              <Pencil className="h-4 w-4" />
            </button>

            {!isSelf && !delConfirm && (
              <button
                onClick={() => setDelConfirm(true)}
                className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            {delConfirm && (
              <div className="flex items-center gap-1 bg-destructive/10 rounded-xl px-2 py-1">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-xs text-destructive font-medium">Supprimer ?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="ml-1 p-1 rounded-lg bg-destructive text-white hover:bg-destructive/80 transition-colors"
                >
                  {deleting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                </button>
                <button
                  onClick={() => setDelConfirm(false)}
                  className="p-1 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Composant principal ─────────────────────────────────────────────────────
export function UsersManager({ currentUserId }: { currentUserId?: string }) {
  const [users, setUsers]       = useState<AppUser[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      setUsers(data.users)
    } catch {
      toast.error('Impossible de charger les comptes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  function handleCreated(u: AppUser) {
    setUsers((prev) => [u, ...prev])
    setShowForm(false)
  }

  function handleUpdated(u: AppUser) {
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, ...u } : x))
  }

  function handleDeleted(id: string) {
    setUsers((prev) => prev.filter((x) => x.id !== id))
  }

  const adminCount = users.filter((u) => u.role === 'admin').length

  return (
    <div className="space-y-6">

      {/* ── Stats rapides ── */}
      {!loading && users.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {ROLES.map((r) => {
            const count = users.filter((u) => u.role === r.value).length
            return (
              <div key={r.value} className={cn('rounded-2xl border-2 p-4 space-y-1', r.bg)}>
                <r.icon className={cn('h-5 w-5', r.color)} />
                <p className="text-2xl font-bold">{count}</p>
                <p className={cn('text-xs font-medium', r.color)}>{r.label}{count > 1 ? 's' : ''}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Avertissement si dernier admin ── */}
      {adminCount <= 1 && !loading && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Il n&apos;y a qu&apos;un seul administrateur. Crée un second compte admin pour éviter tout blocage.</span>
        </div>
      )}

      {/* ── Bouton + Formulaire ── */}
      {showForm ? (
        <CreateUserForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
      ) : (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Créer un compte
        </Button>
      )}

      {/* ── Liste ── */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-muted/30 h-20 animate-pulse" />
          ))
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/30 p-10 text-center space-y-2">
            <UserCircle2 className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Aucun compte trouvé.</p>
          </div>
        ) : (
          users.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              currentUserId={currentUserId}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))
        )}
      </div>

    </div>
  )
}
