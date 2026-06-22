import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Politique de confidentialité — Teacher Khati' }

export default function ConfidentialitePage() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6">

        {/* Navigation */}
        <div className="mb-10 flex items-center justify-between">
          <Link href="/auth/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <span className="text-lg">📚</span>
            <span className="font-semibold">Teacher Khati</span>
          </Link>
          <Link href="/auth/login" className="text-sm text-primary hover:underline">
            ← Retour à la connexion
          </Link>
        </div>

        {/* Contenu */}
        <article className="prose prose-sm max-w-none text-foreground">
          <h1 className="text-2xl font-bold text-foreground mb-2">Politique de confidentialité</h1>
          <p className="text-muted-foreground text-sm mb-8">Dernière mise à jour : {currentYear}</p>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Qui sommes-nous ?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              L'application <strong className="text-foreground">Résumé Teacher Khati</strong> est un outil de gestion pédagogique
              à usage privé, développé pour Teacher Khati, professeure d'anglais pour enfants
              opérant sur les sites de Maison-Alfort et Champigny-sur-Marne.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Données collectées</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              L'application collecte et traite les données suivantes :
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground list-none pl-0">
              {[
                ['Données des élèves', 'Prénom, nom, date de naissance, niveau, site, statut d\'inscription, notes médicales et de contact d\'urgence.'],
                ['Données des familles', 'Noms des parents, numéros de téléphone, adresse email, numéro WhatsApp, adresse postale.'],
                ['Données de cours', 'Résumés de séances, contenus pédagogiques, présences et absences.'],
                ['Données financières', 'Factures mensuelles, montants, historique des paiements. Aucune carte bancaire n\'est stockée.'],
                ['Données de connexion', 'Adresse email de connexion, horodatage des sessions.'],
              ].map(([titre, desc]) => (
                <li key={titre} className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="font-medium text-foreground text-sm">{titre}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Finalités du traitement</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Les données sont utilisées exclusivement pour :
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• La gestion des inscriptions et du suivi scolaire des élèves</li>
              <li>• La génération et l'envoi des résumés de cours aux parents</li>
              <li>• La facturation mensuelle et le suivi des paiements</li>
              <li>• La communication avec les familles via WhatsApp</li>
              <li>• La tenue des registres de présence et d'absence</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Base légale (RGPD)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Le traitement est fondé sur l'<strong className="text-foreground">exécution d'un contrat</strong> (inscription aux cours)
              et l'<strong className="text-foreground">intérêt légitime</strong> de l'enseignante à assurer le suivi pédagogique
              et administratif de son activité.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Hébergement et sécurité</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Les données sont hébergées sur <strong className="text-foreground">Supabase</strong> (infrastructure PostgreSQL, serveurs en Europe)
              et sur <strong className="text-foreground">Vercel</strong> (déploiement, CDN). Les communications sont chiffrées via HTTPS/TLS.
              L'accès à l'application est protégé par authentification et contrôle d'accès basé sur les rôles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Durée de conservation</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Les données des élèves et familles sont conservées pendant la durée de la relation pédagogique,
              plus un délai de <strong className="text-foreground">3 ans</strong> après la fin de l'inscription,
              conformément aux obligations légales françaises.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Services tiers</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                ['WhatsApp Business (Meta)', 'Envoi de notifications aux parents. Soumis à la politique de confidentialité de Meta.'],
                ['Pinterest', 'Publication optionnelle de contenu pédagogique. Soumis à la politique de confidentialité de Pinterest.'],
                ['OpenAI', 'Génération assistée de résumés de cours. Aucune donnée personnelle identifiable n\'est transmise.'],
              ].map(([service, desc]) => (
                <li key={service} className="flex gap-2">
                  <span className="font-medium text-foreground shrink-0">{service} :</span>
                  <span>{desc}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Vos droits</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Conformément au RGPD, vous disposez des droits d'accès, de rectification, d'effacement,
              de portabilité et d'opposition. Pour exercer ces droits, contactez :
            </p>
            <div className="mt-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
              <p className="font-medium text-foreground">Teacher Khati</p>
              <p className="text-muted-foreground">Maison-Alfort &amp; Champigny-sur-Marne</p>
              <p className="text-muted-foreground mt-1">contact via l'application</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Vous avez également le droit d'introduire une réclamation auprès de la{' '}
              <strong className="text-foreground">CNIL</strong> (Commission Nationale de l'Informatique et des Libertés).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Cookies</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              L'application utilise uniquement des cookies de session strictement nécessaires au fonctionnement
              de l'authentification. Aucun cookie publicitaire ou de tracking n'est utilisé.
            </p>
          </section>

          <div className="border-t border-border pt-6 mt-8">
            <p className="text-xs text-muted-foreground text-center">
              © {currentYear} Teacher Khati — Tous droits réservés.
              Application développée à usage privé.
            </p>
          </div>
        </article>
      </div>
    </div>
  )
}
