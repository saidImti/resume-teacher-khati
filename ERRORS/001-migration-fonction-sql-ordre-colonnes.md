# 001 — Fonction SQL référençant une colonne pas encore créée

**Date** : 2026-07-07
**Sévérité** : Bloquant (migration entière annulée)
**Statut** : ✅ Résolu
**Tags** : `postgres`, `migration`, `42703`, `LANGUAGE sql`, `column does not exist`, `has_site_access`, `ordre d'exécution`

## Symptôme

En exécutant `018_organizations.sql` dans le SQL Editor Supabase :
```
ERROR: 42703: column s.organization_id does not exist
LINE 117: JOIN sites s ON s.id = site_uuid AND s.organization_id = u.organization_id
HINT: Perhaps you meant to reference the column "u.organization_id".
```

## Contexte

Migration multi-étapes dans un seul fichier `.sql`, collée en une fois dans le SQL Editor.
La fonction `has_site_access()` (§4, "helpers RLS") référençait `sites.organization_id`,
mais cette colonne n'était ajoutée que plus loin dans le même fichier, à la §5
("organization_id sur toutes les tables").

## Diagnostic

Lecture du fichier ligne par ligne autour du numéro de ligne donné par l'erreur —
la colonne référencée était bien ajoutée plus bas dans le même script.

## Cause racine

Postgres valide les colonnes référencées **dès la création** d'une fonction
`LANGUAGE sql` (contrairement à `LANGUAGE plpgsql`, où le corps n'est pas
validé en profondeur à la création — seulement au premier appel).
Donc l'ordre des sections dans un script SQL compte : toute fonction `LANGUAGE sql`
doit être définie **après** que les colonnes/tables qu'elle référence existent.

## Solution

Ajouter la colonne en avance, juste avant la fonction qui en a besoin :
```sql
ALTER TABLE sites ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE OR REPLACE FUNCTION has_site_access(site_uuid UUID)
RETURNS BOOLEAN AS $$ ... $$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;
```
La boucle plus bas (§5) qui fait `ADD COLUMN IF NOT EXISTS` sur toutes les tables reste
idempotente et n'est pas affectée par cet ajout anticipé.

**Bonne nouvelle collatérale** : comme le script est collé en une seule requête, Postgres
l'exécute comme une transaction unique (protocole simple query) — l'échec a tout annulé,
rien n'était resté en base. Pas de nettoyage nécessaire avant de relancer.

## Fichiers concernés

- `supabase/migrations/018_organizations.sql`

## Comment éviter à l'avenir / signal d'alerte

Dans un script de migration multi-sections, si une section "helpers/fonctions" est écrite
avant une section "ajout de colonnes", vérifier qu'aucune fonction `LANGUAGE sql` (pas
`plpgsql`) ne référence une colonne ajoutée plus tard. `plpgsql` tolère l'ordre inversé,
`sql` ne le tolère pas.
