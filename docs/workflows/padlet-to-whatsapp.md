# Workflow Complet : Padlet → WhatsApp

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW PADLET → WHATSAPP                   │
│                                                                 │
│  1. INPUT       2. EXTRACT    3. ANALYZE    4. GENERATE         │
│  ─────────      ──────────    ──────────    ──────────          │
│  Padlet URL  →  Cartes     →  IA Analyse →  Résumé brut        │
│  + Contexte     Images        Thèmes        JSON structuré      │
│  groupe         Textes        Vocab         Par niveau          │
│                 Vidéos        Activités                         │
│                                                                 │
│  5. EDIT        6. PREVIEW    7. SEND       8. ARCHIVE          │
│  ─────────      ──────────    ──────────    ──────────          │
│  TipTap      →  WhatsApp   →  API Meta  →  Supabase            │
│  Révision       Simulation    Business      Historique          │
│  Sections       Mobile        API           Recherche           │
│  Drag & Drop    Format                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Étape 1 — INPUT (Interface utilisateur)

**Acteur** : Teacher Khati
**Durée estimée** : 1-2 minutes

```
Teacher Khati ouvre l'app
    → Clique sur "Nouveau cours" sur GroupCard (ex: Kids A)
    → Formulaire : date de la séance + thème optionnel
    → Onglet "Padlet" sélectionné
    → Colle l'URL Padlet public
    → Clique "Analyser"
```

**Données produites** :
```json
{
  "session_id": "uuid",
  "group_id": "uuid",
  "session_date": "2026-06-06",
  "content_type": "padlet",
  "url": "https://padlet.com/teacher/kids-a-06-06"
}
```

---

## Étape 2 — EXTRACTION (Backend)

**Acteur** : API Route `/api/contents/extract`
**Durée estimée** : 10-30 secondes

### Sous-étape 2a : Appel de l'API Route
```
POST /api/contents/extract
Body: { session_id, url, type: "padlet" }
```

### Sous-étape 2b : Parser Padlet (`src/lib/padlet/parser.ts`)
```
fetch(padletUrl)
    → Extraire le HTML / API Padlet
    → Parser les cartes : titre, texte, images, URLs
    → Télécharger les images → Supabase Storage
    → Retourner: PadletContent[]
```

### Structure PadletCard extraite :
```typescript
interface PadletCard {
  id: string
  title?: string
  body?: string
  image_url?: string      // URL Supabase Storage
  youtube_url?: string
  position: number
  author?: string
}
```

### Sous-étape 2c : Sauvegarde en base
```sql
INSERT INTO contents (session_id, type, url, metadata, status)
VALUES ($1, 'padlet', $2, $3, 'ready')
```

---

## Étape 3 — ANALYSE IA (`src/lib/ai/analyzer.ts`)

**Acteur** : OpenAI GPT-4o Vision (ou Claude)
**Durée estimée** : 15-45 secondes

### Prompt système (adapté au niveau) :
```
Tu es un expert pédagogique en enseignement de l'anglais pour enfants.
Analyse le contenu de ce cours de {level.name} (âge {age_min}-{age_max} ans).

Extrais et structure :
1. Thème principal de la séance
2. Vocabulaire appris (avec traduction)
3. Activités réalisées
4. Compétences travaillées (speaking, listening, reading, writing, phonics)
5. Points forts de la séance
6. Difficultés observées (optionnel)

Réponds uniquement en JSON valide.
```

### Output JSON de l'analyse :
```json
{
  "theme": "Farm Animals",
  "vocabulary": [
    { "en": "cow", "fr": "vache", "emoji": "🐄" },
    { "en": "pig", "fr": "cochon", "emoji": "🐷" }
  ],
  "activities": [
    { "name": "Flashcard game", "skill": "vocabulary", "duration": 10 },
    { "name": "Animal sounds song", "skill": "listening", "duration": 5 }
  ],
  "skills_covered": ["vocabulary", "listening", "speaking"],
  "session_highlight": "Les enfants ont adoré le jeu des sons d'animaux"
}
```

---

## Étape 4 — GÉNÉRATION DU RÉSUMÉ (`src/lib/ai/generator.ts`)

**Acteur** : OpenAI GPT-4o (ou Claude)
**Durée estimée** : 15-30 secondes

### Prompt de génération (adapté par niveau) :

#### Preschoolers (3-5 ans) :
```
Écris un résumé de cours très court et joyeux pour les parents de petits de 3-5 ans.
Utilise des phrases simples, beaucoup d'emojis, maximum 8 lignes.
Langage chaleureux, positif, encourageant.
Format WhatsApp (pas de HTML, juste du texte avec emojis).
```

#### Kids (6-8 ans) :
```
Écris un résumé de cours pour les parents d'enfants de 6-8 ans.
Mentionne le vocabulaire, les activités, et 1-2 mots à réviser à la maison.
Maximum 12 lignes, emojis modérés, ton enthousiaste.
```

#### Teenagers (15-18 ans) :
```
Écris un résumé de cours professionnel pour les parents d'adolescents.
Inclure : thème, objectifs, activités, vocabulaire clé, travail suggéré.
Ton sérieux mais bienveillant, maximum 15 lignes.
```

### Structure du résumé généré :
```json
{
  "title": "🐾 Cours Kids A — Vendredi 6 juin",
  "sections": [
    {
      "type": "intro",
      "content": "Bonjour ! Voici le résumé du cours d'aujourd'hui 😊"
    },
    {
      "type": "activities",
      "content": "🎮 Activités du jour :\n• Jeu de flashcards animaux\n• Chanson \"Old MacDonald\""
    },
    {
      "type": "vocabulary",
      "content": "📚 Vocabulaire appris :\n• cow 🐄, pig 🐷, horse 🐴"
    },
    {
      "type": "free",
      "content": "💪 À réviser à la maison : les sons des animaux !"
    }
  ]
}
```

---

## Étape 5 — RÉVISION MANUELLE (TipTap)

**Acteur** : Teacher Khati
**Durée estimée** : 2-5 minutes

```
ResumeEditor s'affiche avec le résumé généré
    → Teacher Khati peut :
       - Modifier le texte dans TipTap
       - Réorganiser les sections (dnd-kit)
       - Ajouter/supprimer des sections
       - Ajouter des activités depuis la bibliothèque
       - Prévisualiser en format WhatsApp (bouton Preview)
    → Clic "Approuver" → status: 'approved'
```

---

## Étape 6 — PRÉVISUALISATION WHATSAPP

**Acteur** : Teacher Khati
**Durée estimée** : 30 secondes

```
WhatsAppPreview.tsx affiche :
    → Simulation bulle WhatsApp (fond vert)
    → Format mobile (375px)
    → Texte tel qu'il sera reçu
    → Bouton "Copier" (fallback manuel)
    → Bouton "Envoyer" → SendConfirmation dialog
```

---

## Étape 7 — ENVOI WHATSAPP

**Acteur** : API Route `/api/whatsapp/send`
**Durée estimée** : 5-30 secondes

```
POST /api/whatsapp/send
Body: { resume_id, group_id }

→ Récupérer les numéros WhatsApp du groupe
→ Formater le message (body_text du résumé)
→ Pour chaque numéro :
   POST https://graph.facebook.com/v18.0/{phone_id}/messages
   { type: "text", to: number, text: { body: message } }
→ Collecter les message_ids
→ Mettre à jour whatsapp_sends (status: 'sent')
→ Mettre à jour resumes (status: 'sent')
```

### Gestion des erreurs :
- Numéro invalide → `partial_error` + log
- API down → retry x3 → `failed`
- Rate limit → queue + retry

---

## Étape 8 — ARCHIVAGE

**Acteur** : Automatique (trigger Supabase)
**Durée estimée** : < 1 seconde

```
Trigger après INSERT sur whatsapp_sends :
    → Marquer session.status = 'completed'
    → Marquer resume.status = 'sent'
    → Disponible immédiatement dans les Archives
```

### Navigation dans les Archives :
```
Archives
 └── 2025-2026
      └── Maison-Alfort
           └── Kids
                └── Kids A
                     └── Séance 06/06/2026 ← résumé archivé
```

---

## Modules IA — `src/lib/ai/`

### `analyzer.ts` — Analyse de contenu
```typescript
analyzeContent(content: Content, level: Level): Promise<AIAnalysis>
analyzeYouTube(url: string): Promise<YouTubeAnalysis>
analyzePDF(filePath: string): Promise<PDFAnalysis>
analyzeImage(imageUrl: string): Promise<ImageAnalysis>
```

### `generator.ts` — Génération de résumé
```typescript
generateResume(analysis: AIAnalysis, level: Level, context: SessionContext): Promise<ResumeJSON>
regenerateSection(section: ResumeSection, instruction: string): Promise<string>
suggestActivities(analysis: AIAnalysis, level: Level): Promise<Activity[]>
```

### `prompts.ts` — Prompts par niveau
```typescript
SYSTEM_PROMPTS: Record<LevelSlug, string>
GENERATION_PROMPTS: Record<LevelSlug, string>
SECTION_PROMPTS: Record<SectionType, string>
```

### `models.ts` — Configuration modèles IA
```typescript
PRIMARY_MODEL = 'gpt-4o'
FALLBACK_MODEL = 'claude-3-5-sonnet-20241022'
VISION_MODEL = 'gpt-4o'  // Pour images
```

---

## Système d'Archives — `src/lib/archives/`

### Structure de navigation :
```
getAcademicYears()
  → getSitesByYear(yearId)
    → getLevelsBySite(siteId, yearId)
      → getGroupsByLevel(levelId, siteId, yearId)
        → getSessionsByGroup(groupId)
          → getResumeBySession(sessionId)
```

### Recherche full-text :
```sql
SELECT r.*, s.session_date, g.name as group_name
FROM resumes r
JOIN sessions s ON s.id = r.session_id
JOIN groups g ON g.id = s.group_id
WHERE to_tsvector('french', r.title || ' ' || r.body_text)
  @@ plainto_tsquery('french', :query)
ORDER BY s.session_date DESC
LIMIT 20;
```

### Exports :
- `exportToPDF(resumeId)` → PDF via Puppeteer/html2pdf
- `exportToWord(resumeId)` → DOCX via docx.js
- `copyToClipboard(resumeId)` → Texte WhatsApp formaté
