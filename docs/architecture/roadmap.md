# Roadmap — Résumé Teacher Khati

> Dernière mise à jour : 2026-06-06

---

## PHASE 0 — Architecture & Documentation ✅ TERMINÉ

**Durée** : 1 jour | **Statut** : ✅ Terminé le 2026-06-06

- [x] Structure des dossiers
- [x] MASTER_PROJECT.md
- [x] README.md
- [x] Schéma base de données (docs/database/schema.sql)
- [x] Architecture des composants (docs/architecture/components.md)
- [x] Workflow Padlet → WhatsApp (docs/workflows/)
- [x] Roadmap (ce fichier)

---

## PHASE 1 — Dashboard + Génération de Résumé 🔄 À DÉMARRER

**Durée estimée** : 3-4 semaines | **Priorité** : 🔴 CRITIQUE

### Semaine 1 — Setup & Infrastructure

| Tâche | Description | Effort |
|-------|-------------|--------|
| Initialiser Next.js 14 | `npx create-next-app` avec App Router + TypeScript + Tailwind | 2h |
| Configurer shadcn/ui | Installation + composants de base | 1h |
| Setup Supabase | Projet + `supabase init` + config env | 2h |
| Migrations Phase 1 | Tables : sites, levels, groups, sessions, resumes | 3h |
| Seed données | Niveaux fixes + 2 sites + 3 groupes de test | 1h |
| Auth Supabase | Login/logout + middleware route protection | 3h |
| Layout de base | AppShell + Sidebar + Header | 4h |

### Semaine 2 — Dashboard & Gestion des Groupes

| Tâche | Description | Effort |
|-------|-------------|--------|
| DashboardPage | Vue multi-sites | 4h |
| SiteCard | Carte site avec métriques | 2h |
| GroupGrid + GroupCard | Grille des groupes filtrée | 4h |
| CRUD Groupes | Créer/modifier/archiver un groupe | 4h |
| Types TypeScript | Types globaux src/types/ | 2h |
| Zustand Store | Stores : auth, ui, groups | 3h |

### Semaine 3 — Génération de Résumé (cœur)

| Tâche | Description | Effort |
|-------|-------------|--------|
| ResumeWizard | Assistant multi-étapes | 4h |
| StepContentInput | Saisie texte libre | 3h |
| Intégration OpenAI | `src/lib/ai/generator.ts` | 4h |
| Prompts par niveau | 5 prompts × 2 (analyse + génération) | 4h |
| TipTap Editor | Éditeur de résumé | 4h |
| ResumeSection | Sections éditables | 3h |
| Sauvegarde résumé | API + Supabase | 2h |

### Semaine 4 — Preview, Polissage & Tests

| Tâche | Description | Effort |
|-------|-------------|--------|
| WhatsAppPreview | Simulation mobile | 3h |
| ResumeVersionHistory | Historique versions | 2h |
| Archives Phase 1 | Navigation basique | 3h |
| Gestion d'erreurs | Toast, ErrorBoundary | 2h |
| Tests unitaires Vitest | Fonctions IA, utils | 4h |
| Tests E2E Playwright | Flux principal | 4h |
| Déploiement Vercel | Setup CI/CD | 2h |

**Livrable Phase 1** : Teacher Khati peut créer un résumé depuis un texte libre et le voir prévisualisé en format WhatsApp.

---

## PHASE 2 — Bibliothèque d'Activités

**Durée estimée** : 2 semaines | **Dépend de** : Phase 1

### Semaine 5

| Tâche | Description | Effort |
|-------|-------------|--------|
| Table `activities` | Migration + seed 50 activités initiales | 3h |
| ActivityLibrary | Composant bibliothèque filtrable | 4h |
| ActivityCard | Carte activité | 2h |
| ActivityFilters | Filtres niveau/compétence/tags | 3h |
| Intégration résumé | Ajouter activité au résumé en cours | 3h |

### Semaine 6

| Tâche | Description | Effort |
|-------|-------------|--------|
| Suggestions IA | IA suggère activités selon le contenu | 4h |
| CRUD Activités | Créer/modifier ses propres activités | 3h |
| Tags système | Système de tags évolutif | 2h |
| Tests | Tests composants activités | 3h |

**Livrable Phase 2** : Teacher Khati peut ajouter des activités au résumé depuis une bibliothèque.

---

## PHASE 3 — Drag & Drop

**Durée estimée** : 1-2 semaines | **Dépend de** : Phase 1

| Tâche | Description | Effort |
|-------|-------------|--------|
| Setup dnd-kit | Configuration + contexte global | 2h |
| Sections draggables | Réorganiser les sections du résumé | 4h |
| Activités drag & drop | Depuis bibliothèque → résumé | 3h |
| Groupes réorganisables | Ordre des groupes dans le dashboard | 2h |
| Persistance ordre | Sauvegarder `sort_order` en base | 2h |
| Tests accessibilité | dnd-kit est accessible par défaut | 1h |

**Livrable Phase 3** : Toutes les listes sont réorganisables.

---

## PHASE 4 — Import Padlet

**Durée estimée** : 2-3 semaines | **Dépend de** : Phase 1

### Semaine 8-9

| Tâche | Description | Effort |
|-------|-------------|--------|
| Research Padlet API | Analyser l'API/HTML Padlet | 4h |
| `src/lib/padlet/parser.ts` | Extraction cartes Padlet | 8h |
| Supabase Storage | Upload images extraites | 3h |
| Queue traitement | Traitement asynchrone (Supabase Edge Function) | 4h |
| PadletImporter UI | Interface import + progress | 4h |
| PadletCardList | Sélection cartes à inclure | 3h |
| Analyse images IA | GPT-4o Vision sur images Padlet | 4h |
| Tests intégration | Tests avec vrais Padlets | 3h |

**Livrable Phase 4** : Coller une URL Padlet → résumé automatique en 60 secondes.

---

## PHASE 5 — WhatsApp

**Durée estimée** : 2 semaines | **Dépend de** : Phase 1

### Semaine 10-11

| Tâche | Description | Effort |
|-------|-------------|--------|
| Setup WhatsApp Business API | Compte Meta for Developers | 4h |
| `src/lib/whatsapp/client.ts` | Client API WhatsApp | 4h |
| Gestion des numéros | Contacts par groupe (RGPD) | 3h |
| SendConfirmation UI | Dialog confirmation envoi | 2h |
| Route `/api/whatsapp/send` | Envoi effectif | 4h |
| Webhook réception | Accusés de réception | 3h |
| SendHistory | Historique envois | 2h |
| Tests envoi | Tests avec numéros réels | 2h |

**Livrable Phase 5** : Envoi direct WhatsApp depuis l'app. 🎉

---

## PHASE 6 — IA Avancée

**Durée estimée** : 3-4 semaines | **Dépend de** : Phase 4 + 5

| Tâche | Description | Effort |
|-------|-------------|--------|
| Analyse YouTube | Transcription + analyse vidéo pédagogique | 8h |
| Traitement PDF | Extraction texte + images PDF cours | 6h |
| Analyse audio | Transcription cours audio (Whisper API) | 6h |
| Analyse images avancée | Fiches, tableaux, photos cours | 4h |
| Personnalisation IA | Apprentissage des préférences de Teacher Khati | 6h |
| Suggestions proactives | IA propose des thèmes selon le calendrier | 4h |
| Dashboard Analytics | Statistiques d'utilisation et performances | 6h |

**Livrable Phase 6** : App entièrement automatisée, IA complète.

---

## Jalons Clés

| Jalon | Date cible | Description |
|-------|-----------|-------------|
| 🏁 Architecture complète | ✅ 2026-06-06 | Ce document |
| 🚀 Première génération IA | 2026-07-04 | Phase 1 terminée |
| 📚 Bibliothèque activités | 2026-07-18 | Phase 2 terminée |
| 📱 Premier envoi WhatsApp | 2026-09-01 | Phase 5 terminée |
| 🤖 IA complète | 2026-10-15 | Phase 6 terminée |

---

## Estimation Globale

| Phase | Semaines | Heures dev. |
|-------|----------|-------------|
| Phase 0 | 0.5 | 8h |
| Phase 1 | 4 | ~80h |
| Phase 2 | 2 | ~25h |
| Phase 3 | 1.5 | ~14h |
| Phase 4 | 3 | ~35h |
| Phase 5 | 2 | ~25h |
| Phase 6 | 4 | ~40h |
| **TOTAL** | **~17 semaines** | **~227h** |

---

## Règles de Mise à Jour de la Roadmap

1. Cocher les tâches au fur et à mesure
2. Mettre à jour les dates cibles si décalage
3. Ajouter les tâches découvertes en cours
4. Reporter dans MASTER_PROJECT.md après chaque phase
