# Base de Données — Documentation

## Schéma général

```
academic_years
    │
    └── groups ←── sites
                    └── levels
         │
         └── sessions
               │
               ├── contents (Padlet, YouTube, PDF...)
               │
               └── resumes
                     │
                     ├── resume_sections (Drag & Drop)
                     ├── resume_activities → activities
                     └── whatsapp_sends
```

## Tables

| Table | Description | Lignes estimées (5 ans) |
|-------|-------------|------------------------|
| `academic_years` | Années scolaires | ~10 |
| `sites` | Sites physiques | ~10 |
| `levels` | Niveaux (5 fixes) | 5 |
| `groups` | Groupes par site/niveau/année | ~200 |
| `sessions` | Séances de cours | ~5 000 |
| `contents` | Contenus sources | ~15 000 |
| `resumes` | Résumés générés | ~5 000 |
| `resume_sections` | Sections de résumés | ~30 000 |
| `activities` | Bibliothèque d'activités | ~500 |
| `resume_activities` | Activités par résumé | ~15 000 |
| `whatsapp_sends` | Historique envois | ~5 000 |
| `users` | Enseignants | ~20 |

## Champs JSONB importants

### `contents.metadata`
```json
{
  "padlet": {
    "title": "Kids A - Séance du 5 juin",
    "card_count": 12,
    "has_images": true,
    "has_videos": false
  },
  "youtube": {
    "title": "Super Simple Songs - ABC",
    "duration": 180,
    "transcript": "..."
  }
}
```

### `contents.ai_analysis`
```json
{
  "theme": "Animals",
  "vocabulary": ["cat", "dog", "fish"],
  "activities": ["song", "flashcards", "game"],
  "skills_covered": ["listening", "speaking"],
  "difficulty": "A1"
}
```

### `resumes.body_json`
Contenu TipTap sérialisé en JSON. Structure standard TipTap avec extensions.

## Politiques RLS

- `admin` : accès complet à tous les sites
- `teacher` : accès uniquement aux sites de son `users.site_ids`
- Lecture publique : `levels`, `activities` (bibliothèque partagée)

## Migrations

Les migrations sont numérotées dans `supabase/migrations/` :
```
001_initial_schema.sql
002_seed_levels.sql
003_rls_policies.sql
004_indexes.sql
...
```
