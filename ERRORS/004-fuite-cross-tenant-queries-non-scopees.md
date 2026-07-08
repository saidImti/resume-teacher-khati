# 004 — Fuite cross-tenant : `queries.ts` et ~20 pages ne filtraient jamais par organisation

**Date** : 2026-07-08
**Sévérité** : 🔴 Critique (fuite de données réelles entre organisations)
**Statut** : ✅ Résolu
**Tags** : `multi-tenant`, `isolation`, `RLS bypass`, `client admin`, `cross-tenant leak`, `Server Component`, `queries.ts`, `organization_id manquant`

## Symptôme

Le Dashboard d'une organisation **toute neuve** ("École Test A", 0 élève créé) affichait
les **169 élèves réels, 5 sites, le planning et les finances de Teacher Khati** (l'organisation
existante). Constaté visuellement en se connectant en navigateur avec un compte de test
fraîchement créé pour "École Test A".

## Contexte

Découvert pendant l'étape 6 (vérification E2E) du chantier multi-tenant, **après** que
l'étape "routes de données" (précédente session) ait été déclarée terminée. Cette étape
précédente n'avait scopé par organisation que les routes `/api/*/route.ts` — pas les
Server Components (`page.tsx`) qui appellent directement les fonctions de
`src/lib/supabase/queries.ts`.

## Diagnostic

1. Lecture de `src/app/(app)/dashboard/page.tsx` : appelait `getSites(admin)`,
   `getStudentStats(admin)`, etc. — **aucun paramètre d'organisation nulle part**.
2. Lecture de `src/lib/supabase/queries.ts` (24 fonctions exportées) : **aucune** ne
   filtrait par `organization_id`. Beaucoup sont appelées avec le client **admin**
   (qui bypass RLS), donc même la sécurité de repli de la RLS ne s'appliquait pas.
3. Recherche des autres appelants : `grep -rl "createAdminSupabaseClient" app --include="page.tsx"`
   → 22 fichiers, dont beaucoup pas encore audités du tout dans ce chantier.

## Cause racine

Angle mort de planification : l'étape "routes de données" avait été comprise (à tort)
comme couvrant uniquement les endpoints `/api/*`. Or dans cette architecture Next.js App
Router, une part importante des lectures de données passe par des **Server Components**
qui appellent une couche de requêtes partagée (`queries.ts`) directement avec le client
admin — jamais via une route API. Cette couche entière avait été oubliée du scoping
multi-tenant.

## Solution

**1. Réécriture systématique de `queries.ts`** : chaque fonction exige désormais un
paramètre `organizationId: string` et l'utilise dans un `.eq('organization_id', ...)`.

**2. `tsc --noEmit` utilisé comme checklist** — après le changement de signature, chaque
appelant qui n'avait pas encore le nouveau paramètre devient une erreur TypeScript. Stratégie
efficace pour ne rien manquer sur un refactor de grande ampleur :
```bash
npx tsc --noEmit 2>&1 | sed -E 's/\([0-9]+,[0-9]+\).*//' | sort -u   # liste des fichiers à corriger
```
10 fichiers corrigés ainsi (dashboard, `eleves` ×5, `finances`, `mes-padlets`, `planning`
+ `PlanningContent.tsx` client — a nécessité d'ajouter une prop `organizationId`, `resumes/new`).

**3. Audit manuel des pages avec requêtes `.from(...)` directes** (hors `queries.ts`) :
`grep -rl "createAdminSupabaseClient" app --include="page.tsx"` a donné 22 fichiers.
Comparaison avec les fichiers déjà corrigés → 8 bugs supplémentaires trouvés et corrigés :
`archives` (liste), `presences` (page — avait un commentaire "app mono-utilisateur" resté
obsolète), `resumes/generated` (IDs dans l'URL, manipulables), `settings/sites`,
`settings/groups` (liste + new + [id]/edit), `outils` (`whatsapp_settings` filtré par
`user_id` au lieu de l'org — incohérence fonctionnelle, pas une fuite), `presences/rapport/print`
(nom de site/groupe).

**4. Vérification qu'aucun fichier n'a été oublié** : re-listage des 22 fichiers admin-client,
confirmation que chacun est désormais scopé.

**5. Vérification en conditions réelles** : login navigateur avec un compte "École Test A"
fraîchement créé → dashboard affiche 0 partout (au lieu des données de Teacher Khati).

## Fichiers concernés

`src/lib/supabase/queries.ts` + 20 pages Server Component (liste complète dans le commit
`8195364` et dans `CHANTIER_MULTI_TENANT.md` §6).

**Pages jugées déjà sûres sans modification** :
- `activites/*`, `archives/[id]` : utilisent le client de **session** (RLS s'applique
  automatiquement, contrairement au client admin).
- `components/eleves/StudentForm.tsx` (insert client direct) : protégé par RLS +
  trigger `org_fill_from_user` qui remplit `organization_id` automatiquement depuis
  `user_id` avant l'écriture.

## Comment éviter à l'avenir / signal d'alerte

Lors d'un passage à une architecture multi-tenant : ne JAMAIS considérer "routes de
données scopées" comme terminé sans avoir explicitement vérifié **toutes** les
Server Components, pas seulement les routes API. Commande de vérification rapide :
```bash
grep -rl "createAdminSupabaseClient" src/app --include="page.tsx"
```
Chaque résultat doit avoir un appel à `getOrgContext()` et passer `organizationId` (ou
`ctx.organizationId`) à chaque requête `.from(...)` ou fonction de `queries.ts`. Le client
admin bypass RLS — c'est le mécanisme le plus dangereux pour une fuite cross-tenant
silencieuse, car aucune erreur ne se produit, les données sont juste mélangées.
