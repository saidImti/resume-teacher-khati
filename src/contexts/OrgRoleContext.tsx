'use client'

// ─── Contexte Rôle Organisation ───────────────────────────────────────────────
// Fournit le rôle du membre courant (admin / teacher / viewer) à toute l'app,
// injecté côté serveur par AppShell (getOrgContext) — aucun fetch client.
//
// Gating UI uniquement : masquer les boutons de mutation pour un viewer.
// L'enforcement réel est la RLS org + les 403 des routes API.

import { createContext, useContext, type ReactNode } from 'react'
import type { OrgRole } from '@/lib/with-api-auth'

interface OrgRoleContextValue {
  role: OrgRole
  /** admin + teacher : peut créer/modifier le pédagogique et les élèves. */
  canWrite: boolean
  /** admin : config, finances, marque, utilisateurs. */
  isAdmin: boolean
}

const OrgRoleContext = createContext<OrgRoleContextValue>({
  role: 'viewer',
  canWrite: false,
  isAdmin: false,
})

export function OrgRoleProvider({ role, children }: { role: OrgRole; children: ReactNode }) {
  return (
    <OrgRoleContext.Provider
      value={{ role, canWrite: role === 'admin' || role === 'teacher', isAdmin: role === 'admin' }}
    >
      {children}
    </OrgRoleContext.Provider>
  )
}

export function useOrgRole() {
  return useContext(OrgRoleContext)
}
