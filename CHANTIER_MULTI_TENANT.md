# CHANTIER — Multi-tenant SaaS (organizations)

> **État : FUSIONNÉ SUR MAIN ET DÉPLOYÉ (2026-07-14)** — sur demande explicite de l'utilisateur
> (« implémente tout, ne me demande pas d'autorisation »), **avant la fin du plan de vérification
> ci-dessous**. Commit de fusion `c01eebd`, déploiement Vercel confirmé `success`
> (https://resume-teacher-khati.vercel.app). La branche `feat/multi-tenant-saas` reste
> l'historique de référence mais tout son contenu est désormais sur `main`.
>
> ⚠️ **Points du plan de vérification NON terminés au moment du merge** — à traiter maintenant
> en production plutôt qu'avant, puisque le merge a eu lieu en premier : QR d'inscription
> publique (nouveau format + ancien format legacy), marque (logo/signataires) par organisation
> en conditions réelles, et surtout **aucune confirmation avec le VRAI compte Teacher Khati**
> que rien n'a régressé (tout testé avec des comptes jetables uniquement). Voir « Reste à faire »
> ci-dessous, désormais à exécuter directement sur `main`/prod.
>
> Migration `018_organizations.sql` : **✅ APPLIQUÉE** à la base (+ 2 correctifs post-application,
> voir §6 et [ERRORS/002](ERRORS/002-trigger-auth-users-manquant.md), [ERRORS/003](ERRORS/003-index-unique-non-scope-organisation.md)).
>
> Pour mémoire : entre 2026-07-11 et 07-14, du travail **hors-scope** (fusion legacy : code
> d'inscription par site, formulaire dynamique multi-enfants, page `/settings/tarification`,
> 4 fixes de calcul tarifaire) a été fait sur cette branche à la demande de l'utilisateur, en plus
> du chantier multi-tenant lui-même. Détails : sessions 21-27 de `MASTER_PROJECT.md` et
> [`AUDIT_FUSION_TEACHER_KHATI.md`](./AUDIT_FUSION_TEACHER_KHATI.md) §5.

## 🔖 REPRISE ICI (résumé condensé — lire ceci en premier dans une nouvelle session)

**Ce qui vient d'être fait (2026-07-07 → 2026-07-09)** : étapes 1 à 5 du chantier terminées
(marque org-level, routes `/api/*` scopées, gating viewer UI, migration 018 appliquée).
Étape 6 (vérification E2E) **en cours** — a débusqué et corrigé **5 bugs**, dont deux critiques :
1. Migration cassée par un ordre de sections SQL → corrigé ([ERRORS/001](ERRORS/001-migration-fonction-sql-ordre-colonnes.md)).
2. Trigger de signup absent en base (bug préexistant, indépendant du chantier) → corrigé ([ERRORS/002](ERRORS/002-trigger-auth-users-manquant.md)).
3. Index unique bloquant le signup de toute 2ᵉ organisation → corrigé ([ERRORS/003](ERRORS/003-index-unique-non-scope-organisation.md)).
4. 🔴 **Fuite cross-tenant réelle** : le dashboard (et ~20 autres pages) d'une organisation
   neuve affichait les données de Teacher Khati → corrigé en profondeur ([ERRORS/004](ERRORS/004-fuite-cross-tenant-queries-non-scopees.md)).
5. 🔴 **Invitation d'un membre cassée** : un teacher/viewer invité devenait admin de sa
   propre organisation neuve au lieu de rejoindre celle de l'admin invitant (le trigger ne
   voit pas `app_metadata` à temps sur `admin.createUser`) → corrigé côté route
   `POST /api/users` ([ERRORS/007](ERRORS/007-invite-app-metadata-race-condition-trigger.md)).

**Étape 6, point 1 (rôles) : ✅ FAIT et vérifié en conditions réelles** (2026-07-09) —
3 comptes réels (admin/teacher/viewer) créés dans la même org via le chemin d'invitation
corrigé, login navigateur pour chacun :
- **viewer** : sidebar affiche bien le badge « Lecture seule », actions de création
  masquées côté UI, ET confirmé au niveau API (`fetch` direct) : `403 "Lecture seule"` sur
  une route pédagogique, `403 "Réservé aux administrateurs"` sur une route finances — donc
  pas qu'un masquage cosmétique.
- **teacher** : écriture pédagogique réussie (`POST /api/groups` → `201`, groupe créé avec
  le bon `organization_id`), bloqué sur action admin-only (`403` sur génération de factures).
- Comptes + organisation de test nettoyés après vérification, base revenue à l'état initial.
- **Reste mineur non bloquant** : le bouton « Nouveau cours » du header (pas dans
  `DashboardContent`, géré séparément) n'est pas gated par rôle côté UI — RLS bloque quand
  même l'écriture réelle en base, donc pas une faille de sécurité, juste un affichage à
  améliorer un jour (bouton visible pour un viewer qui échouerait à la soumission).

Isolation vérifiée en conditions réelles (login navigateur sur une org de test → dashboard
à 0 partout). Tout est commité et poussé sur `feat/multi-tenant-saas` (dernier commit :
voir `git log`). `tsc --noEmit` et `npm run build` verts.

**Ce qu'il reste à faire (dans l'ordre)** — reprendre ici :
1. ~~Vérifier les rôles teacher/viewer~~ — ✅ FAIT (voir ci-dessus).
2. ~~Vérifier les numéros d'inscription~~ — ✅ FAIT et vérifié en conditions réelles
   (2026-07-11) : 2 orgs de test (« Ecole Test Alpha », « Ecole Test Beta »), chacune avec
   1 site sans préfixe configuré (fallback `99`) et 1 élève inscrit. Résultat : **les deux
   ont reçu le numéro `99-00001`**, chacune indépendamment — le cas le plus strict possible
   (même préfixe fallback des deux côtés ; l'isolation vient donc bien du scoping
   `organization_id` dans le lock + le `MAX()` + l'index unique, pas d'une coïncidence de
   préfixes différents). Comptes de test créés via `admin.createUser({ email_confirm: true })`
   (voir [ERRORS/005](ERRORS/005-domaines-email-invalides-supabase-signup.md)) pour ne pas
   épuiser le rate limit d'emails de `signUp()` — un premier essai via le vrai flux
   self-service a d'ailleurs immédiatement heurté ce rate limit. Comptes + orgs de test
   nettoyés après vérification (cascade auth user → profil/familles/élèves via `user_id`,
   puis suppression explicite sites/levels/academic_years scopés org — ces tables n'ont pas
   de `user_id` cascade —, puis suppression de l'organisation), base revenue à l'état initial.
3. Vérifier l'inscription publique par QR code : le nouveau format de token (`{organizationId, userId}`)
   ET l'ancien format legacy (`{userId}` seul, pour les QR déjà imprimés) doivent tous les deux
   fonctionner.
4. Vérifier la marque (logo + signataires) par organisation en conditions réelles.
5. **Recommandé, pas encore fait** : demander à l'utilisateur de se reconnecter avec son VRAI
   compte Teacher Khati pour confirmer que rien n'a régressé après tous les fixes de cette
   session — l'agent n'a testé qu'avec des comptes jetables, jamais avec les vraies données.
6. Une fois tout validé : merger la PR, déployer, documenter (`MASTER_PROJECT.md` §16/§17,
   mémoire persistante), puis écrire la migration `019` de nettoyage (drop `users.logo_url`,
   drop les uniques `user_id` résiduels gardés pour la fenêtre de déploiement).

**Si un problème difficile survient** (2-3 tentatives infructueuses) : consulter
[`ERRORS/README.md`](ERRORS/README.md) avant de creuser à froid — un cas similaire a peut-être
déjà été rencontré et documenté (SQL, isolation multi-tenant, méthodologie de test).

---

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
| `src/app/api/users/route.ts` | GET membres de l'org uniquement ; POST invite via `app_metadata { organization_id, role }`, viewer accepté. **Corrigé le 2026-07-09** : force le profil + nettoie toute org parasite après `createUser` (le trigger ne voit pas `app_metadata` à temps — [ERRORS/007](ERRORS/007-invite-app-metadata-race-condition-trigger.md)). |
| `src/app/api/users/[id]/route.ts` | Vérif même-org (404 sinon), PATCH écrit `public.users.role` + full_name, interdiction de changer son propre rôle. |
| `src/lib/branding.ts` | Org-level : `getLogoUrl(admin, organizationId)` lit `organizations.logo_url`, `getSignatories` filtre org, `getOrganizationName()` ajouté, chemins Storage `{orgId}/…`, `getLogoUrlForSoleUser` supprimé. |
| `src/app/api/branding/logo/route.ts` | `getOrgContext()`, admin-only (403), upload `{orgId}/logo.*`, update `organizations.logo_url`, suppression de l'ancien fichier si l'extension change. |
| `src/app/api/signatories/route.ts` + `[id]/route.ts` | GET = tout membre de l'org ; POST/PATCH/DELETE admin-only ; filtre + insert `organization_id` (le `user_id` NOT NULL reste renseigné avec le créateur jusqu'à la 019) ; cross-org → 404 ; chemins Storage org. |
| `src/components/layout/AppShell.tsx` | `getOrgContext()` → logo + **nom de l'org** + `role` passés à la Sidebar. |
| `src/components/layout/Sidebar.tsx` | Props `orgName`/`role` : nom de l'org dans le header (fallback « Mon école »), badge rôle (Admin / Enseignant·e / Lecture seule) dans le footer. |
| `src/app/(app)/settings/marque/page.tsx` | Fetch logo + signataires via `organizationId`. |
| `src/app/finances/invoice/[id]/print/page.tsx` | `getOrgContext()`, logo org, **facture filtrée par `organization_id`** (anti fuite cross-org par id deviné). |
| `src/app/presences/rapport/print/page.tsx` | `getOrgContext()`, logo + signataires org, `buildAttendanceReport` par org. |
| `src/lib/registration-token.ts` | Payload `{ organizationId, userId }` (userId = émetteur, requis pour les inserts NOT NULL) ; tokens legacy `{ userId }` acceptés. |
| `src/lib/org.ts` | + `resolveRegistrationOrgId(payload)` (org du token, sinon `getOrgIdForUser`). |
| `src/app/api/registration-link/route.ts` | `getOrgContext()`, viewer 403, token org. |
| `src/app/inscription/page.tsx` | Sites + levels par org (fix 42703 `sites.user_id`), textes génériques (« votre école »). |
| `src/app/api/public-registration/route.ts` | Sites/levels/familles/pricing par org, inserts org, messages avec nom de l'org. |
| `src/lib/attendance-report.ts` + `api/attendance/report` | Param `userId` → `organizationId`. |
| `src/app/api/invoices/current` + `generate-monthly` + `[id]/status`, `billing/bulk`, `api/payments` | Admin-only + scoping org. **generate-monthly facturait TOUTES les familles de l'instance** (aucun filtre) → corrigé. Vérif famille même-org (404). |
| `src/app/api/families/[id]/archive` (writer) + `rate` (admin) | Cross-org corrigé (`eq organization_id`). |
| `src/app/api/students/[id]/status` | Writer + scoping org. |
| `src/app/api/academic-years` (+`activate`, +`[id]`) | Lectures par ORG (plus par user), mutations admin-only, inserts org. |
| `src/app/api/feature-flags` | GET org, PATCH admin-only par `(organization_id, feature_key)`. |
| `src/app/api/whatsapp-settings` | GET org, PATCH admin-only, upsert `onConflict: 'organization_id'`. |
| `src/app/api/enrollments` | Writer, vérif élève+groupe même-org, insert org, delete scopé org. |
| `src/app/api/pricing-rules` (+`[id]`) | Admin-only, vérif site même-org, scoping org. |
| `src/app/api/attendance` (+`day`, +`sessions`) | Org-scopé. **Fuites corrigées** : schedules du jour toutes-orgs ; présences filtrées « du marqueur » (l'appel d'un collègue était invisible) → filtre org. Viewer 403 sur les écritures. |
| `src/app/api/sites` (+`[id]`) | Insert + update/delete scopés `auth.organizationId` (withApiAuth). |
| `src/app/api/groups` (+`[id]`, +`reorder`) | **GET listait les groupes de toutes les orgs** → filtre org. POST/PATCH writer, DELETE admin-only, vérif site même-org. |
| `src/app/api/whatsapp/payment-reminder` (admin) + `catchup` (writer) | Settings + factures + présences par org ; signature « Teacher Khati » en dur → nom de l'org. |
| `src/lib/test-data.ts` + `api/test-data` (+`generate`) + `settings/mode-test` | `TestDataContext { organizationId, userId }` (plus de « user_id du 1er élève »), statut/génération/purge scopés org. |

`api/fiches/save` + `history` : inchangés volontairement — `saved_fiches` reste **owner-only**
(matrice RLS) et le trigger `org_fill_from_user` pose `organization_id` à l'insert.
Idem `keys`, `outils`, `pinterest` (tables personnelles).
`whatsapp/send` + `sends` : client session sans filtre user → la RLS org s'applique, rien à changer.

`npx tsc --noEmit` : **vert** à ce stade (les appelants de branding compilent car les signatures
restent `(admin, string)` — mais ils passent encore `user.id`, sémantiquement faux → étape suivante).

## ⬜ RESTE À FAIRE (dans l'ordre)

1. ~~**Marque (suite)**~~ — ✅ FAIT (2026-07-07, voir tableau ci-dessus).
2. ~~**Routes de données**~~ — ✅ FAIT (2026-07-07, voir tableau ci-dessus). `npx tsc --noEmit` et `npm run build` verts.
   (ancien périmètre ci-dessous, conservé pour référence) — remplacer `.eq('user_id', …)` par `.eq('organization_id', …)` sur tous les admin-client + poser organization_id sur les inserts admin-client :
   - Inscription publique : `src/lib/registration-token.ts` (payload `{ organizationId }` + **branche legacy `userId`** via `getOrgIdForUser` — QR imprimés valides 90 j), `api/registration-link`, `api/public-registration`, `app/inscription/page.tsx` (le filtre sites.user_id cassé disparaît).
   - `src/lib/attendance-report.ts` + `api/attendance/report` : param `userId` → `organizationId`.
   - Finances : `api/invoices/current`, `invoices/generate-monthly`, `billing/bulk`, `api/payments`.
   - Config : `api/academic-years` (+activate/+[id]) — les lectures doivent renvoyer les années de l'ORG (pas du user), `api/feature-flags`, `api/whatsapp-settings` (upsert `onConflict: 'organization_id'`), `api/enrollments`, `api/pricing-rules`, `api/fiches/save` + history, `api/attendance` (+day/+sessions), `api/sites`, `api/groups`.
   - `src/lib/test-data.ts` : organizationId en paramètre (plus de « user_id du 1er élève ») + **purge scopée par org**.
3. ~~**Gating viewer minimal**~~ — ✅ FAIT (2026-07-07) :
   - `src/contexts/OrgRoleContext.tsx` (nouveau) : `useOrgRole()` → `{ role, canWrite, isAdmin }`, injecté par AppShell (server → client, aucun fetch).
   - Sidebar : viewer ne voit que le hub Paramètres (années/fonctionnalités/mode test masqués).
   - Dashboard : quick actions de création + « Nouveau cours » + « Nouveau groupe » masqués si viewer.
   - Élèves : « Inscrire un élève » (canWrite), « Gérer » paiements (isAdmin), profil élève : « Modifier » + « Inscrire dans un groupe » (canWrite).
   - Familles & paiements : barre d'actions collectives + « Modifier le tarif » (isAdmin), « Archiver » (canWrite).
   - Finances : « Nouveau tarif », génération factures, relances, modifier/retirer tarif famille (isAdmin) — page consultable par tous.
   - Présences : viewer ne voit que l'onglet « Fiche de présence » (l'appel écrit des sessions).
   - Planning : boutons créer/dupliquer/modifier/supprimer créneau (canWrite).
   - Rappel : c'est de l'UX — l'enforcement réel est RLS + 403 API (étape 2).
4. ~~**`npx tsc --noEmit` + `npm run build`**~~ — ✅ verts (2026-07-07).
5. ~~**Appliquer 018**~~ — ✅ FAIT (2026-07-07). Un bug d'ordre trouvé au passage : `has_site_access()` (§4)
   référençait `sites.organization_id` avant sa création en §5 → 42703 à l'exécution (fonction
   `LANGUAGE sql`, validée à la création). Corrigé en ajoutant `ALTER TABLE sites ADD COLUMN
   IF NOT EXISTS organization_id …` juste avant la fonction. La première tentative avait échoué
   dans une transaction unique → rien n'était resté en base, pas de nettoyage nécessaire avant
   la 2e exécution (réussie). Pendant la fenêtre SQL→déploiement : **ne pas inviter d'utilisateur**.
6. **Vérification E2E** — EN COURS (2026-07-08), deux bugs bloquants trouvés et corrigés en base +
   **un bug majeur trouvé et corrigé dans le code** :
   - ✅ Backfill vérifié en base (service role, lecture seule) : 1 seule org « Teacher Khati »,
     `organization_id` NOT NULL et peuplé sur les 17 tables métier testées, comptes réels intacts.
   - 🔴 **Bug préexistant #1 — trigger manquant** : `on_auth_user_created` sur `auth.users`
     n'existait plus du tout en base (`pg_trigger` vide) — indépendant de ce chantier, cassé depuis
     un moment (2 comptes créés après la migration 005, censée l'avoir réparé, n'ont jamais eu de
     ligne `public.users`). Conséquence : `handle_new_user()` ne s'exécutait jamais, donc **aucun
     signup ne créait de profil ni d'organisation**. Corrigé dans `018_organizations.sql` (ajout
     idempotent juste après §8) + fix appliqué en base par l'utilisateur.
   - 🔴 **Bug de migration #2 — index unique non re-scopé** : `idx_academic_years_active` (hérité de
     `001_initial_schema.sql`, `UNIQUE (is_active) WHERE is_active = true`, GLOBAL toute la table)
     bloquait le seed de `handle_new_user()` en 23505 dès qu'UNE org avait déjà une année active —
     **cassait le signup pour toute organisation créée après la première**. Diagnostiqué via
     scaffolding temporaire (table `_debug_trigger_errors` + `EXCEPTION WHEN OTHERS` capturant
     `SQLERRM`, posé et retiré en live — nécessaire car GoTrue masque les erreurs SQL réelles
     derrière un « 500 opaque »/`unexpected_failure`). Corrigé dans `018_organizations.sql` §7 :
     remplacé par `idx_academic_years_org_active (organization_id, is_active)`.
   - 🔴 **Bug majeur #3 — isolation cross-tenant réelle, hors périmètre initial de l'étape 2** :
     l'étape 2 n'avait scopé que les routes `/api/*` ; **`src/lib/supabase/queries.ts` (24 fonctions,
     utilisées par ~20 Server Components pages)** ne filtrait JAMAIS par organisation. Constaté
     concrètement : le Dashboard d'une organisation neuve (« École Test A », 0 élève) affichait les
     169 élèves, 5 sites, finances et planning réels de Teacher Khati. Cause : ces pages appellent
     `getSites(admin)`, `getStudentStats(admin)`, etc. avec le client ADMIN (bypass RLS) et sans
     aucun paramètre d'org. **Corrigé en profondeur** :
     - `queries.ts` réécrit entièrement : chaque fonction exige désormais `organizationId` et filtre
       `.eq('organization_id', …)`.
     - `npx tsc --noEmit` utilisé comme checklist pour retrouver tous les appelants cassés par le
       changement de signature (stratégie efficace pour ce genre de refactor large).
     - 10 fichiers corrigés via ce mécanisme : dashboard, eleves (page/new/[id]/[id]/edit/
       familles-paiements), finances, mes-padlets, planning (+ `PlanningContent.tsx` client, prop
       `organizationId` ajoutée), resumes/new.
     - Audit manuel complémentaire des pages utilisant `createAdminSupabaseClient` en dehors de
       `queries.ts` (requêtes `.from(...)` directes) : 8 bugs cross-org supplémentaires trouvés et
       corrigés — `archives` (liste), `presences` (page, commentaire "mono-utilisateur" obsolète),
       `resumes/generated` (IDs manipulables via URL), `settings/sites`, `settings/groups`
       (liste/new/[id]/edit), `outils` (whatsapp_settings filtré par user_id au lieu de l'org),
       `presences/rapport/print` (nom site/groupe). Les 22 pages utilisant le client admin sont
       désormais toutes auditées et scopées.
     - Pages sûres identifiées sans modification nécessaire : `activites/*` et `archives/[id]`
       utilisent le client de session (RLS org appliquée automatiquement) ; `StudentForm.tsx`
       (insert client direct) protégé par RLS + trigger `org_fill_from_user`.
   - ✅ **Isolation vérifiée en conditions réelles** : 2 organisations jetables créées via
     `admin.createUser` (`email_confirm: true`, domaine à MX valide type gmail.com — Supabase
     rejette `@example.com` et les domaines inventés en `email_address_invalid`), login réel en
     navigateur sur « École Test A » → Dashboard affiche 0 partout (avant fix : données de Teacher
     Khati). Comptes de test + organisations nettoyés après vérification (base revenue à l'état
     initial : 3 users réels, 1 org).
   - ⬜ Reste à vérifier : rôles (teacher écrit, viewer bloqué RLS + 403 API) · numéros
     d'inscription indépendants par org · inscription publique QR (nouveau + legacy token) ·
     marque par org · purge test scopée (déjà testée au niveau lib, à revalider UI) ·
     re-tester l'intégrité du compte réel Teacher Khati après ce chantier de fixes (login manuel
     par l'utilisateur recommandé, credentials non partagés avec l'agent).

**Piège méthodologique noté pour la suite** : ne jamais écrire/supprimer des scripts de vérification
DANS le repo pendant que le serveur dev tourne — Next.js les détecte et déclenche des rebuilds Fast
Refresh qui peuvent perturber la session navigateur en cours de test. Utiliser `node -e "..."` depuis
le répertoire du projet (résout `node_modules` via cwd sans toucher au filesystem surveillé).
7. **Déployer** (PR → merge → Vercel success) puis **documenter** (MASTER §16/§17/migrations,
   AUDIT, mémoire persistante) et une **migration 019** de nettoyage plus tard
   (drop users.logo_url, uniques user_id résiduels).

## Pièges à ne pas oublier en reprenant

- La migration DOIT être appliquée AVANT le merge du code (le code lit `organizations`).
- `handle_new_user()` : tester le signup tôt — une exception dans le trigger casse TOUS les signups (500 opaque).
- Vérifier si la **confirmation email** est activée côté Supabase (parcours signup différent).
- `academic_years` : après bascule org, l'admin verra des années auparavant invisibles (anciennes lignes user_id NULL / autre user) — normal, données de test, à nettoyer dans l'UI.
- `activities` passe de world-writable à org-scopée : nouvelles orgs = bibliothèque vide (seed minimal volontaire).
