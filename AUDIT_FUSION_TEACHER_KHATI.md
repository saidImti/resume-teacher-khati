# Audit Comparatif — Fiche Inscription vs Résumé Teacher Khati (RTK)
### Diagnostic et plan de fusion

> **Document de référence pour le projet de fusion.** À consulter et mettre à jour avant toute implémentation touchant aux modules Élèves, Finances, Présences ou Inscription publique. Voir méthodologie imposée en bas de ce document.

**Date de l'audit initial :** 2026-06-30
**Dernière mise à jour :** 2026-07-01 (correction sur le statut de la clé Supabase)
**Projets audités :**
- `C:\AI-Businesses\Fiche Inscription Teacher Khati\` (dashboard.html, monolithe localStorage)
- `C:\AI-Businesses\Resumé Teacher Khati\Résumé Teacher Khati\` (ce projet, Next.js + Supabase)

---

## 1. Synthèse exécutive

Ce ne sont pas deux projets avec "des parties similaires" — ce sont **deux systèmes qui gèrent en double le cœur métier de l'école** (familles, élèves, tarification, paiements, inscription publique), construits sur des piles techniques incompatibles, **sans synchronisation fiable entre eux**.

| | **Fiche Inscription** | **Résumé Teacher Khati (RTK)** |
|---|---|---|
| Stack | HTML/CSS/JS monolithique (1 fichier, 11 957 lignes) | Next.js 14 + TypeScript + Supabase + Vercel |
| Données | `localStorage` (navigateur local) | PostgreSQL avec Row-Level Security |
| Auth | Mot de passe `12345678` en clair dans le code | Supabase Auth (JWT) |
| Multi-poste | ❌ Non (1 navigateur = 1 silo de données) | ✅ Oui (cloud, multi-utilisateur) |
| Sauvegarde | ❌ Aucune | ✅ Native (Postgres managé) |
| Maturité | Très abouti sur inscriptions/présences/paiements simples | Très abouti + va plus loin (factures, planning, IA, WhatsApp) |
| Déploiement | Fichier local, ouvert manuellement | CI/CD auto sur Vercel, en production |

**Verdict :** RTK doit devenir la source de vérité unique. Fiche Inscription doit être démantelé après migration de ses données et récupération de son UX la plus aboutie (l'appel de présence notamment).

---

## 2. Duplication fonctionnelle réelle

| Fonction métier | Fiche Inscription | RTK | Verdict |
|---|---|---|---|
| Inscription famille/enfant | ✅ CRUD complet, localStorage | ✅ CRUD complet, Postgres + RLS (`families`, `students`) | **Doublon direct** |
| Tarification dégressive (1=40€, 2=35€, 3=30€, 4=26€) | ✅ `getMensualiteEffective()` | ✅ table `pricing_rules` | **Doublon direct** |
| Tarif spécial par famille | ✅ `insc.tarifSpecial` | ✅ `families.custom_monthly_rate` | **Doublon direct** |
| Tarif par lieu/site | ✅ `tk_tarifs_lieux` | ✅ `pricing_rules.site_id` | **Doublon direct** |
| Paiements/factures | ✅ `tk_paiements`, cockpit, "marquer payé" | ✅ `invoices` + `payments`, génération auto, PDF print, relance WhatsApp | RTK **plus avancé** |
| Présences / appel du jour | ✅ Système très abouti, validé en production | ✅ Module `/presences` fonctionnel depuis Session 14 (table `attendance`, flux enrollments → sessions → attendance) | **À comparer en détail** (voir §4) — Fiche Inscription a une UX d'appel groupé lieu→créneau→niveau plus poussée à date de l'audit |
| Inscription publique (parents) | ⚠️ `formulaire_en_ligne.html`, écrit en localStorage local au parent — ne remonte jamais au dashboard si rempli hors du PC de l'école | ✅ `/inscription`, token signé, écrit directement en Postgres | RTK **bien supérieur, seul système réellement fonctionnel** |
| Planning / emploi du temps | ❌ Absent | ✅ CRUD complet avec capacité par groupe | RTK seul |
| Résumés IA / Padlet / WhatsApp | ❌ Absent | ✅ Cœur métier d'origine, complet | RTK seul |

**Conséquence opérationnelle :** une famille créée dans le dashboard local et une autre créée via RTK = deux bases d'élèves divergentes, deux historiques de paiement, aucune source de vérité.

---

## 3. Risques identifiés (par gravité, état au 2026-07-01)

### 🔴 CRITIQUE
1. **Mot de passe dashboard Fiche Inscription = `12345678` en clair dans le code source** (`dashboard.html` ~ligne 2216, ~10757), comparaison plaintext, aucun hash. Données d'enfants mineurs (état civil, contacts d'urgence, allergies, photos) — sensible RGPD.
2. **Aucune sauvegarde des données Fiche Inscription.** Tout repose sur le `localStorage` d'un seul navigateur. Cache vidé, changement de PC = perte totale et irréversible.

### 🟡 À VÉRIFIER (et non plus "critique confirmé")
3. ~~`SUPABASE_SERVICE_ROLE_KEY` exposée dans l'historique git~~ — **Correction du 2026-07-01** : `MASTER_PROJECT.md` §27 (Session 14) indique que la clé a été migrée vers le nouveau format `sb_secret_...` et que le code (`env.ts`) a été mis à jour pour l'accepter. Mais §16 a toujours une checkbox non cochée pour cette régénération — incohérence documentaire. **Action : vérifier directement dans Supabase Dashboard → Settings → API la date de création de la clé active avant de considérer ce point comme clos ou comme encore ouvert.** Ne pas refaire l'action sans confirmation.

### 🟠 ÉLEVÉ
4. **Le formulaire d'inscription public Fiche Inscription ne remonte pas réellement au dashboard.** `formulaire_en_ligne.html` écrit dans le `localStorage` du navigateur qui l'ouvre. Si un parent le remplit depuis son téléphone, les données restent chez lui. Confirmé par le `CLAUDE.md` du projet Fiche Inscription, qui liste ce point comme non résolu (priorité basse, point 9). **En pratique inutilisable dans son usage prévu.**
5. **Modèle RLS de RTK mono-utilisateur** (`user_id = auth.uid()`) : bloquant si embauche d'un(e) collègue avec accès différencié (déjà noté comme manque dans `PROJECT_STATUS.md` de RTK).

### 🟢 MOYEN
6. XSS sur Fiche Inscription : 105 usages d'`innerHTML`, `escapeHtml()` correctement utilisé sur les échantillons examinés, mais surface non auditée à 100% sur 11 957 lignes.
7. Aucun test automatisé côté Fiche Inscription (RTK a Vitest + Playwright configurés, niveau d'usage réel non vérifié).
8. Pas de `.git` côté Fiche Inscription — aucun historique de version possible, aucun rollback en cas d'erreur d'édition du fichier monolithique.

---

## 4. Ce qu'il faut comparer en détail avant de trancher sur les Présences

Constat à affiner (ne pas trancher sans relecture du code RTK `/presences` à jour) :
- Fiche Inscription : `_renderAppelJour`/`_renderAppelMois`, groupé lieu→créneau→niveau, compteurs temps réel, validé en production sur des cas réels (256 élèves, 4 groupes testés).
- RTK : flux `enrollment → session → attendance` opérationnel depuis Session 14, grille élèves avec cycle présent/absent/retard/excusé, notifications WhatsApp post-sauvegarde.

RTK a un statut de présence plus riche (4 états vs 2) et l'intégration WhatsApp que Fiche Inscription n'a pas. Mais l'ergonomie d'appel groupé (vue "tous les groupes du jour d'un coup") de Fiche Inscription n'a pas d'équivalent confirmé côté RTK à ce stade. **Ne pas migrer ce module sans une comparaison fonctionnelle module par module, écran par écran — voir méthodologie ci-dessous.**

---

## 5. Ce qu'il faut récupérer de Fiche Inscription avant de l'abandonner

- L'UX de l'appel de présence groupé (si confirmée supérieure après comparaison du §4).
- La logique de tarification proratisée pour les reçus PDF (départ en cours de mois) — à vérifier si `generate-monthly` de RTK la couvre déjà.
- Le PDF de fiche d'inscription papier (`generate_fiche.py`) — utile en mode autonome pour salon/visite, pas besoin de migration, juste conservation en l'état.
- ✅ **FAIT (2026-07-12)** — L'UX de « Nouvelle inscription » : page unique dynamique (parent saisi
  une fois, enfants ajoutés à la volée, tarif dégressif visible en direct) plutôt que l'assistant
  4-étapes-par-élève que RTK avait initialement. Portée dans `NewRegistrationForm.tsx`, branchée
  sur le vrai `pricing_rules` de RTK (plus riche que le tableau figé du legacy : 5 paliers, 3 modes
  de facturation). Amélioration au passage non présente dans le legacy : mode **Rentrée** qui
  réinscrit un élève déjà connu sans dupliquer son dossier (le legacy recréait une inscription
  complète chaque année ; RTK garde l'élève et ajoute juste une `enrollment`). Détail en session 21
  de `MASTER_PROJECT.md`.
- ✅ **FAIT (2026-07-14)** — L'UX de « Tarification par lieu » (§6/§8 legacy, jamais construite
  ni côté legacy ni côté RTK malgré le calcul déjà présent des deux côtés) : page
  `/settings/tarification`, 2 onglets (Par site / Par famille), édition inline, stats
  familles/enfants/mensuel/annuel/%CA comme le legacy. Au passage, **bug critique corrigé** :
  le formulaire d'inscription (session 21) calculait le dégressif comme un barème progressif
  au lieu du tarif unique par taille de fratrie réellement appliqué par `generate-monthly` —
  voir session 22 de `MASTER_PROJECT.md`.
- ✅ **FAIT (2026-07-14)** — Suite du fix précédent : une 4e implémentation divergente du même
  calcul (`computeMonthlyAmount` dans `queries.ts`, utilisée par Finances/registre
  familles/inscription publique) traitait encore le forfait famille comme un dégressif
  multiplié par le nombre d'enfants. Corrigée par délégation à la source de vérité unique
  `lib/pricing.ts`. Voir session 23 de `MASTER_PROJECT.md`. **Duplication tranchée** : sur
  demande explicite de l'utilisateur, le CRUD tarifs embarqué dans `FinancesContent.tsx` a
  été retiré ; `/settings/tarification` est désormais la seule surface d'édition, Finances
  n'affiche plus qu'une vue lecture seule + un lien vers la page dédiée.

---

## 6. Plan de fusion proposé (squelette — à affiner module par module, pas à exécuter tel quel)

0. Sécurisation : confirmer le statut réel de la clé Supabase (voir §3.3), corriger les checklists obsolètes de `MASTER_PROJECT.md`.
1. Geler la création de nouvelles inscriptions dans Fiche Inscription dès que possible pour limiter la divergence pendant la migration.
2. Export des données localStorage de Fiche Inscription (`tk_dashboard`, `tk_paiements`, `tk_presences`, `tk_tarifs_lieux`), cartographie vers le schéma RTK (`families`, `students`, `enrollments`, `invoices`, `payments`, `attendance`).
3. Script de migration ponctuel (Node + client admin Supabase), test en environnement de test avant prod, dédoublonnage par téléphone/email normalisé.
4. Comparaison fonctionnelle détaillée du module Présences (§4) avant de décider quoi porter.
5. Bascule de l'usage quotidien sur RTK, archivage de `dashboard.html`, retrait de `formulaire_en_ligne.html` au profit de `/inscription`.

**Aucune de ces étapes ne doit démarrer sans validation explicite préalable, module par module — voir méthodologie ci-dessous.**

---

## 7. Risques de la fusion elle-même

- Perte/désynchronisation de paiements en cours si bascule en milieu de mois sans gel préalable.
- Doublons de familles si la déduplication email/téléphone échoue (formats différents : `06 12 34 56 78` vs `0612345678`).
- Tarifs spéciaux mal réconciliés si une famille a un `tarifSpecial` différent des deux côtés — revue manuelle nécessaire, pas d'automatisation aveugle (impact financier direct sur les familles).

---

## 8. Découpage modulaire de la migration (2026-07-01)

Le monolithe Fiche Inscription ne se migre pas en un bloc. Découpage en modules **indépendants** (un fichier de script par module, idempotent, dry-run obligatoire, erreur sur un enregistrement = log + skip, jamais d'avortement du batch entier ; erreur sur un module = sans effet sur les autres modules déjà passés). Convention de fichiers alignée sur l'existant RTK (`scripts/create-user.mjs`, `scripts/reset-password.mjs`) :

```
scripts/migration/
├── 00-referentiels.mjs        # Sites + Niveaux + Groupes/Schedules (prérequis)
├── 01-familles-eleves.mjs     # families + students
├── 02-tarification.mjs        # pricing_rules + families.custom_monthly_rate
├── 03-inscriptions-groupes.mjs# enrollments (+ création groups/schedules manquants)
├── 04-finances.mjs            # invoices + payments
├── 05-presences.mjs           # sessions (backfill) + attendance — À PART, après validation dédiée
└── lib/
    ├── legacy-dump.mjs        # lecture du dump JSON localStorage exporté
    ├── id-map.mjs             # table de correspondance ancien id → UUID Postgres (traçabilité)
    └── report.mjs             # génération du rapport dry-run (compte, warnings, conflits)
```

### Ordre de dépendance
`00 → 01 → {02, 03 en parallèle} → 04 → 05` (05 isolé en dernier, jamais lancé sans revue dédiée du §4).

### Module par module

| Module | Contenu | Risque | Dépend de |
|---|---|---|---|
| 00 — Référentiels | Vérifier/créer `sites` (depuis `tk_lieux`/`tk_sites`), confirmer `levels` (déjà alignés, voir tableau ci-dessous) | Faible | — |
| 01 — Familles & Élèves | `insc.parent` → `families`, `insc.enfants[]` → `students` | Faible-Moyen | 00 |
| 02 — Tarification | `tk_tarifs_lieux` → `pricing_rules`, `insc.tarifSpecial` → `families.custom_monthly_rate` | Moyen (décision sur `mensuel_fixe`, voir ci-dessous) | 00, 01 |
| 03 — Inscriptions aux groupes | `enfant.jour/hdebut/hfin/niveau` → `enrollments` (+ matching/création `groups`+`schedules`) | **Élevé** — conflit structurel, voir §4 | 00, 01 |
| 04 — Finances | `tk_paiements[insc][ym]` → `invoices` + `payments` | Moyen | 01 |
| 05 — Présences | `tk_presences` (absences) → `attendance` (+ backfill `sessions`) | **Élevé** — pas de notion de "session" côté Fiche Inscription | 03 |
| Hors migration DB | `generate_fiche.py` (PDF papier), `formulaire_en_ligne.html` (remplacé par `/inscription`) | — | — |

### Tableau de correspondance noms/variables (vérifié sur le code réel des deux projets)

| Fiche Inscription | RTK | Conflit / transformation nécessaire |
|---|---|---|
| `insc.parent.{nom,prenom,tel,email,adresse,ville,cp}` | `families.{parent1_last,parent1_first,parent1_phone,parent1_email,address,city,postal_code}` | Renommage direct, pas de conflit sémantique |
| `insc.lieu` (string libre, ex. "Paris 11") | `families.primary_site_id` / `students.site_id` (FK → `sites`) | **Transformation requise** : lookup par nom, création si absent dans `sites` |
| `enfant.niveau` (string : Preschoolers/Kids/Juniors/Tweens/Teenagers) | `students.level_id` (FK → `levels`) | Pas de conflit de valeurs (labels identiques), juste FK lookup |
| `enfant.jour/hdebut/hfin` (embarqué sur l'enfant) | `schedules.day_of_week/start_time/end_time` (rattaché à un `group`, pas à l'élève) | **Conflit structurel réel** — voir Module 03 ci-dessous |
| `insc.statut` (`actif`/`inactif`, 2 valeurs) | `students.status` (`trial`/`active`/`suspended`/`departed`, 4 valeurs) | `inactif`+`dateDepart` rempli → `departed` + `departure_date` ; `actif` → `active`. Pas de notion "essai" côté legacy (normal, restera vide) |
| `insc.tarifSpecial = {mode:'fixe', montantParEnfant, note}` | `families.custom_monthly_rate` + `custom_rate_note` | `montantParEnfant` confirme un tarif **par enfant** → cohérent avec `custom_monthly_rate` si RTK l'applique aussi par enfant (à confirmer dans le code RTK de calcul de facture avant migration, pas supposé) |
| `tk_tarifs_lieux[lieu].mode` (`seance`/`mensuel_fixe`) | `pricing_rules.billing_type` (`per_session`/`monthly_per_child`/`monthly_family`) | `seance`→`per_session` direct. `mensuel_fixe`→`monthly_per_child` (confirmé par `montantParEnfant`, pas `monthly_family`) |
| `cell.statut` (paiement : `paye`/`partiel`/`retard`/`attente`/`futur`) | `invoices.status` (`draft`/`pending`/`partial`/`paid`/`overdue`/`cancelled`) | `paye`→`paid`, `partiel`→`partial`, `retard`→`overdue`, `attente`→`pending`. **`futur` ne doit PAS être migré** : ce sont des cellules de grille pour des mois pas encore échus, RTK les génère à la demande via `generate-monthly` — migrer ces lignes créerait des factures fantômes |
| `insc.id` (uuid ou timestamp, non garanti UUID Postgres) | `*.id` (UUID Postgres strict) | Génération de nouveaux UUID + table de correspondance `id-map.mjs` pour traçabilité (jamais réutiliser l'ancien id tel quel) |
| `insc.numeroInscription` (ex. "10-00001") | *(aucun champ équivalent trouvé dans le schéma RTK audité)* | **Décision produit à prendre** : porter ce numéro (ajouter une colonne) ou l'abandonner — fonctionnalité legacy, pas un conflit technique |
| Toutes les tables école RTK | `user_id = auth.uid()` (RLS) | Aucun équivalent côté Fiche Inscription (pas d'auth) — tous les enregistrements migrés doivent être assignés explicitement au compte enseignant unique, à ne pas oublier dans chaque script |

### Conflit structurel — Module 03 (Inscriptions aux groupes) — DÉCISION PRISE (2026-07-01)

Fiche Inscription n'a pas de notion de "groupe" — chaque enfant a son propre `jour/hdebut/hfin/niveau/lieu`. RTK organise les cours autour de `groups` (qui ont leurs propres `schedules`).

**Décision utilisateur : création automatique du `group`+`schedule` quand aucun ne correspond exactement (site+niveau+jour+horaire).**

Garde-fou retenu (cohérent avec la règle "dry-run obligatoire" de §8) : le rapport dry-run du module 03 doit lister explicitement chaque groupe auto-créé (site, niveau, jour, horaire, nombre d'enfants concernés) pour une relecture a posteriori avant le run définitif en production — ça ne bloque pas le module, mais ça évite de découvrir des doublons de groupes une fois les données en place.

### Conflit structurel — Module 05 (Présences) — DÉCISION PRISE (2026-07-01)

Fiche Inscription ne stocke aucune entité "séance" — les dates de cours sont calculées à la volée depuis le jour de la semaine de l'enfant. RTK exige une ligne `sessions` réelle par groupe par date avant de pouvoir y rattacher une `attendance`.

**Décision utilisateur : pas de backfill. Les présences RTK démarrent à blanc à la date de bascule.** L'historique d'absences reste consultable dans `dashboard.html` archivé (Fiche Inscription n'est pas supprimé, juste passé en lecture seule — voir Phase 4 du plan §6) si besoin de le consulter plus tard.

### Numéro d'inscription séquentiel — DÉCISION PRISE (2026-07-01)

**Décision utilisateur : porter le numéro d'inscription dans RTK**, pas l'abandonner. Implique : ajouter une colonne (`students.registration_number` ou `families.registration_number` — à trancher au moment du Module 01 selon que le numéro est par famille ou par enfant dans l'usage réel actuel, à revérifier dans le code avant d'écrire la migration) + porter la logique de génération séquentielle par site (`genererNumeroInscription(lieu)`, `formatNumeroInsc()` — format `"10-00001"`) vers RTK pour les nouvelles inscriptions créées après la bascule.

---

## 9. Suggestions complémentaires (proposées le 2026-07-01, non validées — à trancher au réveil)

Ces points ne sont pas demandés explicitement mais relèvent du même niveau d'exigence que le reste de l'audit — à arbitrer avant ou pendant l'exécution des modules, pas après.

1. **Total de contrôle financier avant/après migration (technique d'audit classique).** Avant de toucher au Module 04, calculer un seul nombre : la somme de tous les montants `paye`+`partiel` de `tk_paiements` sur l'année en cours. Après migration, recalculer la même somme côté `invoices`/`payments` RTK. Si les deux ne tombent pas exactement au centime près, on a une erreur de migration — inutile d'inspecter ligne par ligne pour la détecter. Coût quasi nul, détecte toute une classe de bugs d'un coup.

2. **Critères de succès écrits avant de lancer un seul module.** Par exemple : "0 famille en double", "100% des familles actives présentes avec le bon statut de paiement du mois en cours", "total recouvré = total recouvré legacy au centime près". Sans ça, "la migration s'est bien passée" reste une impression, pas un fait vérifié.

3. **Bascule en parallèle plutôt qu'en coupure nette.** Plutôt que d'arrêter Fiche Inscription le jour J, faire tourner les deux systèmes en parallèle 1 à 2 semaines (RTK en lecture/écriture principale, Fiche Inscription gelé en lecture seule comme filet de sécurité), avec un critère de rollback explicite défini à l'avance (ex. "si une famille active manque dans RTK après 48h, on bascule en arrière"). Réduit le risque qu'un bug RTK du premier jour bloque toute la gestion de l'école.

4. **Vérifier le plan de sauvegarde Supabase réel.** Le projet RTK répare le problème "pas de backup" de Fiche Inscription, mais seulement si le plan Supabase utilisé inclut un vrai point-in-time recovery (généralement plan payant). À vérifier — sinon la fusion résout un risque de perte de données pour en garder un autre, moins visible.

5. **Rapport de réconciliation automatique après chaque module**, pas seulement un dry-run avant écriture : un script qui compare comptages et sommes entre le dump JSON legacy et les données réellement écrites dans Postgres, et sort un diff. Transforme "j'espère que ça s'est bien passé" en "voici la preuve que ça s'est bien passé".

6. **Anticiper le modèle multi-utilisateur maintenant, pas plus tard.** Le RLS actuel de RTK est mono-utilisateur (`user_id = auth.uid()`). Comme la fusion touche déjà `families`/`students`/`invoices`, c'est le moment le moins cher pour introduire un modèle de rôles (admin/staff) si l'embauche d'un(e) assistant(e) est envisageable à moyen terme — le refaire après coup sur des tables déjà pleines de données coûtera nettement plus cher.

7. **Avant d'investir dans la logique de génération du numéro d'inscription séquentiel (décision déjà prise : on le porte) : confirmer qu'il est réellement utilisé dans un usage concret** (document officiel, demande de subvention CAF, communication imprimée aux familles) plutôt que juste affiché dans l'interface. Si oui, le porter pleinement se justifie. Si c'est purement cosmétique, un format plus simple suffirait — à vérifier en 2 minutes avant d'écrire la logique, pas après.

---

## 10. Méthodologie imposée pour ce projet de fusion

Consigne explicite (2026-07-01) : **chaque module concerné par la fusion sera audité, comparé, structuré et réfléchi avant toute écriture de code.** Pas d'implémentation immédiate après une simple lecture rapide. Concrètement, pour chaque module (Inscriptions, Tarification, Finances/Paiements, Présences, Inscription publique) :

1. Relire le code réel des deux côtés (pas seulement la documentation, qui peut être obsolète — cf. §3.3).
2. Comparer fonctionnalité par fonctionnalité, en notant ce qui est supérieur de chaque côté.
3. Proposer une solution réfléchie (pas la première solution venue) qui ne perd aucune fonctionnalité utile.
4. Valider explicitement avec l'utilisateur avant toute implémentation.
5. Mettre à jour ce document et `MASTER_PROJECT.md` à chaque étape franchie.

---

## 11. Journal d'exécution

### 2026-07-01 — Outil d'export legacy + Module 00 (Référentiels)

**Décisions confirmées à l'exécution :**
- Code de site legacy (préfixe N° d'inscription) → **colonne `sites.registration_prefix`** (migration `015`), cohérent avec la décision §8 de porter le numéro d'inscription.
- Ordre imposé par l'audit §6 étape 2 respecté : **export des données AVANT toute migration**.

**Livrés :**
- `Fiche Inscription/dashboard.html` — bouton flottant **« ⬇ Export migration »** (bloc `<script>` autonome, retirable, sans dépendance). Exporte tout le `localStorage` `tk_*` en un JSON daté avec compteurs. Backup `dashboard.backup-<date>.html` créé avant édition (pas de `.git` côté legacy).
- `supabase/migrations/015_registration_prefix.sql` — colonne + index unique partiel.
- `scripts/migration/` — arborescence conforme au §8 :
  - `lib/env.mjs` (client admin), `lib/legacy-dump.mjs`, `lib/normalize.mjs`, `lib/id-map.mjs`, `lib/report.mjs`
  - `00-referentiels.mjs` — sites (match/création + préfixe), niveaux (correspondance), années (warnings). Dry-run par défaut, `--commit` pour écrire.
  - `README.md` — mode d'emploi complet.

**Vérifications faites :**
- Contrôle syntaxique (`node --check`) OK sur les 6 fichiers.
- Test hors-DB de la dérivation des sites sur échantillon : fusion des variantes (`Champigny`/`champigny `), résolution des codes, exclusion des lieux génériques non utilisés, années legacy signalées — tous conformes.

**Vérifications restantes (nécessitent l'export réel + credentials Supabase) :**
- Confirmer le statut réel de `SUPABASE_SERVICE_ROLE_KEY` (voir §3.3) avant tout `--commit`.
- Appliquer la migration `015` en base avant `--commit` du Module 00.
- Lancer le dry-run sur le dump réel et relire la liste des sites créés.

**Note doc :** `MASTER_PROJECT.md` §14 cite `scripts/create-user.mjs` et `reset-password.mjs` qui **n'existent pas** (seul `audit-env.mjs` est présent). Style des scripts de migration aligné sur `audit-env.mjs`.

**Prochaine étape :** Module 01 (`01-familles-eleves.mjs`) — après export réel et dry-run validé du Module 00. Méthodologie §10 : relire le code réel des deux côtés avant d'écrire.

### 2026-07-02 — Extraction des données réelles + réconciliation des sites

**Extraction autonome (sans clic utilisateur) :** le `localStorage` de Fiche Inscription a été lu directement depuis la base LevelDB de Chrome (profil Default) via `classic-level`, décodage du format DOM-storage (marqueur + Latin1/UTF-16). **0 erreur de parsing.** Dump réel : `scripts/migration/dumps/export-extrait-leveldb.json` (git-ignoré).
- **170 inscriptions · 248 enfants · 166 familles avec paiements · 5 codes de site · 12 lieux.** Toutes les inscriptions en année **2025-2026** (= seed RTK).

**Réalité des lieux (5 codes legacy) :** Maison Alfort (20, 60 insc.), Champigny sur Marne Taxi Phone (10, 56), Maison Pour Tous Bois l'Abbé (11, 52), C'est mon mien Maison Alfort (21, 1), C'est mon mien (31, 1).

**Piège évité par le dry-run :** la table `sites` RTK contenait déjà des doublons créés à la main (Champigny, Champigny Taxi Phone, Taxi Phone, Site A) + les 3 sites réels. Un matching exact aurait créé un 8ᵉ doublon pour « Champigny sur Marne Taxi Phone ».

**Décisions utilisateur (2026-07-02) → `scripts/migration/site-aliases.json` :**
- « Champigny sur Marne Taxi Phone » → site existant **Champigny Taxi Phone**.
- « C'est mon mien » et « C'est mon mien Maison Alfort » = **même chose que Maison-Alfort** → consolidés sur **Maison-Alfort**.
- Résultat dry-run : **0 création, 0 conflit.** Maison-Alfort ← 62 insc. (préfixe 20), Champigny Taxi Phone ← 56 (préfixe 10), Maison Pour Tous Bois l'Abbé ← 52 (préfixe 11).

**Nettoyage (usage vérifié en lecture seule) :** « Site A » (0 usage) et « C'est mon mien » (0 usage) **supprimés**. Restent 5 sites.

**⚠️ À trancher pour le Module 03 (pas bloquant pour le 00) :** deux sites RTK pré-existants contiennent des données et font doublon avec les canoniques :
- **Champigny** : 1 famille, 1 élève, **5 groupes** — vs « Champigny Taxi Phone » (1 groupe).
- **Taxi Phone** : 1 famille, 1 élève, 1 créneau.
Décider si ces données RTK sont réelles (à consolider vers les sites canoniques) ou des tests (à réassigner/supprimer) avant de créer les enrollments du Module 03.

**Reste pour clore le Module 00 :** appliquer la migration `015` (colonne `registration_prefix`) via le Dashboard Supabase (pas d'accès DDL/CLI lié depuis le repo), puis `node scripts/migration/00-referentiels.mjs --dump=... --commit` pour poser les préfixes (Maison-Alfort→20, Champigny Taxi Phone→10, Bois l'Abbé→11) et sauvegarder l'id-map.

### 2026-07-02 (suite) — 🚨 DÉCOUVERTE MAJEURE : les données legacy de ce PC sont des données de TEST

Un audit qualité systématique du dump (`scripts/migration/audit-dump.mjs` : doublons, contacts, DDN, total de contrôle financier §9.1) a révélé que **la totalité des 170 inscriptions extraites de Chrome sur ce PC sont des données de démonstration** :

- `source: "test"` explicite sur **168/170** fiches (les 2 `online` sont aussi des essais manuels).
- Emails uniformes `prenom.nom@email.fr` (domaine fictif).
- 10 numéros de téléphone à motifs séquentiels (`0612345678`, `0623456789`, …) partagés par ~170 familles aux noms tous différents.
- Vérifié : aucune donnée `tk_dashboard` dans les 10 profils Chrome, ni Edge, ni Firefox de ce PC. Aucun générateur de démo dans `dashboard.html` (données saisies/importées comme jeu d'essai).

**Conséquences :**
1. **Ne JAMAIS migrer ce dump vers la base RTK de production** — il ne contient aucune vraie famille. Le total de contrôle financier (52 400 €, 947 cellules) est fictif.
2. Le pipeline de migration reste valable et testé — il tournera tel quel sur le **vrai** dump quand il sera obtenu.
3. Le bouton « ⬇ Export migration » ajouté à `dashboard.html` devient le chemin critique : si les vraies données existent, elles sont sur **une autre machine** (PC de l'école / de Teacher Khati) — y ouvrir `dashboard.html`, exporter, rapatrier le JSON.
4. **Question produit ouverte (à trancher par l'utilisateur) :** les vraies inscriptions existent-elles sur une autre machine, ou l'usage réel n'a-t-il pas encore commencé ? Si tout est test, il n'y a **rien à migrer** — la fusion se réduit à : préparer RTK pour la rentrée 2026-2027 et archiver Fiche Inscription. (Indice concordant : `tk_annees` du dump a `2026-2027` comme année active — configuration tournée vers la rentrée.)
5. Le `--commit` du Module 00 (préfixes de sites) est suspendu tant que ce point n'est pas tranché — les codes de site (10/20/11/21/31) viennent de `tk_sites` de ce PC et pourraient refléter une vraie configuration voulue, mais à confirmer sur le vrai poste.

### 2026-07-02 (résolution) — ✅ CONFIRMÉ PAR L'UTILISATEUR : toutes les données sont fictives, PIVOT DU CHANTIER

L'utilisateur confirme : **il n'existe aucune vraie famille, nulle part**. Toutes les inscriptions de Fiche Inscription sont des tests. Vérifié aussi côté RTK : les 3 élèves en base (« Sarah Said » ×2, « Souhaib SaidAbdoul », créés 15-17/06/2026) + 11 factures + 9 paiements + 2 présences sont les essais du développeur.

**Décision de périmètre (pivot) :**
- **Modules 01 à 05 (migration de données) : SANS OBJET.** Il n'y a rien à migrer. Les scripts restent dans le dépôt comme outillage (l'audit-qualité `audit-dump.mjs` et les libs resserviront), mais aucun `--commit` de données ne sera jamais lancé sur ce jeu fictif.
- **La « fusion » devient un chantier de fonctionnalités + préparation de rentrée :**
  1. **Porter les fonctionnalités supérieures du legacy dans RTK** (cœur restant de l'audit, §5) : numéro d'inscription séquentiel par site (migration 015 déjà écrite, logique de génération à implémenter dans RTK), UX de l'appel du jour groupé lieu→créneau→niveau (comparaison §4 à faire), tarification proratisée des reçus (à vérifier dans `generate-monthly`).
  2. **Préparer la rentrée 2026-2027 dans RTK** : créer l'année scolaire (le legacy avait déjà `2026-2027` active — intention claire), groupes/créneaux, lien public `/inscription` + QR code pour que les familles s'inscrivent directement dans RTK à la rentrée. Les inscriptions réelles naîtront directement dans RTK — **aucune migration ne sera jamais nécessaire.**
  3. **Purge des données de test RTK avant la rentrée** (familles/élèves/factures/paiements/présences d'essai) — à faire au dernier moment pour pouvoir continuer à tester d'ici là.
  4. **Archiver Fiche Inscription** : plus aucune saisie réelle ne doit y être faite (il n'y en a jamais eu). `dashboard.html` conservé en l'état comme référence UX.

**Bénéfice :** tous les risques de migration identifiés en §7 (perte de paiements, doublons de familles, tarifs mal réconciliés) disparaissent — ils n'ont plus d'objet.

### 2026-07-02 (suite) — ✅ Migration 015 appliquée + N° d'inscription implémenté dans RTK

- **Migration 015 appliquée** par l'utilisateur (SQL Editor). Préfixes posés : Champigny Taxi Phone→10, Maison Pour Tous Bois l'Abbé→11, Maison-Alfort→20. **Module 00 clos** (forme post-pivot : schéma + configuration, pas de données).
- **Fonctionnalité N° d'inscription portée dans RTK** (chantier 1 du nouveau périmètre) :
  - `supabase/migrations/016_family_registration_number.sql` — colonne `families.registration_number` + index unique + **trigger Postgres** `assign_family_registration_number()` : génération atomique `<préfixe><séquentiel 5 chiffres>` à l'INSERT, verrou consultatif par préfixe (anti-collision), repli 99 sans préfixe (convention legacy), `SECURITY DEFINER` + `search_path=public` (la RLS de `sites`/`families` ne doit pas fausser la lecture du préfixe ni le calcul du max — même convention que `has_site_access`). Couvre les 2 chemins de création (StudentForm navigateur + `/api/public-registration` admin) sans dupliquer de logique applicative.
  - `src/types/index.ts` — `Family.registration_number`.
  - `src/lib/utils/index.ts` — `formatRegistrationNumber()` ("2000001" → "20-00001").
  - `src/components/eleves/StudentProfile.tsx` — badge doré « N° 20-00001 » dans l'en-tête de la section Famille (équivalent du badge du legacy).
  - `src/app/api/public-registration/route.ts` — N° inclus dans les messages WhatsApp parent et admin.
  - `tsc --noEmit` : 0 erreur.
- **Migration 016 appliquée + trigger testé de bout en bout (2026-07-02)** : séquence par site (2000001 → 2000002), préfixes corrects par site (10/20), repli 99 sans site — 4/4 cas conformes, familles de test supprimées après coup.
- **Déployé en production (2026-07-02)** : PR #2 mergée (`main` @ `0261ffd`), check Vercel `success`, déploiement Production confirmé sur `resume-teacher-khati.vercel.app`. **✅ Fonctionnalité N° d'inscription TERMINÉE de bout en bout (code + base + prod).**
- ⚠️ Note pour l'utilisateur : les familles déjà en base **avant** le trigger n'ont pas de numéro rétroactif (le trigger ne s'active qu'à la création). Sans objet ici puisque ces familles sont des données de test à purger avant la rentrée (voir plus haut) — pas de rattrapage nécessaire.

### 2026-07-02 (suite) — Peuplement de données de test (150 élèves, Mercredi/Samedi)

À la demande de l'utilisateur, génération de données de test pour peupler l'app (voir/tester Planning, Présences, badge N° d'inscription) : `scripts/migration/seed-test-students.mjs` (dry-run par défaut, `--commit` pour écrire, idempotent sur groupes/schedules).

- **Périmètre : les 3 sites canoniques uniquement** (Maison-Alfort, Champigny Taxi Phone, Maison Pour Tous Bois l'Abbé) — les doublons ambigus « Champigny »/« Taxi Phone » volontairement exclus, non touchés.
- **150 familles + 150 élèves + 150 enrollments** créés : 10 par (site × niveau), répartition égale confirmée (30/niveau).
- **9 groupes créés, 6 réutilisés** (Maison-Alfort avait déjà ses 5 groupes ; Champigny Taxi Phone avait déjà son groupe Preschoolers) — aucune donnée existante modifiée ou dupliquée.
- **24 créneaux créés, 6 déjà présents** — tous les groupes ont désormais un cours Mercredi (jour 2) ET Samedi (jour 5), horaires distincts par (site, niveau) pour éviter tout chevauchement.
- **Bug corrigé en cours de route** : premier essai a échoué sur `schedules.user_id NOT NULL` (colonne oubliée dans l'insert) — 20 familles/élèves/enrollments partiels créés avant l'échec, nettoyés proprement via le tag avant de corriger et relancer à blanc.
- **Vérifié après coup** : N° d'inscription auto confirmé en conditions réelles à l'échelle (Maison-Alfort → 2000001, 2000002, 2000003… séquentiel correct).
- **Toutes les données portent le tag `notes = "TEST — génération en masse 2026-07-02"`** — purge en une requête (`.eq('notes', TAG)` sur les 3 tables) au moment de préparer la vraie rentrée 2026-2027.

### 2026-07-02 (suite) — Section « Mode Test » dans l'app + refonte ultra-premium

**V1 livrée puis refondue après retour utilisateur (« pas assez structuré/ludique/premium »).**

- **Backend** : `src/lib/test-data.ts` (générer/statut/purger, tag `TEST_MODE::`, compatible avec le tag CLI pour une purge unique), routes `GET|DELETE /api/test-data` + `POST /api/test-data/generate` (auth admin via `withApiAuth`).
- **Défaut de structure corrigé** : la page V1 rendait un `<Header>` en double (le layout `/settings` en fournit déjà un + la barre d'onglets `SettingsNav`, où « Mode Test » n'apparaissait pas). V2 : plus de header dupliqué, onglet **Mode Test** ajouté à `SettingsNav` (icône FlaskConical) + entrée Sidebar section Système.
- **Refonte V2 au vocabulaire exact du dashboard** (la référence premium du projet) : `FadeIn` staggeré, hero 2 colonnes `rounded-2xl` (pill d'état actif/propre, kicker uppercase, 3 `HeroMetric`, liens « Explorer » vers Élèves/Planning/Présences avec hover lift + flèche), **parcours gamifié en 3 étapes numérotées** (01 Générer avec stepper −/+ et libellé dynamique « Générer N élèves » · 02 Vérifier avec checklist verte · 03 Purger en zone de danger rose isolée), panneaux « Répartition par site / par niveau » avec barres colorées aux couleurs réelles des sites/niveaux + emojis de niveaux, `tabular-nums` partout, dark mode complet.
- **Badge N° d'inscription raffiné** (StudentProfile) : dégradé doré, icône Hash, `tabular-nums`, variante dark.
- **Vérifié dans le navigateur réel** (serveur dev + compte jetable supprimé après coup) : structure single-header confirmée, stepper interactif OK (libellé recalculé en direct), 0 erreur console, répartitions affichées (55/site, 33/niveau avec emojis). `tsc` 0 erreur, build prod OK (`/settings/mode-test` 5.5 kB).
- Note outillage : `preview_screenshot` expire sur ce poste (souci renderer local) — vérifications faites via snapshot d'accessibilité + innerText, fiables.

### 2026-07-02 (suite) — Présences retrouvables + historique élève + refonte Familles & Paiements

**Trois problèmes utilisateur traités en un lot :**

1. **« Où est ma liste de présence sauvegardée ? »** — Cause racine double : (a) le dropdown « Présent » de Familles & Paiements était en réalité le **statut d'inscription** (`active`) mal étiqueté — corrigé en « Actif » + note explicative pointant vers /presences ; (b) aucun écran ne listait les appels enregistrés. **Ajouté** : panneau « Appels enregistrés » sur `/presences` (14 derniers jours, compteurs présents/absents, clic = rouvre l'appel), branché sur la route existante `GET /api/attendance/sessions`, rafraîchi après chaque sauvegarde.

2. **Historique de présence annuel par élève** — Nouvelle section « Présences » sur le profil élève (`StudentProfile` + fetch dans `eleves/[id]/page.tsx`) : 4 compteurs annuels (Présent/Retard/Excusé/Absent), **taux d'assiduité** adaptatif (vert ≥90 %, ambre ≥75 %, rouge sinon), barre de progression, historique détaillé scrollable (date, groupe, statut, note), état vide avec lien vers l'appel.

3. **Familles & Paiements débordait de l'écran** (tableau `min-w-[1900px]`, 12 colonnes mois) — **Refonte complète** au vocabulaire dashboard : hero + 4 HeroMetrics (dont « En retard » en alerte rouge), **mini-heatmap annuelle de 12 pastilles par famille** (initiale du mois, couleur statut, tooltip montant, mois courant cerclé), ligne compacte cliquable → **détail déplié** (enfants+statuts, grille 12 mois avec montants, actions Tarif/Dossier/Archiver), légende couleur, barre d'outils sticky conservée (recherche, site, période, actions collectives).

**Vérifié en navigateur réel (compte jetable, supprimé après)** : cycle complet appel → sauvegarde → panneau « Appels enregistrés » (« Juniors · Maison-Alfort — 10 présents · 1 absent ») → profil de l'élève absente (« 0 % d'assiduité · Absent 1 · 0/1 cours suivis ») ✅. Débordement : scrollWidth 1360 ≤ viewport 1366, et 375px mobile sans scroll horizontal ✅. Seules erreurs console : warnings dnd-kit préexistants du dashboard (hors périmètre). `tsc` 0 erreur, build prod OK.

**🚀 Déployé en production (2026-07-02)** : PR #3 mergée (`main` @ `d9596e5`), check Vercel `success`. Le lot inclut aussi la section Mode Test (qui n'avait pas encore été déployée). `.claude/` ajouté au `.gitignore` (config locale). Réponse à la question « où retrouver un appel dans 12 mois » : table `attendance` (permanente) ; consultation via (1) fiche élève → section Présences (historique complet sans limite), (2) /presences → panneau Appels enregistrés (14 jours), (3) /presences → groupe + date passée quelconque.

### 2026-07-02 (suite) — Fiche de présence par période (équivalent du sélecteur T1/T2/T3 du legacy)

Fonctionnalité portée depuis Fiche Inscription (« Sélecteur de période : T1 · T2 · T3 · Personnalisée · Année complète ») en version RTK :

- **Nouvel onglet « Fiche de présence »** sur `/presences` (`PresencesTabs` : Faire l'appel | Fiche de présence).
- **Présets** : Ce mois · Trimestre 1 (sept-déc) · T2 (janv-mars) · T3 (avril-juin) · Année scolaire (sept→août) · Personnalisée (dates libres). Filtres site + groupe + recherche élève.
- **Synthèse de période** : 5 tuiles (élèves suivis/présents/retards/excusés/absents) + assiduité globale adaptative.
- **Registre par élève** : 4 compteurs en pastilles, barre + taux d'assiduité, ligne dépliable montrant **chaque séance datée** avec statut et note.
- **Export CSV** (`fiche-presence-<du>_<au>.csv`, BOM UTF-8, `;`).
- **API `GET /api/attendance/report`** — agrégation par élève sur plage de dates. **Bug RLS attrapé en vérification** : le client utilisateur vidait le join `sessions!inner` (RLS `has_site_access` sur sessions/groups/sites — piège documenté MASTER §27) → passage au client admin avec filtre `user_id` explicite sur `attendance`.
- **Vérifié en navigateur réel** (2 séances semées à des dates différentes) : Ce mois = 11 appels, T3 = 11, Année = 22 cumulés — agrégats exacts ; détail déplié date par date OK. `tsc` 0 erreur, build OK.
- **🚀 Déployé** : PR #4 mergée (`main` @ `0f24a9d`), Vercel `success`.

**Reste connu côté présences (grandes écoles)** : impression PDF officielle de la fiche (le CSV existe ; modèle A4 façon factures à faire), et l'appel du jour groupé multi-groupes du legacy (§4) toujours à comparer/porter.

### 2026-07-03 — PDF de la fiche + Appel du jour groupé (portage complet du §4 de l'audit)

Les deux items restants de la session précédente, traités dans l'ordre demandé.

**1. PDF imprimable de la fiche de présence**
- `src/lib/attendance-report.ts` — agrégation extraite de la route API en lib partagée (évite la duplication entre l'API JSON et la page d'impression).
- `src/app/(app)/presences/rapport/print/page.tsx` + `PrintAttendanceClient.tsx` — même pattern que `/finances/invoice/[id]/print` (page A4, `@media print`, toolbar `no-print`, `window.print()`, `window.close()`) : en-tête Teacher Khati, 6 tuiles de synthèse, tableau nominatif (présent/retard/excusé/absent/total/assiduité), ligne de signature.
- Bouton « Imprimer / PDF » dans l'onglet Fiche de présence, ouvre `/presences/rapport/print?from=&to=&siteId=&groupId=` dans un nouvel onglet (mêmes filtres que la vue).
- **Vérifié en navigateur réel** : PDF généré sur l'année scolaire complète, données identiques à la vue (11 élèves, 10 présents, 1 absent) ✅.

**2. Appel du jour groupé** (le morceau UX du legacy resté non tranché depuis §4)
- **API `POST /api/attendance/day`** : reçoit une date, calcule le jour de semaine, récupère **tous les créneaux actifs de ce jour** (`schedules.day_of_week`), déduplique par groupe, trouve/crée les sessions du jour, charge les élèves inscrits + présences déjà marquées. Un seul appel réseau pour toute la journée.
- **`DailyCall.tsx`** : navigation jour précédent/suivant + sélecteur de date, compteurs globaux (attendus/présents/absents), **groupé par site** puis par créneau (reproduit l'UX legacy lieu→créneau→niveau), carte par groupe avec « Tous présents » et grille d'élèves cliquables (cycle présent→absent→retard→excusé), **un seul bouton « Enregistrer l'appel du jour »** qui sauvegarde tous les groupes modifiés en parallèle (`Promise.all`), état « Enregistré ✓ » par groupe.
- **Nouvel onglet par défaut** sur `/presences` : Appel du jour (nouveau, actif par défaut) · Par groupe (l'ancien `AttendanceClient`, renommé) · Fiche de présence.
- **Vérifié en navigateur réel** : mercredi 1er juillet → 16 groupes groupés par site, 165 élèves attendus. « Tous présents » sur un groupe de 11 → `11/0/11`. 1 élève basculé absent → `10/1/11`, sauvegarde, **persistance confirmée après rechargement complet de la page**. PDF généré ensuite sur cette même donnée : cohérent.
- `tsc` 0 erreur, build prod OK (`/presences` 11.7 kB, `/presences/rapport/print` 2.33 kB).

**Le §4 de l'audit est maintenant clos** : l'appel du jour groupé de Fiche Inscription est porté dans RTK, avec en plus 4 états (vs 2), notification WhatsApp, historique par élève et fiche de présence par période — supérieur au legacy sur tous les axes identifiés dans la comparaison initiale.

**🚀 Déployé en production (2026-07-03)** : PR #5 mergée (`main` @ `ca5b0f5`), Vercel `success`. Module Présences maintenant complet : Appel du jour groupé (par défaut) · Par groupe · Fiche de présence (période + export CSV + PDF A4).

### 2026-07-03 (suite) — Refonte Fiche de présence (écran) + PDF en vrai registre officiel

Retour utilisateur : l'appel par groupe est jugé très réussi, mais la fiche de présence manquait de structure et le PDF n'était « pas satisfaisant visuellement ». Refonte des deux :

**Écran (`AttendanceRegister.tsx`)** — passage d'une liste plate de tous les élèves mélangés à une **structure hiérarchique site → groupe → élèves** (même vocabulaire que `DailyCall`) :
- Bandeau de groupe avec barre latérale colorée (couleur du niveau), sous-total du groupe (4 compteurs + taux), repliable/dépliable.
- **Tri A→Z ou par assiduité croissante** (nouveau) — repère en un coup d'œil les élèves à surveiller.

**PDF (`PrintAttendanceClient.tsx`) — reconstruction complète en registre officiel** :
- Masthead premium : logo indigo, nom en police manuscrite (cohérent avec l'identité de marque déjà utilisée ailleurs dans l'app), référence de document lisible (`RP-<du>-<au>`), date/heure d'édition, bandeau période + périmètre.
- Ruban de synthèse à 6 cellules avec assiduité globale mise en valeur.
- **Légende P/R/E/A** explicite (convention de registre scolaire classique).
- **Sections par site → groupe**, chaque groupe = un `<table>` avec son propre `<thead>` (répétition native du navigateur à chaque saut de page), bandeau de groupe coloré, **ligne de sous-total** par groupe.
- **Saut de page entre sites** (`break-before: page`) si plusieurs sites dans le périmètre, bande « Total général » si plusieurs sections.
- Bloc signatures à deux colonnes (Enseignant / Direction + emplacement Cachet), pied de page répété sur chaque page imprimée (`position: fixed`, visible par page en impression Chromium).
- Bug attrapé en vérification : référence de document tronquée de façon illisible (`.slice(0,24)` coupait la date de fin) — corrigé.

**Vérifié en navigateur réel** (2 comptes jetables successifs, données ré-ensemencées à chaque fois car `attendance` cascade à la suppression de l'utilisateur) :
- Regroupement écran confirmé : bandeau "MAISON-ALFORT" → groupe "Juniors" → sous-total exact (26P/1R/0E/6A = 82%).
- Tri par assiduité confirmé : les cas à 0%/33%/67% remontent en tête.
- **PDF multi-sites vérifié avec 2 groupes sur 2 sites différents** : sections "Champigny Taxi Phone" (5 élèves, 80%) et "Maison-Alfort" (11 élèves, 82%) correctement séparées, **Total général exact** (16 élèves, 30P/1R/0E/7A = 82% — les sous-totaux s'additionnent parfaitement).
- Couleurs vérifiées via `preview_inspect` (barre indigo `#4338ca` sous le masthead, bordures de tableau).
- `tsc` 0 erreur, build prod OK (`/presences` 12.8 kB, `/presences/rapport/print` 4.07 kB).

**🚀 Déployé en production (2026-07-03)** : PR #7 mergée (`main` @ `e2a233a`), Vercel `success`.

### 2026-07-03 (suite) — Fix critiques : sidebar imprimée, A4 Paysage, une page par groupe

Retour utilisateur après vérification personnelle du PDF : (1) le Dashboard (sidebar/nav) s'imprimait aussi alors qu'il ne voulait que la fiche, (2) chaque groupe doit avoir sa propre page, (3) format A4 Paysage souhaité pour tout voir. Note séparée conservée en mémoire (pas encore construite) : espace Paramètres pour uploader signature + logo, à apposer automatiquement sur les documents.

**Cause racine du bug sidebar (confirmée par lecture du code) :** `src/app/(app)/layout.tsx` enveloppe **toutes** les routes du groupe `(app)` — y compris nos pages d'impression — avec `AppShell` (Sidebar + Header). La `Sidebar` n'avait aucune règle `@media print` pour se masquer. Comme les pages d'impression `/presences/rapport/print` et `/finances/invoice/[id]/print` vivaient toutes les deux sous `(app)/`, ce bug touchait **les deux**, pas seulement les présences (l'utilisateur n'avait juste pas encore remarqué sur les factures).

**Fix appliqué :**
- **Déplacement des deux pages d'impression hors du groupe `(app)`** (`git mv`, historique préservé) : `(app)/presences/rapport/print` → `presences/rapport/print`, `(app)/finances/invoice/[id]/print` → `finances/invoice/[id]/print`. Les groupes de route entre parenthèses sont invisibles dans l'URL — **aucun lien cassé**, mêmes URLs exactes. Ces pages n'héritent plus que du layout racine (aucune Sidebar, aucun Header) : c'est l'architecture correcte pour des pages conçues pour être imprimées.
- **PDF présence en A4 Paysage** : `@page { size: A4 landscape }`, largeur du document 297mm.
- **Une page par groupe** : remplacement de la logique « saut de page entre sites » par un compteur global à travers tous les groupes — chaque groupe démarre sur une nouvelle page (sauf le tout premier), quel que soit le site.
- Bug additionnel corrigé au passage : référence de document tronquée de façon illisible (héritage du fix précédent, `.slice(0,24)` coupait la date de fin — déjà signalé mais recorrigé proprement ici).

**Vérifié en navigateur réel** (piège méthodologique rencontré et documenté : une première lecture différée après navigation faisait croire à un bug de sidebar fantôme — en réalité un artefact de mon enchaînement de tests same-tab, pas un vrai bug ; revérifié avec lecture immédiate + relecture à +4s, stable, confirmé absent) :
- `/presences/rapport/print` : aucune trace de Sidebar, ni immédiatement ni après 4s.
- `/finances/invoice/[id]/print` (facture existante réelle) : aucune trace de Sidebar non plus — confirme que le fix couvre bien les deux documents.
- Dimensions du document : `1122×793px` = exactement `297×210mm` (paysage) ✅.
- Sauts de page par groupe : groupe 1 (Kids, 5 élèves) sans saut, groupe 2 (Juniors, 11 élèves) avec `group-break` ✅ — chacun sur sa propre page.
- `tsc` 0 erreur (après purge du cache `.next` obsolète référençant les anciens chemins), build prod OK (`/presences/rapport/print` 4.1 kB, `/finances/invoice/[id]/print` 2.92 kB).

**🚀 Déployé en production (2026-07-03)** : PR #9 mergée (`main` @ `f5233db`), Vercel `success`.

### 2026-07-04 — Fonctionnalité livrée : logo + signataires configurables (Paramètres > Marque)

Demande mémorisée depuis le 2026-07-03 (voir mémoire persistante `demande-signature-logo-parametres`), conçue puis construite après étude des patterns existants (aucun Storage Supabase préexistant, pattern `whatsapp_settings`/`pinterest_settings` réutilisé pour la RLS, `avatar_url` sur `users` repéré mais non détourné — jamais utilisé nulle part, ajout de colonnes/table dédiées à la place).

**Conception validée avec l'utilisateur avant code** : signataires multiples et configurables (pas juste 1 champ fixe) — le 1ᵉʳ remplit le bloc « Enseignant(e) », le 2ᵉ le bloc « Direction » de la fiche de présence ; logo appliqué partout où pertinent, pas seulement les 2 PDF (Sidebar, page de connexion inclus).

- **Migration 017** : `users.logo_url`, table `signatories` (label libre, signature_url, sort_order, RLS owner), bucket Storage privé `branding` (RLS par dossier `user_id`, URLs signées générées à la demande — jamais de lien public permanent).
- **`src/lib/branding.ts`** : `getLogoUrl`, `getSignatories`, `getLogoUrlForSoleUser` (page de connexion, publique, hypothèse mono-utilisateur cohérente avec le reste du projet).
- **Routes API** : `POST/DELETE /api/branding/logo`, `GET/POST /api/signatories`, `PATCH/DELETE /api/signatories/[id]`.
- **Page `/settings/marque`** (nouvel onglet SettingsNav) : upload logo (aperçu/remplacement/retrait), liste de signataires (ajout/renommage/remplacement de signature/suppression), style premium cohérent avec Mode Test.
- **Branchement** (fallback identique à l'existant si rien n'est uploadé — aucune régression visuelle) : `AppShell`/`Sidebar` (logo), page de connexion (logo, 2 emplacements desktop/mobile), `PrintInvoiceClient` (logo remplace le cercle « K »), `PrintAttendanceClient` (logo masthead + signature/label du 1ᵉʳ signataire sur le bloc Enseignant(e), 2ᵉ sur Direction).

**Vérifié en navigateur réel** (compte jetable, PNG de test 1×1 généré en base64 côté navigateur) : upload logo → `POST /api/branding/logo` 200, URL signée résolue, **visible immédiatement** sur Sidebar (`img[alt="Logo"]` confirmé) et sur une vraie facture existante (cercle « K » disparu). Signataire « Teacher Khati » créé avec signature → label exact **« TEACHER KHATI »** (pas le générique) et image correctement branchée sur le bloc Enseignant(e) de la fiche de présence (props React confirmées : `signatureUrl` = URL signée pointant vers le bon chemin storage), bloc Direction resté vide en fallback (aucun 2ᵉ signataire créé) comme attendu. `tsc` 0 erreur, build prod OK (`/settings/marque` 4.42 kB).

**🚀 Déployé en production (2026-07-04)** : PR #11 mergée (`main` @ `822299e`), Vercel `success`.

### 2026-07-04 (suite) — Bug critique corrigé : limite de taille trop stricte bloquait le vrai fichier

Retour utilisateur : « la signature n'est pas utilisée » après tentative d'upload. Vérification directe en base (`users.logo_url = null`, table `signatories` vide) : **rien n'avait été enregistré côté serveur** — pas un problème d'affichage, l'upload échouait réellement.

**Cause exacte trouvée** : `Signature Teacher Khati.png` fait **2 109 533 octets (2,012 Mo)**, contre une limite `MAX_BRANDING_FILE_SIZE` fixée à **2 097 152 octets (2,000 Mo) pile** — dépassement de seulement **12 381 octets**. Un vrai scan de signature dépasse facilement 2 Mo ; la limite était trop stricte pour un usage réel.

**Fix** : `MAX_BRANDING_FILE_SIZE` porté à 4 Mo (confortable pour un scan réel, reste sous la limite de charge utile des fonctions serverless Vercel ~4,5 Mo). Textes UI et messages d'erreur des 3 routes (`branding/logo`, `signatories`, `signatories/[id]`) mis à jour en cohérence (« 4 Mo maximum »).

**Vérifié en navigateur réel** avec un fichier de test généré à la **taille exacte du vrai fichier bloqué** (2 109 533 octets) : `POST /api/branding/logo → 200 OK` (échouait avant le fix), URL signée résolue, logo affiché. `tsc` 0 erreur, build prod OK.

**🚀 Déployé en production (2026-07-04)** : PR #13 mergée (`main` @ `987c826`), Vercel `success`.

### 2026-07-05 — Bug UX confirmé : ambiguïté « Ajouter » faisait croire l'action faite

Retour utilisateur avec capture d'écran du PDF : signature toujours absente malgré une tentative d'upload « qui semblait avoir marché (pas d'erreur visible) ». Vérification en base : `logo_url` toujours `null`, table `signatories` toujours vide — confirmant qu'aucune donnée n'avait été enregistrée malgré l'impression de succès.

**Cause exacte trouvée dans le code** : `BrandingClient.tsx` avait **deux boutons portant le même mot « Ajouter »** — l'un pour ouvrir le formulaire (ligne 218), l'autre pour réellement soumettre la création (ligne 319). Le bouton de sélection de fichier affichait le nom du fichier une fois choisi (`{newFile ? newFile.name : 'Signature (optionnel)'}`), ce qui ressemble visuellement à une confirmation — l'utilisateur a très probablement rempli le nom, sélectionné le fichier, vu le nom du fichier affiché, et cru l'action terminée sans jamais cliquer sur le vrai bouton d'envoi.

**Fix** :
- Bouton d'ouverture renommé « Nouveau signataire » (au lieu de « Ajouter »).
- Bouton de sélection de fichier reformulé : `"<nom du fichier> — sélectionnée, clique « Enregistrer » ci-dessous pour valider"` — instruction explicite plutôt qu'un état ambigu.
- Bouton de soumission renommé **« Enregistrer ce signataire »** (jamais le mot « Ajouter » utilisé deux fois).
- Champs réorganisés en colonne avec labels explicites (« Nom / rôle », « Signature (image, optionnel) ») au lieu d'une grille compacte.

**Vérifié en navigateur réel — reproduction exacte du bug puis validation du fix** :
1. Ouverture du formulaire, remplissage du nom, sélection du fichier (bon input ciblé après avoir confirmé qu'il y a bien 2 inputs file sur la page — le premier est celui du logo, piège similaire pour qui automatise ce test).
2. **Vérifié en base AVANT de cliquer sur « Enregistrer »** : `signatories` toujours vide — confirme que l'apparence de succès (nom de fichier affiché) ne correspondait à aucune sauvegarde, exactement le bug vécu par l'utilisateur.
3. Clic sur « Enregistrer ce signataire » → toast « Signataire ajouté », bloc « Enseignant(e) » affiche « Teacher Khati ».
4. **Vérifié en base APRÈS clic** : ligne signataire créée avec `signature_url` correct.

`tsc` 0 erreur, build prod OK.

**🚀 Déployé en production (2026-07-05)** : PR #15 mergée (`main` @ `415550a`), Vercel `success`.

### 2026-07-06 — Bug confirmé : signature absente sur les pages de groupe intermédiaires

Demande utilisateur : « regarde bien ce qu'il va et ce qu'il ne vas pas entre le site et la signe [signature] à imprimer la liste de présence ». Vérification en base : `logo_url` et `signatories` toujours vides en production — la signature n'avait donc encore jamais été réellement enregistrée depuis le fix UX de la veille (l'utilisateur n'avait pas encore réessayé).

**Cause exacte trouvée dans le code** : `PrintAttendanceClient.tsx` rendait le bloc de signature (Teacher Khati / Direction) **une seule fois, après la boucle de tous les groupes** — alors que chaque groupe imprime sur sa propre page (`break-before: page`, fix du 2026-07-03). Conséquence : seule la **dernière page** du registre portait une zone de signature ; toutes les pages de groupe précédentes n'en avaient aucune. C'est exactement le décalage entre pagination par site/groupe et signature signalé par l'utilisateur.

**Fix** : le bloc `SignatureBlock` (label + image) est désormais rendu **à l'intérieur de chaque bloc de groupe**, juste après le tableau — chaque page devient une fiche autonome et signable. Le récapitulatif « Total général » (cas multi-sites) reçoit sa propre classe `group-break` pour partir sur sa page finale plutôt que de coller au dernier groupe.

**Vérifié en navigateur réel avec compte de test jetable** (créé et supprimé après coup, données réelles inchangées) :
1. Upload logo + signataire « Teacher Khati » via `/settings/marque` — reconfirme au passage que le fix du bouton « Ajouter » de la veille fonctionne bien de bout en bout (`POST /api/branding/logo → 200`, `POST /api/signatories → 201`).
2. Seed de 2 élèves sur 2 sites différents (Champigny, Maison-Alfort) avec un appel chacun.
3. Impression du registre (période année scolaire) : confirmé en DOM **2 images de signature distinctes** (une par page de groupe) au lieu d'une seule ; `group-break` correctement posé (1er groupe = pas de saut, 2e groupe = saut de page, Total général = saut de page).

`tsc` 0 erreur.

**🚀 Déployé en production (2026-07-06)** : PR #18 mergée (`main` @ `2110c7b`), Vercel `success`.
