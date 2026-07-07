# CHANTIER — Multi-tenant SaaS (organizations)

> **État : EN COURS — NE PAS MERGER SUR MAIN EN L'ÉTAT**
> Branche : `feat/multi-tenant-saas` · Dernière mise à jour : **2026-07-07**
> Migration `018_organizations.sql` : **écrite mais PAS ENCORE APPLIQUÉE** à la base.
> Le code de cette branche suppose la migration appliquée — le déployer avant
> d'appliquer le SQL casserait la prod. Séquence obligatoire : SQL d'abord, code ensuite.

## Pourquoi

L'utilisateur prépare un **SaaS** : chaque client (école) aura son propre logo, nom
et données, totalement isolés. Décisions actées (2026-07-06, AskUserQuestion) :
1. Multi-tenant complet **maintenant** (pas de demi-mesure mono-org).
2. **Inscription libre** (self-service) : créer un compte = créer son organisation, on en devient admin.
3. Données existantes → organisation « Teacher Khati » (backfill).
4. Rôle `viewer` ajouté en base (existait dans l'UI seulement).
5. Marque (logo + signataires) au niveau **organisation**.

Le plan complet approuvé est dans `C:\Users\saida\.claude\plans\recursive-gliding-hennessy.md`
(copie de sa substance ici — ce fichier est LA référence pour reprendre).

## Architecture décidée

- Table `organizations` ; `users.organization_id NOT NULL` (1 user = 1 org, limitation acceptée).
- `organization_id NOT NULL` **dénormalisé sur les ~26 tables** (y compris enfants de chaîne FK :
  sessions, contents, resumes, resume_sections, resume_activities, whatsapp_sends) —
  policies RLS plates uniformes, évite le piège des jointures sous RLS (cf. en-tête `attendance-report.ts`).
- Helpers SECURITY DEFINER : `current_org_id()`, `is_org_writer()` (admin+teacher),
  `has_site_access()` réécrit (exige le site dans l'org).
- **Triggers BEFORE INSERT org-fill** (from_user / from_site / from_group / from_session /
  from_resume / fallback) : l'ancien code déployé, qui ignore `organization_id`, continue de
  fonctionner entre l'application du SQL et le déploiement du code.
- `handle_new_user()` : invitation via `raw_app_meta_data->>'organization_id'`
  (**app_metadata = service-role only** — user_metadata serait falsifiable par le client) ;
  sinon self-service → crée l'org + rôle admin + **seed** 5 niveaux canoniques + année scolaire
  active (sans seed, une org neuve ne peut pas créer de groupe : pas d'UI levels).
- Matrice RLS : lecture = membres de l'org ; écriture admin+teacher sur le pédagogique/élèves/présences,
  admin seul sur config+finances (sites, levels, academic_years, pricing_rules, invoices, payments,
  whatsapp_*, feature_flags, signatories) ; tables personnelles (api_keys, pinterest_settings,
  user_tools, saved_fiches) restent owner-only. Delete groups admin-only (policy RESTRICTIVE).
- Uniques re-scopés par org : sites.slug, levels.slug, sites.registration_prefix,
  invoices.invoice_number, families.registration_number (+ dédoublonnage feature_flags /
  whatsapp_settings avant création des nouveaux uniques ; les uniques user_id sont **gardés**
  pour la fenêtre de déploiement → suppression en migration 019).
- Numéro d'inscription famille : advisory lock + MAX() **par org** ; trigger org-fill de families
  nommé `aa_families_org_fill` pour passer AVANT `trg_families_registration_number` (ordre alphabétique).
- Anti-escalade : `REVOKE INSERT/UPDATE ON users FROM authenticated` +
  `GRANT UPDATE (full_name, avatar_url, preferences, updated_at)` — un client ne peut jamais
  changer son `role`/`organization_id`.
- Storage `branding` : dossier = `organization_id` (anciens chemins `{user_id}/…` restent lisibles,
  tout passe par client admin + URLs signées ; pas de renommage SQL des objets).

## Bugs préexistants corrigés par ce chantier (confirmés en prod)

1. **Escalade de privilège** : `withApiAuth` donnait scope `admin` à toute session → CORRIGÉ (fait).
2. `GET /api/users` listait **toute l'instance** Supabase → CORRIGÉ (fait).
3. `PATCH /api/users/[id]` n'écrivait le rôle que dans user_metadata (aucun effet RLS) → CORRIGÉ (fait).
4. Inscription publique QR cassée : `sites.user_id` n'existe pas (erreur 42703 vérifiée) → à corriger dans l'étape « routes de données ».
5. `/inscription` absent de PUBLIC_ROUTES → CORRIGÉ (fait).

## ✅ FAIT (dans cette branche)

| Fichier | Contenu |
|---|---|
| `supabase/migrations/018_organizations.sql` | Migration complète idempotente (§1 organizations → §10 storage). **PAS APPLIQUÉE.** |
| `src/lib/with-api-auth.ts` | Retourne `{ userId, organizationId, role, scopes }` ; scopes par rôle (admin=r/w/a, teacher=r/w, viewer=r) ; clés API plafonnées par le rôle du propriétaire. |
| `src/lib/org.ts` | Nouveau : `getOrgContext()` (session → org+rôle), `getOrgIdForUser()` (legacy tokens). |
| `src/middleware.ts` | `/inscription` ajouté aux PUBLIC_ROUTES. |
| `src/types/index.ts` | `Organization`, `UserRole` + viewer, `User.organization_id`. |
| `src/app/auth/login/page.tsx` | Branding générique (plus de `getLogoUrlForSoleUser`), lien « Créer mon école ». |
| `src/app/auth/signup/page.tsx` + `SignupForm.tsx` | Nouveau : signup self-service (école/nom/email/password → metadata `school_name`, gère le cas confirmation email activée). |
| `src/app/api/users/route.ts` | GET membres de l'org uniquement ; POST invite via `app_metadata { organization_id, role }`, viewer accepté. |
| `src/app/api/users/[id]/route.ts` | Vérif même-org (404 sinon), PATCH écrit `public.users.role` + full_name, interdiction de changer son propre rôle. |
| `src/lib/branding.ts` | Org-level : `getLogoUrl(admin, organizationId)` lit `organizations.logo_url`, `getSignatories` filtre org, `getOrganizationName()` ajouté, chemins Storage `{orgId}/…`, `getLogoUrlForSoleUser` supprimé. |
| `src/app/api/branding/logo/route.ts` | `getOrgContext()`, admin-only (403), upload `{orgId}/logo.*`, update `organizations.logo_url`, suppression de l'ancien fichier si l'extension change. |
| `src/app/api/signatories/route.ts` + `[id]/route.ts` | GET = tout membre de l'org ; POST/PATCH/DELETE admin-only ; filtre + insert `organization_id` (le `user_id` NOT NULL reste renseigné avec le créateur jusqu'à la 019) ; cross-org → 404 ; chemins Storage org. |
| `src/components/layout/AppShell.tsx` | `getOrgContext()` → logo + **nom de l'org** + `role` passés à la Sidebar. |
| `src/components/layout/Sidebar.tsx` | Props `orgName`/`role` : nom de l'org dans le header (fallback « Mon école »), badge rôle (Admin / Enseignant·e / Lecture seule) dans le footer. |
| `src/app/(app)/settings/marque/page.tsx` | Fetch logo + signataires via `organizationId`. |
| `src/app/finances/invoice/[id]/print/page.tsx` | `getOrgContext()`, logo org, **facture filtrée par `organization_id`** (anti fuite cross-org par id deviné). |
| `src/app/presences/rapport/print/page.tsx` | `getOrgContext()`, logo + signataires org (`buildAttendanceReport` garde `userId` jusqu'à l'étape routes de données). |

`npx tsc --noEmit` : **vert** à ce stade (les appelants de branding compilent car les signatures
restent `(admin, string)` — mais ils passent encore `user.id`, sémantiquement faux → étape suivante).

## ⬜ RESTE À FAIRE (dans l'ordre)

1. ~~**Marque (suite)**~~ — ✅ FAIT (2026-07-07, voir tableau ci-dessus).
2. **Routes de données** — remplacer `.eq('user_id', …)` par `.eq('organization_id', …)` sur tous les admin-client + poser organization_id sur les inserts admin-client :
   - Inscription publique : `src/lib/registration-token.ts` (payload `{ organizationId }` + **branche legacy `userId`** via `getOrgIdForUser` — QR imprimés valides 90 j), `api/registration-link`, `api/public-registration`, `app/inscription/page.tsx` (le filtre sites.user_id cassé disparaît).
   - `src/lib/attendance-report.ts` + `api/attendance/report` : param `userId` → `organizationId`.
   - Finances : `api/invoices/current`, `invoices/generate-monthly`, `billing/bulk`, `api/payments`.
   - Config : `api/academic-years` (+activate/+[id]) — les lectures doivent renvoyer les années de l'ORG (pas du user), `api/feature-flags`, `api/whatsapp-settings` (upsert `onConflict: 'organization_id'`), `api/enrollments`, `api/pricing-rules`, `api/fiches/save` + history, `api/attendance` (+day/+sessions), `api/sites`, `api/groups`.
   - `src/lib/test-data.ts` : organizationId en paramètre (plus de « user_id du 1er élève ») + **purge scopée par org**.
3. **Gating viewer minimal** : masquer boutons de mutation si `role === 'viewer'` (AppShell passe le rôle). RLS = enforcement réel.
4. **`npx tsc --noEmit` + `npm run build`** verts.
5. **Appliquer 018** (utilisateur, SQL Editor Supabase — fichier complet en un shot). Pendant la fenêtre SQL→déploiement : **ne pas inviter d'utilisateur**.
6. **Vérification E2E** (serveur dev local + comptes jetables, protocole établi) :
   intégrité org1 (login existant, toutes les vues + prints) · signup crée org+seed ·
   **isolation totale org A/B** (UI + sondes API + client browser) · rôles (teacher écrit,
   viewer bloqué RLS + 403 API) · numéros d'inscription indépendants par org ·
   inscription publique QR (nouveau + legacy token) · marque par org · purge test scopée ·
   cleanup jetables.
7. **Déployer** (PR → merge → Vercel success) puis **documenter** (MASTER §16/§17/migrations,
   AUDIT, mémoire persistante) et une **migration 019** de nettoyage plus tard
   (drop users.logo_url, uniques user_id résiduels).

## Pièges à ne pas oublier en reprenant

- La migration DOIT être appliquée AVANT le merge du code (le code lit `organizations`).
- `handle_new_user()` : tester le signup tôt — une exception dans le trigger casse TOUS les signups (500 opaque).
- Vérifier si la **confirmation email** est activée côté Supabase (parcours signup différent).
- `academic_years` : après bascule org, l'admin verra des années auparavant invisibles (anciennes lignes user_id NULL / autre user) — normal, données de test, à nettoyer dans l'UI.
- `activities` passe de world-writable à org-scopée : nouvelles orgs = bibliothèque vide (seed minimal volontaire).
