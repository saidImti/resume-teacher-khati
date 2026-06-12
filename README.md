# Résumé Teacher Khati

Application web premium de génération automatique de résumés de cours pour Teacher Khati.

## À propos

Résumé Teacher Khati permet à Teacher Khati de générer en quelques minutes des résumés professionnels de ses cours d'anglais pour enfants, adaptés par âge, et de les envoyer directement aux parents via WhatsApp.

### Sites gérés
- Maison-Alfort
- Champigny
- Futurs sites (architecture extensible)

### Niveaux
- 🐣 Preschoolers (3-5 ans)
- 🌟 Kids (6-8 ans)
- 🚀 Juniors (9-11 ans)
- 🎯 Tweens (12-14 ans)
- 🏆 Teenagers (15-18 ans)

---

## Stack Technique

- **Framework** : Next.js 14 (App Router)
- **Langage** : TypeScript
- **Styling** : Tailwind CSS + shadcn/ui
- **Base de données** : Supabase (PostgreSQL)
- **Formulaires** : React Hook Form + Zod
- **Drag & Drop** : dnd-kit
- **Éditeur** : TipTap
- **IA** : OpenAI GPT-4o / Claude
- **État** : Zustand

---

## Structure du Projet

```
résumé-teacher-khati/
├── docs/                    # Documentation
│   ├── architecture/        # Schémas d'architecture
│   ├── database/            # Schémas de base de données
│   ├── workflows/           # Workflows et flux de données
│   └── api/                 # Documentation API
├── src/
│   ├── app/                 # Routes Next.js (App Router)
│   │   ├── auth/            # Pages d'authentification
│   │   ├── dashboard/       # Tableau de bord principal
│   │   ├── resumes/         # Gestion des résumés
│   │   ├── archives/        # Archives par année/site
│   │   ├── activites/       # Bibliothèque d'activités
│   │   ├── settings/        # Paramètres
│   │   └── api/             # Routes API
│   ├── components/          # Composants React
│   │   ├── ui/              # Composants UI de base (shadcn)
│   │   ├── layout/          # Layout, navigation, sidebar
│   │   ├── dashboard/       # Composants du tableau de bord
│   │   ├── resume/          # Composants de résumé
│   │   ├── padlet/          # Composants import Padlet
│   │   ├── archives/        # Composants archives
│   │   ├── activites/       # Composants bibliothèque
│   │   ├── whatsapp/        # Composants WhatsApp
│   │   └── shared/          # Composants partagés
│   ├── lib/                 # Logique métier
│   │   ├── supabase/        # Client + requêtes Supabase
│   │   ├── ai/              # Intégration IA (OpenAI/Claude)
│   │   ├── padlet/          # Parser Padlet
│   │   ├── whatsapp/        # Intégration WhatsApp API
│   │   └── utils/           # Utilitaires
│   ├── hooks/               # Custom React hooks
│   ├── types/               # Types TypeScript globaux
│   ├── store/               # Zustand stores
│   └── styles/              # Styles globaux
├── supabase/
│   ├── migrations/          # Migrations SQL
│   ├── seed/                # Données de test
│   └── functions/           # Edge Functions
├── scripts/                 # Scripts utilitaires
├── public/                  # Assets statiques
├── MASTER_PROJECT.md        # Document maître du projet
└── README.md                # Ce fichier
```

---

## Démarrage Rapide

> ⚠️ L'application n'est pas encore installée. Voir MASTER_PROJECT.md pour la roadmap.

```bash
# 1. Cloner et installer
git clone [repo]
cd resume-teacher-khati
npm install

# 2. Variables d'environnement
cp .env.example .env.local
# Remplir les variables (Supabase, OpenAI, WhatsApp)

# 3. Base de données
npx supabase db push

# 4. Lancer en développement
npm run dev
```

---

## Variables d'Environnement Requises

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# IA
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# WhatsApp Business API
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Roadmap

| Phase | Description | Statut |
|-------|-------------|--------|
| Docs & Architecture | Setup complet | ✅ |
| Phase 1 | Dashboard + Génération résumés | 🔄 |
| Phase 2 | Bibliothèque d'activités | ⏳ |
| Phase 3 | Drag & Drop | ⏳ |
| Phase 4 | Import Padlet | ⏳ |
| Phase 5 | WhatsApp | ⏳ |
| Phase 6 | IA Avancée | ⏳ |

---

## Documentation

- [MASTER_PROJECT.md](./MASTER_PROJECT.md) — Vision, architecture, décisions
- [docs/database/](./docs/database/) — Schéma de base de données
- [docs/workflows/](./docs/workflows/) — Flux de travail
- [docs/architecture/](./docs/architecture/) — Architecture technique

---

*Projet développé pour Teacher Khati — 2025/2026*
