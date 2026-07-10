# 007 — Invitation d'un membre : le trigger ne voit pas `app_metadata` à temps

**Date** : 2026-07-09
**Sévérité** : 🔴 Critique (invitation d'un membre cassait complètement l'isolation multi-tenant)
**Statut** : ✅ Résolu (fix applicatif, pas un fix DB)
**Tags** : `supabase auth`, `admin.createUser`, `app_metadata`, `raw_app_meta_data`, `trigger AFTER INSERT`, `race condition`, `invitation`, `organisation parasite`

## Symptôme

En invitant un membre dans une organisation (`POST /api/users` avec `role: 'teacher'` ou
`'viewer'`), le nouvel utilisateur se retrouvait **admin d'une toute nouvelle organisation
à lui**, au lieu de rejoindre l'organisation de l'admin qui invite avec le rôle demandé.
Reproduit et confirmé aussi via `supabase.auth.admin.createUser()` appelé directement en
script (donc pas spécifique à Next.js/React, un vrai comportement Supabase/Postgres).

## Contexte

Découvert en testant les rôles teacher/viewer pendant la vérification E2E (étape 6, point
1 de `CHANTIER_MULTI_TENANT.md`) — juste après avoir confirmé (voir
[002](002-trigger-auth-users-manquant.md), [003](003-index-unique-non-scope-organisation.md))
que `handle_new_user()` fonctionnait correctement pour le signup self-service.

## Diagnostic

1. Vérifié que l'`app_metadata` était bien stocké avec `organization_id` et `role` corrects
   via `supabase.auth.admin.getUserById(userId)` — **oui**, les valeurs étaient bien là.
2. Vérifié que l'organisation cible existait bien en base au moment de l'invitation — **oui**.
3. Vérifié le corps réel de `handle_new_user()` en base (lecture seule, `pg_get_functiondef`)
   — la logique de la fonction était **correcte** : elle vérifie bien
   `NEW.raw_app_meta_data->>'organization_id'` et bascule sur la branche « invitation »
   si l'org existe.
4. Donc : métadonnées correctes (après coup), fonction correcte, organisation existante —
   et pourtant le trigger prend quand même la branche self-service. Seule explication
   cohérente : au moment précis où le trigger `AFTER INSERT ON auth.users` s'exécute,
   `NEW.raw_app_meta_data` ne contient **pas encore** `organization_id`/`role`. L'API admin
   de Supabase semble insérer la ligne `auth.users` avec des métadonnées minimales, PUIS
   poser les métadonnées personnalisées dans une étape séparée (visible seulement par une
   lecture *après coup*, comme `getUserById`) — le trigger, lui, ne voit que l'état au
   moment de l'`INSERT`.

## Cause racine

Le trigger `AFTER INSERT ON auth.users` ne peut pas être fiable pour lire un
`app_metadata` posé via `supabase.auth.admin.createUser({ app_metadata: {...} })` : la
valeur visible par la suite (via `getUserById`) ne correspond pas forcément à ce que
`NEW.raw_app_meta_data` contenait réellement à l'instant de l'`INSERT` déclencheur.

## Solution

**Ne pas faire confiance au trigger pour ce chemin.** Dans `POST /api/users` (la route
d'invitation réelle), après l'appel à `createUser`, forcer explicitement le profil aux
valeurs voulues et nettoyer toute organisation parasite que le trigger aurait créée par
erreur :
```ts
const { data, error } = await admin.auth.admin.createUser({
  email, password, email_confirm: true,
  user_metadata: { display_name, full_name: display_name },
  app_metadata: { organization_id: auth.organizationId, role },
})
if (error) return ...

const newUserId = data.user.id
const { data: profile } = await admin.from('users').select('organization_id').eq('id', newUserId).maybeSingle()

// Organisation parasite créée par la branche self-service si le trigger
// n'a pas vu organization_id à temps.
const strayOrgId = profile?.organization_id && profile.organization_id !== auth.organizationId
  ? profile.organization_id : null

const { error: fixError } = await admin.from('users')
  .update({ organization_id: auth.organizationId, role })
  .eq('id', newUserId)
if (fixError) { await admin.auth.admin.deleteUser(newUserId); return ... }

if (strayOrgId) {
  for (const t of ['levels', 'academic_years', 'sites', 'groups']) {
    await admin.from(t).delete().eq('organization_id', strayOrgId)
  }
  await admin.from('organizations').delete().eq('id', strayOrgId)
}
```
Vérifié par re-test complet : 3 comptes (admin/teacher/viewer) créés dans la même
organisation avec les bons rôles, aucune organisation parasite résiduelle
(`SELECT count(*) FROM organizations` repasse au nombre attendu après le fix, contre
+1 par invitation avant le fix).

## Fichiers concernés

- `src/app/api/users/route.ts` (`POST` — invitation d'un membre)

## Comment éviter à l'avenir / signal d'alerte

**Ne jamais faire dépendre une logique métier critique (assignation d'organisation, rôle)
d'un trigger `AFTER INSERT ON auth.users` lisant `app_metadata`/`user_metadata` posé via
`admin.createUser()` — la valeur n'est pas garantie visible au moment exact de l'INSERT.**
Le signup self-service (sans `app_metadata` custom) fonctionne correctement car il n'y a
rien à lire dans ce cas précis (branche par défaut). Mais dès qu'on pose un `app_metadata`
personnalisé à la création, vérifier après coup ce qui a été réellement appliqué et
corriger si besoin — ne pas supposer que le trigger l'a vu.

Si un futur flux d'invitation/import en masse est ajouté, appliquer le même pattern
(create → vérifier/forcer le profil → nettoyer toute org parasite).
