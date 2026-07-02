# Migration Fiche Inscription → RTK

> ⚠️ **CHANTIER REQUALIFIÉ (2026-07-02)** : il a été établi que **toutes les données
> de Fiche Inscription sont fictives** (`source:"test"`) — il n'y a **rien à migrer**.
> Ces scripts restent comme outillage (audit qualité, client admin) mais aucun
> `--commit` de données ne doit être lancé. Le dump extrait est conservé sous
> `dumps/DONNEES-DE-TEST-ne-pas-migrer.json`. Voir l'audit §11 pour le nouveau périmètre.

Scripts de migration ponctuelle du dashboard legacy (`Fiche Inscription Teacher Khati`,
HTML/localStorage) vers RTK (Supabase). Découpage et décisions : voir
[`AUDIT_FUSION_TEACHER_KHATI.md`](../../AUDIT_FUSION_TEACHER_KHATI.md) §8.

## Principes

- **Dry-run par défaut.** Rien n'est écrit sans `--commit`.
- **Idempotent.** Relançable sans créer de doublons (match par nom normalisé).
- **Erreur isolée.** Une erreur sur un enregistrement = log + skip, jamais d'avortement du batch.
- **Traçabilité.** Correspondance ancien id → UUID dans `scripts/migration/.state/id-map.json` (git-ignoré).

## Étape 0 — Exporter les données legacy (prérequis absolu)

1. Ouvrir `C:\AI-Businesses\Fiche Inscription Teacher Khati\dashboard.html` dans le navigateur.
2. Cliquer le bouton **« ⬇ Export migration »** (bas à droite).
3. Un fichier `export-fiche-inscription-<date>.json` est téléchargé.
4. Le déposer dans `scripts/migration/dumps/` (dossier git-ignoré).

> Sans cet export, aucun module ne peut connaître les données réelles.

## Modules

| Ordre | Script | Périmètre | Statut |
|-------|--------|-----------|--------|
| 00 | `00-referentiels.mjs` | Sites (+ préfixe), niveaux, années scolaires | ✅ Écrit |
| 01 | `01-familles-eleves.mjs` | `families` + `students` | ⏳ À venir |
| 02 | `02-tarification.mjs` | `pricing_rules` + `custom_monthly_rate` | ⏳ À venir |
| 03 | `03-inscriptions-groupes.mjs` | `enrollments` (+ création groups/schedules) | ⏳ À venir |
| 04 | `04-finances.mjs` | `invoices` + `payments` | ⏳ À venir |
| 05 | `05-presences.mjs` | `attendance` (pas de backfill) | ⏳ À venir |

Ordre de dépendance : `00 → 01 → {02, 03} → 04 → 05`.

## Module 00 — Référentiels

Prérequis commit : migration `015_registration_prefix.sql` appliquée.

```bash
# Dry-run (recommandé d'abord — aucune écriture) :
node scripts/migration/00-referentiels.mjs --dump=scripts/migration/dumps/export-....json

# Écriture réelle après relecture du dry-run :
node scripts/migration/00-referentiels.mjs --dump=scripts/migration/dumps/export-....json --commit
```

Ce que fait le module :

- **Niveaux** — confirme les 5 niveaux seedés (`preschoolers`…`teenagers`), construit la table de correspondance `slug → level_id`. Ne crée rien (conflit zéro).
- **Années scolaires** — confirme les années existantes ; **signale** (sans les créer) les années legacy absentes de RTK.
- **Sites** — dérive les sites réels (union des `insc.lieu` utilisés + clés `tk_sites` avec code), fusionne les variantes (`Champigny`/`champigny `), matche par nom normalisé aux sites RTK existants, **crée** les manquants, et pose le `registration_prefix` hérité (code 10/20…). Détecte les doublons de préfixe (contrainte unique).

Les **groupes/créneaux** ne sont PAS traités ici : conflit structurel géré au Module 03.

## Fichiers utilitaires (`lib/`)

- `env.mjs` — chargement `.env.local` + client admin Supabase (service role).
- `legacy-dump.mjs` — lecture/normalisation du dump JSON exporté.
- `normalize.mjs` — clés de matching, slugs, retrait d'accents.
- `id-map.mjs` — persistance de la correspondance ancien id → UUID.
- `report.mjs` — rapport dry-run/commit lisible (créations, réutilisations, conflits, warnings).
