import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { SignupForm } from './SignupForm'

export const metadata: Metadata = { title: 'Créer mon école' }

export default function SignupPage() {
  return (
    <div className="min-h-screen flex">
      {/* Panneau gauche — Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
            📚
          </div>
          <span className="font-semibold text-lg">Résumé Teacher Khati</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Gérez votre école,
            <br />
            de l&apos;inscription au résumé.
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Élèves, familles, présences, paiements, résumés de cours —
            tout au même endroit, avec votre logo et votre nom.
          </p>

          <div className="flex gap-6">
            {[
              { value: 'Multi-sites', label: 'et multi-groupes' },
              { value: 'Isolé',       label: 'vos données sont à vous' },
              { value: '2 min',       label: 'pour démarrer' },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl p-4 flex-1">
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-white/70 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-white/50 text-sm">
          <p>© {new Date().getFullYear()} Teacher Khati</p>
          <Link href="/confidentialite" className="hover:text-white/80 underline transition-colors">
            Confidentialité
          </Link>
        </div>
      </div>

      {/* Panneau droit — Formulaire */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="flex lg:hidden items-center gap-3 mb-10">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-lg">
            📚
          </div>
          <span className="font-semibold text-lg">Résumé Teacher Khati</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Créer mon école</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Votre espace est prêt en 2 minutes — niveaux et année scolaire inclus
            </p>
          </div>

          <Suspense fallback={<div className="h-64 rounded-xl border border-border bg-card" />}>
            <SignupForm />
          </Suspense>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Déjà un compte ?{' '}
            <Link href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Se connecter
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            En créant un compte, vous acceptez notre{' '}
            <Link href="/confidentialite" className="underline hover:text-foreground transition-colors">
              politique de confidentialité
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
