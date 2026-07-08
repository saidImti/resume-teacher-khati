# 006 — Scripts de vérification écrits dans le repo perturbent le serveur dev

**Date** : 2026-07-08
**Sévérité** : Mineure (fausse des résultats de test, pas un bug applicatif)
**Statut** : ✅ Contournement connu
**Tags** : `next dev`, `Fast Refresh`, `HMR`, `node -e`, `ESM`, `ERR_MODULE_NOT_FOUND`, `scratchpad`

## Symptôme

Pendant un test navigateur (login, remplissage de formulaire) piloté par script pendant
que `next dev` tourne, le comportement observé est incohérent (redirections inattendues,
formulaire vidé) — logs du serveur dev montrent une rafale de `[Fast Refresh] rebuilding`.

## Contexte

Création puis suppression de petits scripts Node (`.mjs`) de vérification directement
à la racine du repo, pendant qu'un serveur `next dev` tournait en parallèle pour tester
dans le navigateur.

## Cause racine

Le watcher de fichiers de Next.js surveille tout le répertoire du projet. Écrire/supprimer
des fichiers (même sans rapport avec l'app) déclenche des recompilations Fast Refresh, qui
peuvent réinitialiser l'état du composant React en cours de test dans le navigateur pendant
qu'un test piloté par outil est en cours (course entre la recompilation et l'action suivante
du script de test).

Problème secondaire rencontré en essayant de contourner ça en écrivant les scripts dans le
répertoire scratchpad (hors repo) : `node scratchpad/script.mjs` échoue avec
`ERR_MODULE_NOT_FOUND: Cannot find package '@supabase/supabase-js'` — la résolution de
modules ESM de Node part du répertoire du **fichier importé**, pas du `cwd`, donc un script
hors du repo ne trouve pas le `node_modules` du projet même en changeant de répertoire
avant de l'exécuter.

## Solution

Utiliser `node -e "code inline"` (ou `node --eval`) **depuis le répertoire du projet**,
sans jamais écrire de fichier sur le disque :
```bash
cd "chemin/du/projet" && node -e "
const { createClient } = require('@supabase/supabase-js')
// ...
"
```
Pour `-e`/`--eval`, Node utilise le `cwd` courant comme base de résolution de modules
(contrairement à un fichier `.mjs` importé, qui résout depuis son propre répertoire) —
donc ça trouve `node_modules` du projet sans toucher au filesystem surveillé par le
watcher de Next.js.

## Fichiers concernés

Aucun (méthodologie, pas de code applicatif).

## Comment éviter à l'avenir / signal d'alerte

Si un serveur dev tourne en parallèle d'un test navigateur piloté par script : ne jamais
créer/supprimer de fichiers dans le répertoire du projet entre deux actions du test.
Utiliser `node -e "..."` pour tout script Node ponctuel de vérification/diagnostic ayant
besoin des dépendances du projet (ex. `@supabase/supabase-js`), exécuté depuis la racine
du projet.
