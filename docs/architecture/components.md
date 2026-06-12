# Architecture des Composants React

## Principes
- Un composant = une responsabilité
- Max 500 lignes par fichier
- Props typées TypeScript strict
- Zéro duplication — extraire en `shared/`

---

## LAYOUT

### `layout/AppShell.tsx`
Coque principale de l'application.
- **Props** : `children: ReactNode`
- **Contient** : Sidebar + Header + zone de contenu
- **Usage** : Wrappé dans `app/layout.tsx`

### `layout/Sidebar.tsx`
Navigation principale.
- Navigation par site (accordéon)
- Badge du nombre de résumés en attente
- Raccourcis : Dashboard, Archives, Activités, Paramètres

### `layout/Header.tsx`
Barre du haut.
- Sélecteur de site actif
- Bouton "Nouveau résumé"
- Avatar utilisateur + menu

### `layout/MobileSidebar.tsx`
Version drawer de la Sidebar pour mobile.

---

## DASHBOARD

### `dashboard/DashboardPage.tsx`
Page principale du tableau de bord.
- **Props** : `siteId?: string`
- **Contient** : SiteOverview + GroupGrid + RecentActivity

### `dashboard/SiteCard.tsx`
Carte d'un site avec ses métriques.
- **Props** : `site: Site, stats: SiteStats`
- Affiche : nom, nb groupes actifs, résumés cette semaine, lien rapide

### `dashboard/GroupGrid.tsx`
Grille des groupes d'un site.
- **Props** : `siteId: string, levelId?: string`
- Filtres par niveau
- Chaque groupe = `GroupCard`

### `dashboard/GroupCard.tsx`
Carte d'un groupe.
- **Props** : `group: Group, lastSession?: Session`
- Affiche : nom, niveau, jour/heure, date dernier cours
- Actions : Nouveau cours, Voir historique

### `dashboard/WeeklyOverview.tsx`
Vue de la semaine (mini calendrier).
- **Props** : `groups: Group[], sessions: Session[]`
- Groupes avec séance cette semaine

---

## RÉSUMÉ (module cœur)

### `resume/ResumeWizard.tsx`
Assistant de création de résumé (multi-étapes).
- **Étape 1** : Sélection groupe + date
- **Étape 2** : Import du contenu source
- **Étape 3** : Génération IA + révision
- **Étape 4** : Preview WhatsApp + envoi

### `resume/StepContentInput.tsx`
Étape 2 : Saisie du contenu source.
- **Props** : `sessionId: string, onComplete: () => void`
- Onglets : Padlet | YouTube | Texte libre | PDF | URL

### `resume/StepAIGeneration.tsx`
Étape 3 : Génération et révision.
- **Props** : `sessionId: string, contents: Content[]`
- Bouton "Générer avec l'IA"
- Indicateur de progression IA
- Éditeur TipTap post-génération

### `resume/ResumeEditor.tsx`
Éditeur TipTap principal.
- **Props** : `resume: Resume, onChange: (json: JSONContent) => void`
- Toolbar personnalisée
- Sections drag & drop

### `resume/ResumeSection.tsx`
Section individuelle du résumé (draggable).
- **Props** : `section: ResumeSection, onEdit: () => void, onDelete: () => void`
- Types : intro | vocabulary | activities | grammar | phonics | free

### `resume/SectionToolbar.tsx`
Toolbar TipTap personnalisée.
- Gras, italique, listes
- Emojis rapides
- Ajout de section

### `resume/ResumePreview.tsx`
Prévisualisation au format WhatsApp.
- **Props** : `resume: Resume`
- Simulation bulle WhatsApp mobile
- Copier le texte

### `resume/AIGenerationProgress.tsx`
Indicateur de progression IA.
- Étapes : Analyse → Structuration → Rédaction → Finalisation
- Durée estimée

### `resume/ResumeVersionHistory.tsx`
Historique des versions d'un résumé.
- **Props** : `sessionId: string`
- Comparaison versions

---

## PADLET

### `padlet/PadletImporter.tsx`
Interface d'import d'un Padlet.
- **Props** : `onImport: (content: Content) => void`
- Champ URL + bouton Analyser
- Preview des cartes extraites

### `padlet/PadletCardList.tsx`
Liste des cartes Padlet extraites.
- **Props** : `cards: PadletCard[], onSelect: (ids: string[]) => void`
- Sélection des cartes à inclure

### `padlet/PadletCard.tsx`
Carte Padlet individuelle.
- **Props** : `card: PadletCard, isSelected: boolean`
- Affiche : titre, contenu, image si disponible

---

## ACTIVITÉS

### `activites/ActivityLibrary.tsx`
Bibliothèque complète des activités.
- **Props** : `levelId?: string, onSelect?: (activity: Activity) => void`
- Filtres : niveau, compétence, tags, durée

### `activites/ActivityCard.tsx`
Carte d'une activité.
- **Props** : `activity: Activity, onAdd?: () => void`
- Affiche : nom, emoji, durée, niveaux, skills

### `activites/ActivityFilters.tsx`
Filtres de la bibliothèque.
- Checkboxes niveaux, compétences, tags
- Recherche textuelle

---

## ARCHIVES

### `archives/ArchiveBrowser.tsx`
Navigateur d'archives.
- **Props** : `userId: string`
- Arborescence : Année → Site → Niveau → Groupe → Séances
- Barre de recherche full-text

### `archives/ArchiveTreeNode.tsx`
Nœud de l'arborescence.
- **Props** : `node: ArchiveNode, isOpen: boolean`
- Accordéon avec compteur

### `archives/ResumeListItem.tsx`
Résumé dans la liste des archives.
- **Props** : `resume: Resume, session: Session`
- Actions : Voir, Copier, Exporter PDF, Renvoyer WhatsApp

---

## WHATSAPP

### `whatsapp/WhatsAppPreview.tsx`
Preview du message WhatsApp.
- **Props** : `message: string, groupName: string`
- Simulation interface mobile WhatsApp

### `whatsapp/SendConfirmation.tsx`
Dialog de confirmation d'envoi.
- **Props** : `group: Group, resume: Resume, onConfirm: () => void`
- Affiche : groupe cible, nb destinataires, aperçu message

### `whatsapp/SendHistory.tsx`
Historique des envois pour une session.
- **Props** : `sessionId: string`
- Liste des envois avec statut

---

## UI (PARTAGÉ)

### `ui/LevelBadge.tsx`
Badge coloré d'un niveau.
- **Props** : `level: Level`
- Emoji + couleur du niveau

### `ui/SiteSelector.tsx`
Sélecteur de site (dropdown ou tabs).
- **Props** : `sites: Site[], value: string, onChange: (id: string) => void`

### `ui/StatusBadge.tsx`
Badge de statut (draft, approved, sent...).
- **Props** : `status: ResumeStatus`

### `ui/EmptyState.tsx`
État vide réutilisable.
- **Props** : `icon: ReactNode, title: string, description: string, action?: ReactNode`

### `ui/ConfirmDialog.tsx`
Dialog de confirmation générique.
- **Props** : `title, description, onConfirm, onCancel, destructive?: boolean`

### `ui/LoadingSpinner.tsx`
Spinner de chargement.

### `shared/PageHeader.tsx`
En-tête de page standard.
- **Props** : `title: string, description?: string, actions?: ReactNode`

---

## FLUX DE DONNÉES

```
ResumeWizard
  ├── StepContentInput → [API] POST /api/contents
  ├── StepAIGeneration → [API] POST /api/resumes/generate
  │     └── ResumeEditor ← [Supabase] REALTIME updates
  └── WhatsAppPreview → [API] POST /api/whatsapp/send
```
