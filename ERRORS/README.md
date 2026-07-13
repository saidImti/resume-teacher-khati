# ERRORS — Journal des problèmes rencontrés et de leurs solutions

> **Usage** : ce dossier n'est à consulter **qu'après 2-3 tentatives infructueuses** sur un
> problème difficile — pas en lecture systématique. Avant de creuser un bug compliqué en
> partant de zéro, scanner ce sommaire (mots-clés, symptôme) pour voir si un cas similaire
> a déjà été résolu. Chaque entrée est autonome et va droit à la cause + la solution.
>
> **Règle de mise à jour** : dès qu'un problème difficile (2-3 tentatives ou plus) est résolu,
> ajouter une entrée ici avec le même gabarit (voir un fichier existant), puis une ligne dans
> le tableau ci-dessous. Ce fichier est **dynamique** — toujours à jour, jamais figé.

## Sommaire

| # | Titre | Sévérité | Symptôme (mots-clés de recherche) | Lien |
|---|-------|----------|-----------------------------------|------|
| 001 | Fonction SQL référençant une colonne pas encore créée | Bloquant | `42703`, `column does not exist`, migration multi-sections, `LANGUAGE sql` | [001](001-migration-fonction-sql-ordre-colonnes.md) |
| 002 | Trigger `on_auth_user_created` absent en base | Critique | signup silencieux, pas de profil créé, `pg_trigger` vide, `handle_new_user` | [002](002-trigger-auth-users-manquant.md) |
| 003 | Index unique global bloquant le signup multi-org | Critique | `23505`, `duplicate key`, `500 opaque`, `unexpected_failure`, `academic_years` | [003](003-index-unique-non-scope-organisation.md) |
| 004 | Fuite cross-tenant : `queries.ts` et pages non scopées | 🔴 Critique | données d'une autre organisation visibles, dashboard qui affiche tout, client admin sans filtre | [004](004-fuite-cross-tenant-queries-non-scopees.md) |
| 005 | Domaines email inventés rejetés par Supabase | Mineure | `email_address_invalid`, `example.com`, comptes de test signup | [005](005-domaines-email-invalides-supabase-signup.md) |
| 006 | Scripts temporaires perturbent `next dev` | Mineure | Fast Refresh en rafale, test navigateur incohérent, `ERR_MODULE_NOT_FOUND` | [006](006-scripts-temporaires-perturbent-next-dev.md) |
| 007 | Invitation d'un membre : trigger ne voit pas `app_metadata` à temps | 🔴 Critique | invité devient admin de sa propre org, `admin.createUser`, `app_metadata`, race condition | [007](007-invite-app-metadata-race-condition-trigger.md) |

## Par catégorie

**Migrations SQL / Postgres** : [001](001-migration-fonction-sql-ordre-colonnes.md),
[002](002-trigger-auth-users-manquant.md), [003](003-index-unique-non-scope-organisation.md)

**Isolation multi-tenant** : [003](003-index-unique-non-scope-organisation.md),
[004](004-fuite-cross-tenant-queries-non-scopees.md), [007](007-invite-app-metadata-race-condition-trigger.md)

**Triggers `auth.users` / `app_metadata`** : [002](002-trigger-auth-users-manquant.md),
[007](007-invite-app-metadata-race-condition-trigger.md)

**Méthodologie de test / diagnostic** : [002](002-trigger-auth-users-manquant.md) (technique
du scaffolding `EXCEPTION WHEN OTHERS` pour voir une vraie erreur SQL derrière un 500 opaque),
[005](005-domaines-email-invalides-supabase-signup.md), [006](006-scripts-temporaires-perturbent-next-dev.md)

## Gabarit pour une nouvelle entrée

```markdown
# 00X — Titre court et descriptif

**Date** : AAAA-MM-JJ
**Sévérité** : Bloquant / Critique / Majeure / Mineure
**Statut** : ✅ Résolu / 🟡 Contournement / 🔴 Ouvert
**Tags** : mots-clés séparés par virgule, pour le grep/scan rapide

## Symptôme
Message d'erreur exact ou comportement observé.

## Contexte
Quand / où / pendant quelle tâche.

## Diagnostic
Étapes clés qui ont mené à la cause (pas tout le détail, l'essentiel).

## Cause racine
## Solution
(code/commande exacte si possible, copier-collable)

## Fichiers concernés
## Comment éviter à l'avenir / signal d'alerte
```
