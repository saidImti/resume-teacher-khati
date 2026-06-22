import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'Connexion' }

export default function LoginPage() {
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
            Vos résumés de cours,
            <br />
            en quelques secondes.
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Générez automatiquement des résumés professionnels
            pour les parents, depuis vos contenus Padlet.
          </p>

          {/* Stats */}
          <div className="flex gap-6">
            {[
              { value: '< 2 min', label: 'par résumé' },
              { value: '5',       label: 'niveaux gérés' },
              { value: '∞',       label: 'groupes possibles' },
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
        {/* Logo mobile */}
        <div className="flex lg:hidden items-center gap-3 mb-10">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-lg">
            📚
          </div>
          <span className="font-semibold text-lg">Résumé Teacher Khati</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Connexion</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Accédez à votre espace Teacher Khati
            </p>
          </div>

          <Suspense fallback={<div className="h-48 rounded-xl border border-border bg-card" />}>
            <LoginForm />
          </Suspense>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            En vous connectant, vous acceptez notre{' '}
            <Link href="/confidentialite" className="underline hover:text-foreground transition-colors">
              politique de confidentialité
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
