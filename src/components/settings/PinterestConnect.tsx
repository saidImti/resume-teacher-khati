'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ExternalLink, LogOut, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  connected: boolean
  username?: string | null
  profileUrl?: string | null
  connectedAt?: string | null
  pinsCreated?: number
}

// Pinterest logo SVG inline (no external dep)
function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  )
}

export function PinterestConnect({ connected, username, profileUrl, connectedAt, pinsCreated = 0 }: Props) {
  const router = useRouter()
  const [disconnecting, setDisconnecting] = useState(false)

  async function handleDisconnect() {
    if (!confirm('Déconnecter Pinterest ? Les épingles déjà créées restent sur Pinterest.')) return
    setDisconnecting(true)
    try {
      const res = await fetch('/api/pinterest/disconnect', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Pinterest déconnecté')
      router.refresh()
    } catch {
      toast.error('Erreur lors de la déconnexion')
    } finally {
      setDisconnecting(false)
    }
  }

  if (connected && username) {
    return (
      <div className="space-y-4">
        {/* Compte connecté */}
        <div className="rounded-2xl border bg-card p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-[#E60023]/10 flex items-center justify-center shrink-0">
            <PinterestIcon className="h-6 w-6 text-[#E60023]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">@{username}</span>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                Connecté
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              {connectedAt && (
                <span>Depuis le {new Date(connectedAt).toLocaleDateString('fr-FR')}</span>
              )}
              {pinsCreated > 0 && (
                <span>{pinsCreated} épingle{pinsCreated > 1 ? 's' : ''} créée{pinsCreated > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {profileUrl && (
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                title="Voir le profil Pinterest"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
            >
              {disconnecting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Déconnecter
            </Button>
          </div>
        </div>

        {/* Infos */}
        <div className="rounded-2xl border bg-muted/30 p-5 space-y-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Ce que Pinterest permet dans l&apos;app :</p>
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E60023] shrink-0" />
              Publier une épingle depuis un résumé de cours
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E60023] shrink-0" />
              Choisir un tableau Pinterest de destination
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E60023] shrink-0" />
              Ajouter titre, description et lien automatiquement
            </li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bouton de connexion */}
      <div className="rounded-2xl border border-dashed bg-muted/30 p-8 flex flex-col items-center gap-4 text-center">
        <div className="h-14 w-14 rounded-2xl bg-[#E60023]/10 flex items-center justify-center">
          <PinterestIcon className="h-8 w-8 text-[#E60023]" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold">Connecter Pinterest</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Publie tes résumés de cours directement sur ton compte Pinterest en un clic.
          </p>
        </div>
        <a href="/api/auth/pinterest">
          <Button className="gap-2 bg-[#E60023] hover:bg-[#c4001f] text-white border-0">
            <PinterestIcon className="h-4 w-4" />
            Se connecter avec Pinterest
          </Button>
        </a>
      </div>

      {/* Prérequis */}
      <div className="rounded-2xl border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1.5">
        <p className="font-medium text-foreground">Prérequis :</p>
        <p>Les variables <code className="bg-muted px-1 rounded">PINTEREST_APP_ID</code> et <code className="bg-muted px-1 rounded">PINTEREST_APP_SECRET</code> doivent être renseignées dans <code className="bg-muted px-1 rounded">.env.local</code>.</p>
        <p>Obtenez-les sur <strong>developers.pinterest.com</strong> → Mes applications.</p>
      </div>
    </div>
  )
}
