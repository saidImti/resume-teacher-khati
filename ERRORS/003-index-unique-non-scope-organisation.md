# 003 — Index unique global bloquant le signup de toute 2e organisation

**Date** : 2026-07-08
**Sévérité** : Critique (bloquait TOUT signup après le premier)
**Statut** : ✅ Résolu
**Tags** : `postgres`, `23505`, `duplicate key`, `unique index`, `academic_years`, `multi-tenant`, `500 opaque`, `unexpected_failure`, `diagnostic trigger`

## Symptôme

`supabase.auth.admin.createUser(...)` échoue avec :
```
AuthApiError: Database error creating new user
status: 500, code: 'unexpected_failure'
```
Aucun détail sur la cause SQL réelle — GoTrue masque systématiquement l'erreur Postgres
derrière ce message générique.

## Contexte

Après avoir corrigé [002](002-trigger-auth-users-manquant.md) (trigger recréé), le trigger
s'exécutait enfin — mais échouait maintenant pour une raison différente, dès qu'on essayait
de créer une **deuxième** organisation (la première, "Teacher Khati", existait déjà avec une
année scolaire active).

## Diagnostic

L'erreur HTTP ne donne aucun détail exploitable. Pour voir l'erreur SQL réelle, mise en place
d'un **scaffolding de diagnostic temporaire** (posé, utilisé, puis retiré) :
```sql
CREATE TABLE IF NOT EXISTS _debug_trigger_errors (
  id BIGSERIAL PRIMARY KEY, occurred_at TIMESTAMPTZ DEFAULT now(),
  message TEXT, sqlstate TEXT, detail TEXT
);
-- dans handle_new_user(), remplacer le corps par un bloc avec :
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _debug_trigger_errors (message, sqlstate, detail)
  VALUES (SQLERRM, SQLSTATE, 'handle_new_user diagnostic capture');
  RETURN NEW;  -- on avale l'erreur pour laisser auth.users se créer et pouvoir lire la table de debug
```
Point clé : dans un bloc `EXCEPTION`, tout ce qui a été fait DEPUIS le `BEGIN` (org créée,
niveaux, année) est automatiquement annulé (savepoint implicite) — mais l'écriture faite
*dans* le handler `EXCEPTION` elle-même est conservée si la transaction globale finit par
réussir (ici : `RETURN NEW` sans re-`RAISE`).

Résultat capturé dans `_debug_trigger_errors` :
```
message: duplicate key value violates unique constraint "idx_academic_years_active"
sqlstate: 23505
```

## Cause racine

`idx_academic_years_active` (hérité de `001_initial_schema.sql`) :
```sql
CREATE UNIQUE INDEX idx_academic_years_active ON academic_years (is_active) WHERE is_active = true;
```
Un index unique **partiel mais global** (`is_active = true` sur toute la table, pas
scopé par organisation). Dans le monde mono-tenant d'origine, il garantissait "une seule
année active dans toute l'app". En multi-tenant, il empêche **toute organisation autre
que la première** d'avoir sa propre année active — exactement ce que fait le seed de
`handle_new_user()` à chaque nouveau signup.

La migration `018_organizations.sql` §7 avait bien re-scopé plusieurs autres uniques
(`sites.slug`, `levels.slug`, `invoices.invoice_number`, etc.) par organisation, mais
avait **oublié celui-ci**.

## Solution

```sql
DROP INDEX IF EXISTS idx_academic_years_active;
CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_org_active
  ON academic_years (organization_id, is_active) WHERE is_active = true;
```
Ajouté dans `018_organizations.sql` §7, à côté des autres uniques re-scopés.
Une fois corrigé : deux organisations avec chacune leur année active coexistent sans
conflit. Vérifié par re-test direct (création réussie, org + 5 niveaux + année active
tous corrects).

**Nettoyage** : le scaffolding de diagnostic (`_debug_trigger_errors` + `EXCEPTION WHEN
OTHERS`) a été retiré une fois la cause confirmée — `handle_new_user()` restaurée à sa
version stricte (les erreurs futures doivent remonter normalement, pas être avalées).

## Fichiers concernés

- `supabase/migrations/018_organizations.sql`

## Comment éviter à l'avenir / signal d'alerte

Lors d'un passage mono-tenant → multi-tenant : **grep systématiquement tous les
`CREATE UNIQUE INDEX` / contraintes `UNIQUE` existants** (pas seulement ceux qu'on se
souvient avoir vus) et vérifier lesquels doivent être re-scopés par `organization_id`.
Ne pas se fier à la mémoire de "je les ai tous faits" — `grep -rn "UNIQUE" supabase/migrations/`
et comparer à la liste effectivement re-scopée dans la migration multi-tenant.

Pour tout signup qui échoue en `500`/`unexpected_failure` opaque côté GoTrue : le
scaffolding `EXCEPTION WHEN OTHERS` + table de log est LA technique pour voir l'erreur
Postgres réelle sans accès direct à la base (pas de CLI liée, pas de `DATABASE_URL`).
