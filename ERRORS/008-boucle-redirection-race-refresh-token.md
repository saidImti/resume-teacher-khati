# 008 — Boucle de redirection infinie /dashboard <-> /auth/login (race sur le refresh token)

**Date** : 2026-07-14
**Sévérité** : 🔴 Critique (compte réel de l'utilisateur bloqué en boucle de chargement infinie après le merge/déploiement du chantier multi-tenant)
**Statut** : ✅ Résolu
**Tags** : `supabase auth`, `refresh token`, `race condition`, `middleware`, `next/headers`, `boucle de redirection`, `getUser()`

## Symptôme

Après la fusion de `feat/multi-tenant-saas` sur `main` et le déploiement en production,
l'utilisateur (connecté avec son VRAI compte, pas un compte de test) a signalé que le site
« ne fait que charger » — la sidebar s'affichait mais la zone de contenu restait vide en
permanence sur `/dashboard`.

## Diagnostic

- `document.readyState` restait bloqué sur `"loading"` indéfiniment (jamais `"complete"`) —
  le flux de rendu côté serveur (streaming SSR) ne se terminait jamais.
- Les logs runtime Vercel ont montré le vrai pattern : `GET /dashboard` → `200`, puis presque
  immédiatement `GET /api/academic-years` → `401`, puis `GET /auth/login` → `307` (redirigé
  par le middleware vers `/dashboard` puisque la session EST valide), puis `/dashboard` → `200`
  à nouveau — un cycle qui se répète en boucle toutes les ~250-500ms, sans jamais se stabiliser.
- Vérifié que ce n'était PAS un problème de données : toutes les requêtes vers la vraie base
  (169 élèves, 5 sites réels) répondaient normalement et rapidement (< 1s) depuis un script
  Node direct avec le client admin.
- Cause réelle : **plusieurs appels indépendants à `supabase.auth.getUser()` pour la même
  navigation** — un dans `middleware.ts`, un autre dans `getOrgContext()` (Server Component
  `dashboard/page.tsx`), un autre encore dans la route `/api/academic-years` (fetchée côté
  client par `AcademicYearProvider` quasi simultanément au chargement de la page). Le refresh
  token Supabase est **à usage unique** (rotation) : quand deux de ces appels tentent de le
  rafraîchir en concurrence, un seul réussit, l'autre échoue avec une erreur d'auth → 401 côté
  API, et si c'est le Server Component qui perd la course, il fait `redirect('/auth/login')` —
  que le middleware, lui, rebondit aussitôt vers `/dashboard` puisque SA propre vérification a
  réussi. D'où la boucle.
- Ce risque existait déjà dans la conception (chaque route faisait sa propre vérification
  indépendante), mais n'avait jamais été déclenché avant : il faut un token d'accès proche de
  l'expiration ET plusieurs requêtes quasi simultanées pour la même session — improbable avec
  les comptes de test jetables (toujours fraîchement créés), très probable avec un compte réel
  resté inactif un moment avant de recharger la page.

## Solution

Le middleware devient la SEULE source de vérité pour la vérification d'auth par requête HTTP :
après un `auth.getUser()` réussi, il pose un header interne `x-mw-verified-user-id` sur la
requête transmise en aval (`NextResponse.next({ request: { headers } })`) — jamais exposé au
client, et systématiquement supprimé de la requête entrante avant d'être reposé, pour qu'un
client ne puisse jamais le falsifier. `getOrgContext()` (`src/lib/org.ts`) et `withApiAuth()`
(`src/lib/with-api-auth.ts`) lisent ce header en priorité et ne rappellent `auth.getUser()`
qu'en filet de secours (si jamais une route n'était pas couverte par le middleware). Ça ramène
le nombre de vérifications réseau à 1 par requête HTTP au lieu de 2, éliminant la course pour
le cas observé (SSR + fetch client immédiat pour la même navigation).

**Limite connue** : les routes plus anciennes qui appellent encore `auth.getUser()`
directement (hors `getOrgContext()`/`withApiAuth()` — `activites`, `fiches`, `padlet`,
`resumes`, `pinterest`, `whatsapp`...) ne bénéficient pas encore de ce fast-path. Risque
résiduel plus faible (routes moins souvent appelées en concurrence avec le chargement du
dashboard), mais à migrer vers le même pattern si un cas similaire réapparaît sur l'une
d'elles.

## Comment vérifier si ça revient

Si un utilisateur signale que le site « reste bloqué en chargement » : vérifier
`document.readyState` (bloqué sur `"loading"` = signe de ce bug), regarder les logs Vercel
runtime pour un pattern `/page (200) -> /api/xxx (401) -> /auth/login (307) -> /page (200)`
qui se répète, plutôt que de suspecter d'abord la base de données.
