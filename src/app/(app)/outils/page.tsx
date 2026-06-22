import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CheckCircle2, AlertCircle, Lock } from 'lucide-react'

interface ToolCard {
  href: string
  label: string
  description: string
  icon: React.ReactNode
  statusLabel: string
  statusOk: boolean | null
  locked?: boolean
  lockedReason?: string
}

function Card({ tool }: { tool: ToolCard }) {
  const content = (
    <div className={`group relative flex flex-col gap-4 rounded-2xl border p-5 transition-all h-full
      ${tool.locked
        ? 'border-border bg-muted/30 opacity-60 cursor-not-allowed'
        : 'border-border bg-card hover:border-primary/40 hover:shadow-sm cursor-pointer'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted shrink-0">
          {tool.icon}
        </div>
        {tool.locked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Lock className="h-3 w-3" /> Bientôt
          </span>
        ) : tool.statusOk === true ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
            <CheckCircle2 className="h-3 w-3" /> {tool.statusLabel}
          </span>
        ) : tool.statusOk === false ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            <AlertCircle className="h-3 w-3" /> {tool.statusLabel}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {tool.statusLabel}
          </span>
        )}
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{tool.label}</h3>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{tool.description}</p>
        {tool.locked && tool.lockedReason && (
          <p className="mt-2 text-xs text-muted-foreground/70 italic">{tool.lockedReason}</p>
        )}
      </div>
      {!tool.locked && (
        <div className="mt-auto pt-2">
          <span className="text-xs font-semibold text-primary group-hover:underline">
            Configurer →
          </span>
        </div>
      )}
    </div>
  )

  if (tool.locked) return content
  return <Link href={tool.href} className="h-full block">{content}</Link>
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-green-600">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
    </svg>
  )
}

function PinterestIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-red-600">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  )
}

export default async function OutilsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: waSettings }, { data: pinSettings }] = await Promise.all([
    supabase.from('whatsapp_settings').select('test_mode, production_number').eq('user_id', user.id).maybeSingle(),
    supabase.from('pinterest_settings').select('access_token, pinterest_username').eq('user_id', user.id).maybeSingle(),
  ])

  const waConnected   = !!(waSettings?.production_number)
  const pinConnected  = !!(pinSettings?.access_token)

  const tools: ToolCard[] = [
    {
      href:        '/outils/whatsapp',
      label:       'WhatsApp',
      description: 'Envoyez les résumés de cours et les relances de paiement directement sur WhatsApp aux parents.',
      icon:        <WhatsAppIcon />,
      statusLabel: waSettings?.test_mode ? 'Mode test' : waConnected ? 'Connecté' : 'À configurer',
      statusOk:    waConnected && !waSettings?.test_mode ? true : null,
    },
    {
      href:        '/outils/pinterest',
      label:       'Pinterest',
      description: 'Publiez vos épingles pédagogiques directement depuis l\'application vers votre compte Pinterest.',
      icon:        <PinterestIcon />,
      statusLabel: pinConnected ? `@${pinSettings?.pinterest_username ?? 'connecté'}` : 'Non connecté',
      statusOk:    pinConnected ? true : false,
    },
    {
      href:        '#',
      label:       'SMS / Voix',
      description: 'Envoyez des rappels par SMS aux familles qui n\'utilisent pas WhatsApp.',
      icon:        <span className="text-2xl">📱</span>,
      statusLabel: 'Bientôt',
      statusOk:    null,
      locked:      true,
      lockedReason: 'Intégration Twilio / OVH SMS prévue.',
    },
    {
      href:        '#',
      label:       'Email automatique',
      description: 'Envoyez les factures et résumés par email à la demande ou automatiquement.',
      icon:        <span className="text-2xl">📧</span>,
      statusLabel: 'Bientôt',
      statusOk:    null,
      locked:      true,
      lockedReason: 'Intégration Resend / Sendgrid prévue.',
    },
    {
      href:        '#',
      label:       'Google Calendar',
      description: 'Synchronisez les séances et les jours fériés avec Google Calendar.',
      icon:        <span className="text-2xl">📅</span>,
      statusLabel: 'Bientôt',
      statusOk:    null,
      locked:      true,
    },
    {
      href:        '#',
      label:       'Stripe / Paiement en ligne',
      description: 'Proposez aux familles de régler leurs factures directement en ligne.',
      icon:        <span className="text-2xl">💳</span>,
      statusLabel: 'Bientôt',
      statusOk:    null,
      locked:      true,
    },
  ]

  const activeCount = tools.filter((t) => !t.locked && t.statusOk === true).length

  return (
    <main className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">

      {/* KPI rapide */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xl shrink-0">
          🔧
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {activeCount} outil{activeCount !== 1 ? 's' : ''} actif{activeCount !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            {tools.filter((t) => !t.locked).length} disponibles · {tools.filter((t) => t.locked).length} en préparation
          </p>
        </div>
      </div>

      {/* Grille outils */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Card key={tool.href + tool.label} tool={tool} />
        ))}
      </div>
    </main>
  )
}
