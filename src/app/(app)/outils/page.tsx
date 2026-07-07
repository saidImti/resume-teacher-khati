import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { UserToolsManager, type UserTool } from '@/components/outils/UserToolsManager'

// ── Outils natifs (hardcodés) ──────────────────────────────────────────────────

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

interface NativeToolProps {
  href: string
  icon: React.ReactNode
  label: string
  description: string
  statusLabel: string
  statusOk: boolean | null
}

function NativeToolCard({ href, icon, label, description, statusLabel, statusOk }: NativeToolProps) {
  return (
    <Link href={href} className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted shrink-0">
          {icon}
        </div>
        {statusOk === true ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
            <CheckCircle2 className="h-3 w-3" /> {statusLabel}
          </span>
        ) : statusOk === false ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            <AlertCircle className="h-3 w-3" /> {statusLabel}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {statusLabel}
          </span>
        )}
      </div>
      <div>
        <h3 className="font-semibold text-foreground text-sm">{label}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <span className="text-xs font-semibold text-primary group-hover:underline mt-auto pt-1">
        Configurer →
      </span>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OutilsPage() {
  const supabase = await createServerSupabaseClient()
  const ctx = await getOrgContext()
  if (!ctx) redirect('/auth/login')

  const admin = createAdminSupabaseClient()

  const [{ data: waSettings }, { data: pinSettings }, { data: userTools }] = await Promise.all([
    // whatsapp_settings est org-scopé (config partagée par l'école, admin-only)
    supabase.from('whatsapp_settings').select('test_mode, production_number').eq('organization_id', ctx.organizationId).maybeSingle(),
    // pinterest_settings reste personnel (matrice RLS owner-only)
    supabase.from('pinterest_settings').select('access_token, pinterest_username').eq('user_id', ctx.user.id).maybeSingle(),
    admin.from('user_tools').select('*').eq('user_id', ctx.user.id).order('sort_order').order('created_at'),
  ])

  const waConnected  = !!(waSettings?.production_number)
  const pinConnected = !!(pinSettings?.access_token)
  const customTools  = (userTools ?? []) as UserTool[]
  const activeCustom = customTools.filter((t) => t.is_active).length

  return (
    <main className="p-4 lg:p-6 max-w-5xl mx-auto space-y-8">

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Intégrations natives',    value: 2,            sub: 'WhatsApp · Pinterest' },
          { label: 'Mes intégrations',        value: customTools.length, sub: `${activeCustom} active${activeCustom !== 1 ? 's' : ''}` },
          { label: 'Total actif',             value: (waConnected ? 1 : 0) + (pinConnected ? 1 : 0) + activeCustom, sub: 'outils opérationnels' },
          { label: 'Webhooks configurés',     value: customTools.filter((t) => t.webhook_url).length, sub: 'n8n · Make · Zapier…' },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Natifs */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Intégrations natives
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NativeToolCard
            href="/outils/whatsapp"
            icon={<WhatsAppIcon />}
            label="WhatsApp"
            description="Envoi de résumés de cours et relances de paiement aux parents."
            statusLabel={waSettings?.test_mode ? 'Mode test' : waConnected ? 'Connecté' : 'À configurer'}
            statusOk={waConnected && !waSettings?.test_mode ? true : null}
          />
          <NativeToolCard
            href="/outils/pinterest"
            icon={<PinterestIcon />}
            label="Pinterest"
            description="Publication d'épingles pédagogiques depuis l'application."
            statusLabel={pinConnected ? `@${pinSettings?.pinterest_username ?? 'connecté'}` : 'Non connecté'}
            statusOk={pinConnected ? true : false}
          />
        </div>
      </section>

      {/* Outils personnalisés (dynamiques) */}
      <section>
        <UserToolsManager initialTools={customTools} />
      </section>
    </main>
  )
}
