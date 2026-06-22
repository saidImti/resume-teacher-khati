# MASTER PROJECT — Résumé Teacher Khati

> **Document maître** — Toujours à jour. Mise à jour obligatoire avant toute implémentation majeure.
> Dernière mise à jour : **2026-06-22** (v3.1 — Module Présences • Années scolaires • Feature flags • WhatsApp config)

---

## 1. VISION DU PROJET

**Résumé Teacher Khati** est une application web premium destinée à Teacher Khati pour gérer ses cours d'anglais pour enfants sur plusieurs sites.

### Objectif principal
Automatiser la génération de résumés de cours professionnels envoyés aux parents via WhatsApp, depuis des contenus pédagogiques bruts (Padlet, YouTube, PDF, images, audios). Et gérer l'ensemble de l'école : élèves, planning, finances.

### Proposition de valeur
- Résumé généré en < 2 minutes par groupe
- Communication parents simplifiée via WhatsApp
- Archives structurées par année/site/niveau/groupe
- Gestion complète des élèves (inscriptions, profils, statistiques)
- Suivi financier (tarifs, facturation mensuelle, paiements)
- Planning hebdomadaire par site
- Vue d'ensemble multi-sites en temps réel

---

## 2. DÉPLOIEMENT PRODUCTION

| Élément | Valeur |
|---------|--------|
| **URL production** | https://resume-teacher-khati.vercel.app |
| **GitHub** | https://github.com/saidImti/resume-teacher-khati |
| **Vercel** | Compte impexia — auto-deploy sur push `main` |
| **Supabase** | Projet connecté — clé dans Vercel env vars |

### Variables d'environnement Vercel (toutes configurées ✅)
```
NEXT_PUBLIC_SUPABASE_URL         ✅ Production
NEXT_PUBLIC_SUPABASE_ANON_KEY    ✅ Production
SUPABASE_SERVICE_ROLE_KEY        ✅ Production  ⚠️ À régénérer (voir §11)
OPENAI_API_KEY                   ✅ Production
PADLET_API_TOKEN                 ✅ Production
```

### Actions de déploiement en attente
- [ ] `git push --force origin main` — nettoyer l'historique git (secret exposé dans ancien historique)
- [ ] Appliquer migration 009 dans Supabase SQL Editor
- [ ] Régénérer `SUPABASE_SERVICE_ROLE_KEY` dans Supabase → Settings → API → Reset
- [ ] Mettre à jour la nouvelle clé dans Vercel → Environment Variables

---

## 3. STACK TECHNIQUE

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 14 (App Router) |
| Langage | TypeScript strict |
| Styling | Tailwind CSS + shadcn/ui |
| Base de données | Supabase (PostgreSQL) |
| Formulaires | React Hook Form + Zod |
| Drag & Drop | dnd-kit |
| Éditeur riche | TipTap |
| IA | OpenAI GPT-4o |
| Automatisation | N8N (Hostinger) |
| État global | Zustand |
| Thème | next-themes (dark/light/system) |
| Animations | CSS (animate-fade-in-up, page-enter) |
| Commandes | cmdk (palette Cmd+K) |

---

## 4. ARCHITECTURE MULTI-SITES

```
Teacher Khati
├── Site : Maison-Alfort
│   ├── Preschoolers (3-5 ans)
│   ├── Kids (6-8 ans)
│   ├── Juniors (9-11 ans)
│   ├── Tweens (12-14 ans)
│   └── Teenagers (15-18 ans)
├── Site : Champigny
│   └── [mêmes niveaux]
└── Site : [Futurs sites]
    └── [mêmes niveaux]
```

---

## 5. PHASES D'IMPLÉMENTATION — STATUT GLOBAL

| Phase | Statut | Description |
|-------|--------|-------------|
| Phase 0 | ✅ COMPLET | Setup, architecture, authentification |
| Phase 1 | ✅ COMPLET | Dashboard + Génération de résumé (Wizard 5 étapes) |
| Phase 2 | ✅ COMPLET | Bibliothèque d'activités |
| Phase 3 | ⏳ En attente | Drag & Drop avancé |
| Phase 4 | ✅ COMPLET | Import Padlet (API + upload + viewer) |
| Phase 4b | ✅ COMPLET | Fiches & Bilans IA (export DOCX) |
| Phase 4c | ✅ COMPLET | Audit Ultra-Premium (sécurité, SEO, UX, perf) |
| Phase École | ✅ COMPLET | Élèves, Planning, Finances (migration 009) |
| Phase 5 | ⏳ En attente | WhatsApp Business API |
| Phase 6 | ⏳ En attente | IA avancée (Vision, multi-modal) |

---

## 6. BASE DE DONNÉES — MIGRATIONS SQL

| Fichier | Contenu | Statut |
|---------|---------|--------|
| `001_initial_schema.sql` | sites, levels, groups, sessions, contents, resumes, activities, whatsapp | ✅ Appliquée |
| `002_indexes_triggers.sql` | Index de performance + triggers updated_at | ✅ Appliquée |
| `003_rls_policies.sql` | Row Level Security — isolation par user_id | ✅ Appliquée |
| `004_schema_fixes.sql` | Corrections du schéma initial | ✅ Appliquée |
| `005_fix_user_profile.sql` | Profil utilisateur + trigger auth | ✅ Appliquée |
| `006_resume_columns.sql` | Colonnes résumé enrichies | ✅ Appliquée |
| `007_saved_fiches.sql` | Sauvegarde fiches & bilans | ✅ Appliquée |
| `008_api_keys.sql` | Clés API externes (n8n, Make, Zapier) | ✅ Appliquée |
| `009_school_management.sql` | **families, students, enrollments, schedules, pricing_rules, invoices, payments** | ⚠️ **À APPLIQUER** |

> **⚠️ CRITIQUE** : Sans la migration 009, les pages Élèves / Planning / Finances affichent des états vides (fail silencieux — l'app ne crashe pas grâce aux `.catch()`).

### Schéma migration 009 (résumé)
```
families         → parent1, parent2, adresse, site_id, tarif_personnalisé
students         → prénom, nom, dob, genre, site_id, level_id, statut, famille
enrollments      → student ↔ group, dates, statut
schedules        → group ↔ site, jour, heure début/fin, récurrence
pricing_rules    → tarif par session / mensuel enfant / mensuel famille
invoices         → famille, période, montant dû/payé, statut, lignes de détail
payments         → paiement individuel, méthode, référence
```

---

## 7. STRUCTURE COMPLÈTE DES FICHIERS

### Routes (src/app/)
```
(app)/
├── dashboard/          # Tableau de bord principal + KPIs école
├── mes-padlets/        # Galerie Padlets + viewer 4 onglets
├── archives/           # Résumés archivés par année/site
├── activites/          # Bibliothèque d'activités pédagogiques
├── resumes/
│   ├── new/            # Wizard génération (5 étapes)
│   └── generated/      # Board des résumés générés
├── eleves/             # Module Élèves complet
│   ├── page.tsx        # Liste + stats (tableau, filtres, KPIs)
│   ├── new/            # Formulaire inscription
│   └── [id]/           # Profil complet + edit
├── planning/           # Emploi du temps hebdomadaire par site
├── finances/           # Tarifs + Factures + Revenus
├── settings/
│   ├── page.tsx        # Hub paramètres
│   ├── groups/         # CRUD groupes
│   ├── sites/          # Gestion sites
│   ├── users/          # Gestion utilisateurs (admin)
│   └── api-keys/       # Clés API externes
auth/
├── login/              # Page de connexion
inscription/            # Formulaire public d'inscription famille
api/
├── resumes/            # generate, list, [id], sections/reorder
├── activities/         # CRUD activités
├── groups/             # CRUD groupes + reorder
├── fiches/             # seance, bilan-annuel, save, history, upload, export-html
├── padlet/             # board, my-boards, import, ideas
├── sites/              # CRUD sites
├── users/              # CRUD utilisateurs
├── keys/               # CRUD clés API
├── whatsapp/           # send, sends
├── families/[id]/rate  # Mise à jour tarif famille
├── pricing-rules/      # CRUD tarifs
├── public-registration # Inscription publique famille
└── registration-link   # Génération lien d'inscription
```

### Composants (src/components/)
```
layout/
├── AppShell.tsx              # Wrapper Sidebar + contenu
├── Sidebar.tsx               # Navigation 3 sections (Pédagogie | École | Système)
├── Header.tsx                # Titre, Cmd+K, ThemeToggle
└── NotificationCenter.tsx    # Centre de notifications

dashboard/
├── DashboardContent.tsx      # KPIs pédagogie + KPIs école (élèves, finances, planning)
├── GroupCard.tsx
├── SiteSection.tsx
└── SortableGroupList.tsx

eleves/
├── ElevesContent.tsx         # Liste filtrée + stats (total/actif/essai/parti)
├── StudentForm.tsx           # Formulaire inscription complète
└── StudentProfile.tsx        # Profil élève avec historique

planning/
└── PlanningContent.tsx       # Grille 7 jours × sites avec créneaux

finances/
└── FinancesContent.tsx       # 3 onglets : Vue d'ensemble | Factures | Tarifs

padlet/
├── PadletManager.tsx         # Gestion globale
├── PadletViewer.tsx          # Viewer smart (triage, recatégorisation)
├── PadletImportModal.tsx
├── PadletPageLayout.tsx
└── tabs/
    ├── TabPadletDashboard.tsx
    ├── TabFiches.tsx          # Dispatcher onglets fiches
    ├── TabBibliotheque.tsx
    ├── TabHistory.tsx
    ├── TabIdees.tsx
    ├── FicheSeanceForm.tsx    # Génération IA fiche de séance
    ├── BilanAnnuelForm.tsx    # Génération IA bilan annuel + export DOCX
    ├── FileUploadZone.tsx     # Upload audio/vidéo/PDF/images/docs
    ├── PadletPickerModal.tsx  # Sélection 1 ou N Padlets
    └── fiche-html.ts          # Template HTML premium

resume/
├── ResumeWizard.tsx          # Orchestrateur wizard 5 étapes
├── WizardProgress.tsx
├── ResumeEditor.tsx          # Éditeur TipTap rich text
├── SortableSectionList.tsx   # dnd-kit sections
├── WhatsAppPreview.tsx       # Preview formatée + DOMPurify
├── WhatsAppSendPanel.tsx
├── GeneratedResumesBoard.tsx # Board résumés générés
└── steps/
    ├── Step1Group.tsx         # Choix groupe/session
    ├── Step2Content.tsx       # Import contenus + Padlet picker
    ├── Step3Generate.tsx      # Génération GPT-4o
    ├── Step4Review.tsx        # Révision TipTap
    └── Step5WhatsApp.tsx      # Envoi WhatsApp

activites/
├── ActivityCard.tsx
└── ActivityForm.tsx

archives/
└── ResumeDetailClient.tsx

settings/
└── SettingsNav.tsx

inscription/
└── PublicRegistrationForm.tsx  # Formulaire public famille

ui/
├── EmptyState.tsx             # 7 illustrations SVG inline (light/dark)
├── FadeIn.tsx                 # Animations stagger
├── ThemeToggle.tsx            # Bascule dark/light/system
├── CommandPalette.tsx         # Palette Cmd+K (cmdk)
├── skeleton-variants.tsx      # SkeletonCard/List/Table/Dashboard
├── LevelBadge.tsx             # Badge niveau coloré
├── StatusBadge.tsx            # Badge statut avec couleur
├── badge.tsx / button.tsx / card.tsx / input.tsx / label.tsx / skeleton.tsx

providers/
└── ThemeProvider.tsx          # Wrapper next-themes
```

### Librairies métier (src/lib/)
```
supabase/
├── client.ts      # Client navigateur
├── server.ts      # Client serveur (cookies)
├── env.ts         # Validation variables d'env
└── queries.ts     # Toutes les fonctions de données :
                   # getSites, getLevels, getGroups, getAcademicYears
                   # getStudents, getStudentStats, getFamilies
                   # getSchedulesByDay, getPricingRules
                   # getInvoices, getRevenueStats, getPayments
                   # + toutes les mutations (create/update/delete)

ai/
├── generator.ts   # Appel OpenAI GPT-4o
└── prompts.ts     # Prompts par niveau (5 niveaux)

padlet/
├── parser.ts      # Parser HTML Padlet
└── api-parser.ts  # Parser API Padlet

whatsapp/
└── formatter.ts   # Formatage message WhatsApp

utils/
└── index.ts       # cn(), formatDate(), formatCurrency()...

api-key.ts          # Validation clés API externes
with-api-auth.ts    # Middleware auth API
registration-token.ts  # Génération tokens inscription publique
```

### Types TypeScript (src/types/index.ts)
```typescript
// Entités de base
AcademicYear, Site, Level (LevelSlug), Group, Session, Content, Resume

// Gestion scolaire (migration 009)
Family, Student (StudentStatus), Enrollment (EnrollmentStatus)
Schedule (DayOfWeek), PricingRule (BillingType)
Invoice (InvoiceStatus), Payment (PaymentMethod)
InvoiceLineItem, StudentStats

// Activités & Résumés
Activity, ResumeSection, ResumeActivity, WhatsAppSend

// UI Helpers
SelectOption, LoadingState, AsyncState<T>, ApiResponse<T>
LessonItem, StructuredLesson

// Constantes
DAY_LABELS : Record<number, string>  // 0=Lundi → 6=Dimanche
```

---

## 8. NAVIGATION — SIDEBAR

```
PÉDAGOGIE
├── 🏠  Dashboard         /dashboard
├── 📋  Mes Padlets       /mes-padlets
├── 📁  Archives          /archives
└── 🎯  Activités         /activites

ÉCOLE
├── 👥  Élèves            /eleves
├── 📅  Planning          /planning
└── 💰  Finances          /finances

SYSTÈME
└── ⚙️  Paramètres        /settings
```

---

## 9. AUDIT ULTRA-PREMIUM — COMPLET ✅

### Sécurité
- [x] DOMPurify — XSS corrigé dans WhatsAppPreview
- [x] Security headers next.config.js (HSTS, X-Frame-Options, CSP, Referrer-Policy)
- [x] eslint-plugin-jsx-a11y — règles d'accessibilité en lint
- [x] Scripts `create-user.mjs` et `reset-password.mjs` — secrets supprimés, chargement depuis `.env.local`
- [x] `.env.local` dans `.gitignore` — jamais commité

### Fondation
- [x] next.config.js complet — images WebP/AVIF, compress, optimizePackageImports
- [x] layout.tsx — lang="fr", ThemeProvider, title template, Open Graph, Viewport export
- [x] Manifest PWA (site.webmanifest) + favicon.svg + apple-touch-icon
- [x] robots.ts — disallow tout (app privée)
- [x] sitemap.ts — expose /auth/login uniquement

### Stabilité
- [x] error.tsx boundary sur chaque section
- [x] loading.tsx par section avec skeleton screens
- [x] Toutes les nouvelles pages avec `.catch(() => fallback)` — fail silencieux

### Performance perceptuelle
- [x] SkeletonCard, SkeletonList, SkeletonTable, SkeletonDashboard
- [x] FadeIn component avec stagger delays
- [x] CSS animations : fade-in-up, fade-in-down, page-enter
- [x] btn-press class (active:scale-[0.97]) sur tous les boutons

### UX Premium
- [x] Dark mode — next-themes (system/light/dark), ThemeToggle dans Header
- [x] EmptyState — 7 illustrations SVG adaptées light/dark
- [x] Command palette Cmd+K — cmdk, navigation complète, déconnexion

---

## 10. DASHBOARD — KPIs

### Bloc Pédagogie (existant)
- Résumés envoyés ce mois / cette semaine
- Sessions en cours / à rédiger
- Groupes par site

### Bloc École (nouveau — session 9)
- **Carte Élèves** → `/eleves` : nb actifs + breakdown (essai/parti/total)
- **Carte Finances** → `/finances` : total encaissé + alerte impayés
- **Carte Planning aujourd'hui** → `/planning` : créneaux du jour (lun=0)

---

## 11. SÉCURITÉ — POINTS CRITIQUES

### Clé service exposée (historique git)
L'ancienne clé `sb_secret_VTo36oCmiJAZ4gQYCDDEPw_G098q7Ct` a été présente dans l'historique git.

**Actions requises :**
1. `git push --force origin main` — remplacer l'historique GitHub par la version propre
2. Supabase → Settings → API → **Reset service_role key**
3. Vercel → Settings → Environment Variables → Mettre à jour `SUPABASE_SERVICE_ROLE_KEY`

### Bonnes pratiques en place
- `.gitignore` contient `.env.local`, `.env`
- Les scripts `scripts/create-user.mjs` et `scripts/reset-password.mjs` lisent les secrets depuis `.env.local` uniquement
- RLS activé sur toutes les tables Supabase (isolation par `user_id`)

---

## 12. FONCTIONNALITÉS — MODULE ÉCOLE (Phase École)

### Module Élèves (`/eleves`)
- Liste complète avec filtres (site, niveau, statut, recherche textuelle)
- KPIs : total, actifs, essai, partis, suspendus
- Graphiques : évolution mensuelle, répartition par site/niveau/jour
- Fiche complète par élève : infos, contact urgence, notes médicales
- Inscription nouvel élève (formulaire complet)
- Statuts : `trial` | `active` | `suspended` | `departed`

### Module Planning (`/planning`)
- Grille hebdomadaire (Lundi → Dimanche)
- Vue par site avec créneaux colorés par niveau
- Créneaux liés aux groupes réels (Schedule → Group → Level)
- Affiche les élèves actifs par créneau

### Module Finances (`/finances`)
**Onglet Vue d'ensemble**
- KPIs : revenu total, encaissé, en attente, impayés
- Graphique barres 12 mois (montant dû vs encaissé)
- Cards par site (revenu + taux recouvrement)

**Onglet Factures**
- Tableau de toutes les factures avec filtres (statut, site, mois)
- Statuts : `draft` | `pending` | `partial` | `paid` | `overdue` | `cancelled`
- Détail lignes (enfant, description, montant)

**Onglet Tarifs**
- Règles de tarification par site
- Types : `per_session` | `monthly_per_child` | `monthly_family`
- Dégressif : tarif 1 → 5+ enfants par famille
- Simulation dégressive interactive

### Inscription publique
- URL unique générée depuis admin (`/api/registration-link`)
- Formulaire famille sur `/inscription` (sans authentification)
- Création automatique famille + élève dans Supabase

---

## 13. FONCTIONNALITÉS — MODULE PÉDAGOGIE (Phases 1-4b)

### Wizard Résumé (5 étapes)
1. Choix groupe + session
2. Import contenus (Padlet picker, upload fichiers)
3. Génération GPT-4o (prompt par niveau)
4. Révision éditeur TipTap (sections drag-and-drop)
5. Prévisualisation WhatsApp + envoi

### Module Mes Padlets (Phase 4)
- Galerie avec recherche, tri, filtres
- Viewer smart : split-panel, triage par catégorie, recatégorisation
- 4 onglets : Dashboard | Fiches | Bibliothèque | Historique
- Import via URL ou API Padlet
- Sélecteur multi-Padlets (PadletPickerModal)
- Upload fichiers : audio/vidéo/PDF/images/documents (FileUploadZone)

### Fiches & Bilans IA (Phase 4b)
- Fiche de séance : génération IA structurée (activités, vocabulaire, objectifs)
- Bilan annuel : synthèse IA d'une année complète + export DOCX premium
- Sauvegarde automatique + historique consultable

### Bibliothèque d'activités (Phase 2)
- CRUD activités avec tags, niveaux, compétences, durée
- Réutilisables dans le wizard résumé
- Filtres par niveau/compétence/tag

---

## 14. SCRIPTS UTILITAIRES

### `scripts/create-user.mjs`
Crée un utilisateur dans Supabase Auth depuis la CLI.
```bash
node scripts/create-user.mjs email@example.com MonMotDePasse123
```
Prérequis : `.env.local` avec `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_KEY`.

### `scripts/reset-password.mjs`
Réinitialise le mot de passe d'un utilisateur existant.
```bash
node scripts/reset-password.mjs email@example.com NouveauMDP123
```

---

## 15. RÈGLES DE DÉVELOPPEMENT

1. Toujours mettre à jour MASTER_PROJECT.md avant implémentation majeure
2. Maximum 500 lignes par fichier — découper si nécessaire
3. Composants réutilisables — jamais de code dupliqué
4. Chaque feature isolée dans son module (pas de couplage fort)
5. TypeScript strict — 0 erreur `npx tsc --noEmit` avant merge
6. Noms de fichiers sans accents ni espaces
7. Performance : skeleton + FadeIn sur toutes les listes
8. Accessibilité : aria-label sur tous les boutons sans texte visible
9. Dark mode : utiliser les variables CSS (`var(--color-bg)` etc.) — jamais de couleurs hardcodées
10. Secrets : jamais dans le code — toujours dans `.env.local` (local) ou Vercel (prod)
11. Toutes les nouvelles pages serveur : entourer chaque `await` de `.catch(() => fallback)` pour le fail silencieux

---

## 16. PROCHAINES ÉTAPES (Roadmap)

### Immédiat (blocages techniques)
- [ ] `git push --force origin main` — nettoyer historique GitHub
- [ ] Appliquer migration 009 dans Supabase SQL Editor
- [ ] Régénérer `SUPABASE_SERVICE_ROLE_KEY` + mettre à jour Vercel

### Phase 5 — WhatsApp Business API
- [ ] Compte Meta for Developers → app Business
- [ ] Numéro WhatsApp Business (vérification Meta ~quelques jours)
- [ ] Variables : `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- [ ] Webhook de confirmation de livraison

### Phase 3 — Drag & Drop
- [ ] Réorganisation des groupes dans le dashboard (dnd-kit déjà installé)
- [ ] Réorganisation des sections de résumé (déjà partiel dans SortableSectionList)

### Phase 6 — IA Avancée
- [ ] Vision sur images Padlet (GPT-4o Vision)
- [ ] Transcription audio → résumé (Whisper API)
- [ ] Suggestions automatiques d'activités depuis le contenu

### Fonctionnalités école à venir
- [ ] Notifications en temps réel (Supabase Realtime)
- [ ] Génération automatique des factures mensuelles
- [ ] Export PDF des factures
- [ ] Fiche de paie mensuelle par famille (récapitulatif WhatsApp)
- [ ] Suivi des présences / absences par séance

---

## 17. JOURNAL DES SESSIONS

| Session | Date | Réalisations principales |
|---------|------|--------------------------|
| 1 | 2026-05 | Setup Next.js, auth Supabase, dashboard v1, wizard résumé |
| 2 | 2026-05 | Bibliothèque activités, archives, navigation |
| 3 | 2026-05 | Module Mes Padlets v1, galerie, viewer |
| 4 | 2026-05 | Padlet API, PadletViewer smart, 4 onglets |
| 5 | 2026-06 | Fiches & Bilans IA, export DOCX, sauvegarde |
| 6 | 2026-06 | Homogénéisation UI, plein écran, Cmd+K |
| 7 | 2026-06 | Audit Ultra-Premium (sécurité, SEO, UX, perf) |
| 8 | 2026-06 | Migration 009, types & queries école |
| 9 | 2026-06 | Module Élèves, Planning, Finances, Sidebar École, Dashboard KPIs |
| 10 | 2026-06-21 | Fix sécurité scripts, déploiement GitHub/Vercel, doc mise à jour |

---

## 18. MODULE PRÉSENCES (Migration 010)

### Table `attendance`
- Colonnes : `id`, `user_id`, `session_id → sessions`, `student_id → students`
- Statuts : `present` | `absent` | `late` | `excused`
- `marked_at`, `notes`, `notif_sent_at`, `notif_type`
- Contrainte UNIQUE `(session_id, student_id)` — un seul enregistrement par élève par séance
- RLS : `auth.uid() = user_id`

### API Routes
- `GET /api/attendance?sessionId=` → séance + élèves inscrits + stats (present/absent/late/excused/unmarked)
- `POST /api/attendance` → upsert des enregistrements + retourne la liste des absents
- `GET /api/attendance/sessions?date=&groupId=` → séances récentes (14 jours) avec statut fait/pas fait
- `POST /api/attendance/sessions` → trouve ou crée une séance automatiquement

### Interface `/presences`
- Sélecteur de groupe filtrable par site + date picker (max = aujourd'hui)
- Grille d'élèves 2-col/3-col — clic cycle : présent → absent → retard → excusé
- Bouton "Tous présents" one-click
- Stats live : chips colorées (vert/rouge/ambre/gris)
- Post-sauvegarde : panneau notifications WhatsApp si absents > 0
- Sidebar : icône ClipboardCheck, 1er item de NAV_SCHOOL

---

## 19. SYSTÈME ANNÉES SCOLAIRES (Migration 011 — partie 1)

### Architecture
Chaque année scolaire crée de **nouvelles instances de groupes** avec `academic_year_id`.
Kids Maison-Alfort 2024-25 ≠ Kids Maison-Alfort 2025-26 → données totalement séparées.

### Table `academic_years` (colonnes ajoutées)
- `user_id UUID REFERENCES auth.users` — propriétaire
- `color TEXT DEFAULT '#6366f1'` — couleur pastille
- `notes TEXT` — mémo interne
- RLS `academic_years_owner` : `auth.uid() = user_id`
- Seed : 2024-2025 (inactive, #8b5cf6) + 2025-2026 (active, #6366f1)

### Table `groups` (colonne ajoutée)
- `academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL`
- Index `idx_groups_academic_year`

### API Routes
- `GET /api/academic-years` → liste avec `group_count`
- `POST /api/academic-years` → crée une année ; option `copy_from_year_id` recopie les groupes actifs
- `POST /api/academic-years/activate` → désactive toutes → active la demandée
- `PATCH /api/academic-years/[id]` → modifie nom/dates/couleur/notes
- `DELETE /api/academic-years/[id]` → supprime si non active et 0 groupes

### Contexte global `AcademicYearContext`
- Fichier : `src/contexts/AcademicYearContext.tsx`
- `AcademicYearProvider` wrappé dans `src/app/(app)/layout.tsx`
- Hook `useAcademicYear()` → `{ years, currentYear, isLoading, setCurrentYear, refreshYears }`
- Persistance `localStorage` clé `tk_current_year_id`

### Sélecteur `YearSelector`
- Affiché dans le `Header` (avant ThemeToggle)
- Dropdown : pastille couleur, nom, badge "Active", pourcentage d'avancement
- Lien vers `/settings/annees`

### Page `/settings/annees`
- Composant `AcademicYearsClient` — liste + wizard 2 étapes + modal édition
- Wizard : nom, dates, couleur (palette 12 couleurs), option copie groupes, notes
- Barre de progression de l'année (calcul % entre start_date et end_date)
- Actions : activer, éditer, supprimer (boutons visibles au hover)

---

## 20. FEATURE FLAGS & WHATSAPP (Migration 011 — partie 2)

### Table `feature_flags`
- UNIQUE `(user_id, feature_key)` — un flag par feature par utilisateur
- `enabled_for_teacher BOOLEAN DEFAULT true` — visible dans l'app admin
- `enabled_for_parents BOOLEAN DEFAULT false` — visible dans l'espace parents
- Catégories : `core`, `engagement`, `communication`, `admin`

### 14 Features installées (toutes teacher=true, parents=false)
| Clé | Label | Catégorie |
|-----|-------|-----------|
| `attendance` | Présences | core |
| `whatsapp_catchup` | Récap d'absence WhatsApp | communication |
| `revision_sheets` | Fiches de révision mensuelles | core |
| `absence_patterns` | Analyse des absences IA | admin |
| `streaks` | Séries de présence | engagement |
| `passport` | Passeport linguistique CECRL | engagement |
| `time_capsule` | Capsule temporelle audio | engagement |
| `live_feed` | Fil de classe en direct | communication |
| `ai_profile` | Profil IA élève | admin |
| `voice_clone` | Messages vocaux clonés (Khati) | communication |
| `qr_checkin` | QR code check-in | core |
| `parent_portal` | Portail parents | communication |
| `payment_reminders` | Rappels paiement | admin |
| `monthly_report` | Rapport mensuel IA | admin |

### Table `whatsapp_settings`
- UNIQUE sur `user_id`
- `test_mode BOOLEAN DEFAULT true` — **TOUJOURS true par défaut** (sécurité)
- `test_number` — votre WhatsApp personnel (reçoit TOUS les messages en test_mode)
- `production_number` + `production_verified`
- `meta_phone_id`, `meta_waba_id`, `meta_token_encrypted` — pour Meta Business API
- `n8n_webhook_url` + `n8n_enabled` — automation Hostinger existante
- Compteurs : `messages_sent_today`, `messages_sent_month`, `last_message_at`

### API Routes
- `GET /api/feature-flags` → liste triée par sort_order
- `PATCH /api/feature-flags` → toggle `enabled_for_teacher` ou `enabled_for_parents`
- `GET /api/whatsapp-settings` → retourne settings (valeurs par défaut si vierge)
- `PATCH /api/whatsapp-settings` → upsert via `onConflict: 'user_id'`

### Page `/settings/fonctionnalites`
- Composant `FeatureFlagsClient` — grille par catégorie avec double toggle (Teacher / Parents)
- Section WhatsApp : mode test avec badge ambre "Actif", numéro test, N8N webhook
- Stats WhatsApp : messages envoyés aujourd'hui / ce mois / dernier message
- Toggle switch custom coloré (indigo Teacher, vert Parents, ambre test mode)

### Stratégie déploiement progressif
```
Khati teste → active pour Teacher → se familiarise → active pour Parents
```
Parents voient 0 feature au départ. Activation une par une au rythme de Khati.

---

## 21. SIDEBAR — STRUCTURE NAVIGATION COMPLÈTE

```
Pédagogie
├── Dashboard          /dashboard
├── Mes Padlets        /mes-padlets
├── Archives           /archives
└── Activités          /activites

École
├── Présences          /presences          ← Nouveau
├── Élèves             /eleves
├── Planning           /planning
└── Finances           /finances

Système
├── Paramètres         /settings
├── Années scolaires   /settings/annees         ← Nouveau
└── Fonctionnalités    /settings/fonctionnalites ← Nouveau
```

---

## 22. MIGRATIONS SUPABASE — RÉCAPITULATIF

| N° | Fichier | Contenu | Statut |
|----|---------|---------|--------|
| 001-008 | migrations initiales | Schema de base | ✅ Appliqué |
| 009 | `009_school_module.sql` | students, enrollments, sessions, financial tables | ⏳ À appliquer |
| 010 | `010_attendance.sql` | Table attendance + RLS + index | ⏳ À appliquer |
| 011 | `011_academic_years_flags.sql` | academic_years colonnes, groups colonne, feature_flags, whatsapp_settings, seeds | ⏳ À appliquer |

### Ordre d'application obligatoire
```sql
-- Dans Supabase → Database → SQL Editor :
-- 1. Coller et exécuter 009_school_module.sql
-- 2. Coller et exécuter 010_attendance.sql
-- 3. Coller et exécuter 011_academic_years_flags.sql
```

---

## 23. ACTIONS BLOQUANTES (À FAIRE PAR IMTIAZ)

1. **`git push --force origin main`** dans PowerShell (nettoie l'historique)
2. **Appliquer migrations 009 + 010 + 011** dans Supabase SQL Editor
3. **Régénérer `SUPABASE_SERVICE_ROLE_KEY`** → Supabase Dashboard → Settings → API → Reset → copier → Vercel → mettre à jour

---

## JOURNAL DES SESSIONS (mise à jour)

| Session | Date | Réalisations principales |
|---------|------|--------------------------|
| 1 | 2026-05 | Setup Next.js, auth Supabase, dashboard v1, wizard résumé |
| 2 | 2026-05 | Bibliothèque activités, archives, navigation |
| 3 | 2026-05 | Module Mes Padlets v1, galerie, viewer |
| 4 | 2026-05 | Padlet API, PadletViewer smart, 4 onglets |
| 5 | 2026-06 | Fiches & Bilans IA, export DOCX, sauvegarde |
| 6 | 2026-06 | Homogénéisation UI, plein écran, Cmd+K |
| 7 | 2026-06 | Audit Ultra-Premium (sécurité, SEO, UX, perf) |
| 8 | 2026-06 | Migration 009, types & queries école |
| 9 | 2026-06 | Module Élèves, Planning, Finances, Sidebar École, Dashboard KPIs |
| 10 | 2026-06-21 | Fix sécurité scripts, déploiement GitHub/Vercel |
| 11 | 2026-06-22 | Présences (010), Années scolaires + Feature flags + WhatsApp (011), settings pages |

> Dernière mise à jour : **2026-06-22** (v3.1)
