# 002 — Trigger `on_auth_user_created` absent en base (signup ne créait aucun profil)

**Date** : 2026-07-08
**Sévérité** : Critique (fonctionnalité cœur cassée en silence)
**Statut** : ✅ Résolu
**Tags** : `supabase auth`, `trigger`, `pg_trigger`, `handle_new_user`, `signup silencieux`, `admin.createUser`, `public.users`

## Symptôme

Après signup (self-service ou `supabase.auth.admin.createUser`), l'utilisateur est bien
créé dans `auth.users`, **mais aucune ligne n'apparaît dans `public.users`** — pas d'erreur,
pas d'exception, juste rien. Donc aucune organisation, aucun rôle, l'app est inutilisable
pour ce compte (redirigé en boucle, pas de profil).

## Contexte

Découvert en testant le flux de signup self-service pendant la vérification E2E du chantier
multi-tenant, juste après avoir appliqué `018_organizations.sql`.

## Diagnostic

1. Vérifié que `handle_new_user()` (la fonction) existait et avait le bon corps → oui.
2. Vérifié qu'un `INSERT` direct dans `public.users` via service role fonctionnait → oui
   (donc pas un problème de permissions/RLS sur la table cible).
3. Indice clé : deux comptes réels (`demo@gmail.com`, `teacher@khati.fr`), créés **après**
   la migration 005 (qui était censée réparer ce trigger), n'avaient eux non plus **aucune**
   ligne `public.users`. Seul le tout premier compte (backfillé manuellement par la
   migration 005) en avait une. → suggérait que le trigger ne s'exécutait plus du tout
   depuis un moment, indépendamment du chantier en cours.
4. Confirmation directe demandée à l'utilisateur via une requête de lecture pure dans le
   SQL Editor Supabase (pas d'accès SQL direct depuis l'agent — pas de CLI liée, pas de
   `DATABASE_URL` dans `.env.local`) :
   ```sql
   SELECT tgname, tgenabled, tgrelid::regclass::text AS table_name, tgfoid::regproc::text AS function_name
   FROM pg_trigger
   WHERE tgname = 'on_auth_user_created';
   ```
   Résultat : **"Success. No rows returned."** → le trigger n'existait pas du tout.

## Cause racine

`CREATE OR REPLACE FUNCTION handle_new_user()` (répété dans plusieurs migrations) préserve
l'OID de la fonction et met à jour son corps, mais ne recrée **jamais** le trigger qui
l'appelle. Le trigger `on_auth_user_created` était censé exister depuis la migration `002`
et rester attaché indéfiniment (`CREATE OR REPLACE FUNCTION` suffit normalement à faire
prendre effet un nouveau corps de fonction sans re-créer le trigger). Pour une raison
non identifiable a posteriori (reset de projet Supabase ? action manuelle ? incident
passé ?), le trigger a disparu de la base à un moment — cassant silencieusement tout
signup depuis, bien avant ce chantier multi-tenant.

## Solution

Recréer le trigger explicitement (idempotent) :
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```
Ajouté de façon permanente dans `018_organizations.sql`, juste après la définition de
`handle_new_user()` (§8), pour que la migration soit auto-suffisante sur une base fraîche
ET répare l'état actuel si rejouée.

## Fichiers concernés

- `supabase/migrations/018_organizations.sql`

## Comment éviter à l'avenir / signal d'alerte

Si un signup "réussit" côté API (pas d'erreur) mais que l'utilisateur n'a aucun profil
applicatif ensuite → vérifier en premier que le trigger `AFTER INSERT ON auth.users` existe
réellement en base (`pg_trigger`), ne pas supposer qu'il est toujours là parce que le code
de la migration le "recrée" — `CREATE OR REPLACE FUNCTION` ne recrée pas le trigger.
Voir aussi [003](003-index-unique-non-scope-organisation.md) : une fois le trigger
retrouvé/recréé, un tout autre bug (index) l'a fait échouer en silence côté logique métier.
