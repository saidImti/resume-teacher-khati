# MASTER PROJECT — Resumé Teacher Khati

> **Document maitre** — Toujours a jour. Mise a jour obligatoire avant toute implementation majeure.
> Derniere mise a jour : 2026-06-12 (v2.0 — Session 7 : Audit Ultra-Premium complet applique)

---

## 1. VISION DU PROJET

**Resume Teacher Khati** est une application web premium destinee a Teacher Khati pour gerer ses cours d'anglais pour enfants sur plusieurs sites.

### Objectif principal
Automatiser la generation de resumes de cours professionnels envoyes aux parents via WhatsApp, depuis des contenus pedagogiques bruts (Padlet, YouTube, PDF, images, audios).

### Proposition de valeur
- Gain de temps : resume genere en < 2 minutes par groupe
- Communication parents simplifiee via WhatsApp
- Archives structurees par annee/site/niveau/groupe
- Vue d'ensemble multi-sites en temps reel

---

## 2. STACK TECHNIQUE

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 14 (App Router) |
| Langage | TypeScript strict |
| Styling | Tailwind CSS + shadcn/ui |
| Base de donnees | Supabase (PostgreSQL) |
| Formulaires | React Hook Form + Zod |
| Drag & Drop | dnd-kit |
| Editeur riche | TipTap |
| IA | OpenAI GPT-4o |
| Automatisation | N8N (Hostinger) |
| Etat global | Zustand |
| Theme | next-themes (dark/light/system) |
| Animations | CSS (animate-fade-in-up, page-enter) |
| Commandes | cmdk (palette Cmd+K) |

---

## 3. ARCHITECTURE MULTI-SITES

```
Teacher Khati
├── Site : Maison-Alfort
│   ├── Preschoolers (3-5 ans)
│   ├── Kids (6-8 ans)
│   ├── Juniors (9-11 ans)
│   ├── Tweens (12-14 ans)
│   └── Teenagers (15-18 ans)
├── Site : Champigny
│   └── [memes niveaux]
└── Site : [Futurs sites]
    └── [memes niveaux]
```

---

## 4. PHASES D'IMPLEMENTATION

| Phase | Statut | Description |
|-------|--------|-------------|
| Phase 1 | COMPLETE | Dashboard + Generation de resume |
| Phase 2 | COMPLETE | Bibliotheque d'activites |
| Phase 3 | En attente | Drag & Drop avance |
| Phase 4 | COMPLETE | Import Padlet (API + upload) |
| Phase 5 | En attente | WhatsApp (enqueue N8N) |
| Phase 6 | En attente | IA avancee (Vision, multi-modal) |
| Audit | COMPLETE | Securite, SEO, UX, Performance |

---

## 5. AUDIT ULTRA-PREMIUM — v2.0 (Session 7)

Toutes les corrections de l'audit ont ete appliquees dans l'ordre optimal.

### Securite (CRITIQUE)
- [x] DOMPurify — XSS corrige dans WhatsAppPreview (dangerouslySetInnerHTML sanitise)
- [x] Security headers dans next.config.js (HSTS, X-Frame-Options, CSP, Referrer-Policy)
- [x] eslint-plugin-jsx-a11y — regles d'accessibilite en lint

### Fondation (ESSENTIEL)
- [x] next.config.js complet — images WebP/AVIF, compress, redirects, optimizePackageImports
- [x] layout.tsx — lang="fr", ThemeProvider, title template, Open Graph, Viewport export
- [x] Manifest PWA (site.webmanifest) + favicon.svg + apple-touch-icon

### SEO
- [x] robots.ts (Next.js natif) — disallow tout (app privee)
- [x] sitemap.ts (Next.js natif) — expose /auth/login uniquement
- [x] Metadata OG + Twitter Card sur chaque page

### Stabilite
- [x] error.tsx boundary sur chaque section (dashboard, archives, mes-padlets, settings)
- [x] loading.tsx par section avec skeleton screens

### Performance perceptuelle
- [x] SkeletonCard, SkeletonList, SkeletonTable, SkeletonDashboard (skeleton-variants.tsx)
- [x] FadeIn component avec stagger delays (animationDelay CSS)
- [x] CSS animations : fade-in-up, fade-in-down, fade-in-right, fade-in-left, page-enter
- [x] btn-press class (active:scale-[0.97]) sur tous les boutons

### UX Premium
- [x] Dark mode — next-themes (system/light/dark cycle), ThemeToggle dans Header
- [x] EmptyState — 7 illustrations SVG inline adaptees light/dark, composant reutilisable
- [x] EmptyState integree : dashboard, settings/groups, archives
- [x] Command palette Cmd+K — cmdk, navigation complete, theme toggle, deconnexion
- [x] Trigger Cmd+K visible dans le Header (desktop)
- [x] Dark mode badges statut dans archives/page.tsx

---

## 6. COMPOSANTS CLES

### UI (src/components/ui/)
| Composant | Role |
|-----------|------|
| EmptyState.tsx | Empty states avec 7 illustrations SVG |
| FadeIn.tsx | Animations d'entree avec stagger |
| ThemeToggle.tsx | Bascule dark/light/system |
| CommandPalette.tsx | Palette Cmd+K (cmdk) |
| skeleton-variants.tsx | SkeletonCard, SkeletonList, SkeletonTable, SkeletonDashboard |

### Layout (src/components/layout/)
| Composant | Role |
|-----------|------|
| Sidebar.tsx | Navigation principale, collapsible |
| Header.tsx | Titre, actions, Cmd+K trigger, ThemeToggle |

### Providers (src/components/providers/)
| Composant | Role |
|-----------|------|
| ThemeProvider.tsx | Wrapper next-themes |

---

## 7. STRUCTURE DES FICHIERS CLES

```
src/
├── app/
│   ├── layout.tsx           # Root layout — ThemeProvider, CommandPalette, Metadata
│   ├── error.tsx            # Boundary global
│   ├── robots.ts            # SEO robots
│   ├── sitemap.ts           # SEO sitemap
│   ├── dashboard/
│   │   ├── loading.tsx      # Skeleton dashboard
│   │   └── error.tsx
│   ├── archives/
│   │   ├── page.tsx         # FadeIn + EmptyState premium
│   │   ├── loading.tsx
│   │   └── error.tsx
│   ├── mes-padlets/
│   │   ├── loading.tsx
│   │   └── error.tsx
│   └── settings/
│       └── groups/page.tsx  # EmptyState premium
├── components/
│   ├── ui/
│   │   ├── EmptyState.tsx
│   │   ├── FadeIn.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── CommandPalette.tsx
│   │   └── skeleton-variants.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   └── providers/
│       └── ThemeProvider.tsx
├── styles/
│   └── globals.css          # CSS animations + btn-press + focus-visible
public/
├── favicon.svg
├── favicon.ico
├── apple-touch-icon.png
├── og-image.png
├── icon-192.png
├── icon-512.png
└── site.webmanifest
next.config.js               # Security headers, images, compress, redirects
.eslintrc.json               # jsx-a11y + next/core-web-vitals
```

---

## 8. PROCHAINES ETAPES (Phase 5+)

| Priorite | Tache |
|----------|-------|
| P1 | Integration WhatsApp via N8N (Phase 5) |
| P1 | Page /resumes/new complete (wizard de generation) |
| P2 | Drag & Drop sur les groupes/sessions (Phase 3) |
| P2 | Notifications en temps reel (Supabase Realtime) |
| P3 | IA avancee — Vision sur images Padlet (Phase 6) |
| P3 | Analytics dashboard (graphiques activite) |
| P4 | Tests E2E Playwright sur les parcours critiques |

---

## 9. REGLES DE DEVELOPPEMENT

1. Toujours mettre a jour MASTER_PROJECT.md avant implementation majeure
2. Maximum 500 lignes par fichier — decouper si necessaire
3. Composants reutilisables — jamais de code duplique
4. Chaque feature isolee dans son module (pas de couplage fort)
5. TypeScript strict — 0 erreur `npx tsc --noEmit` avant merge
6. bash heredoc obligatoire pour les fichiers dans le dossier avec accents
7. Noms de fichiers sans accents ni espaces (sauf si existants)
8. Performance : skeleton + FadeIn sur toutes les listes
9. Accessibilite : aria-label sur tous les boutons sans texte visible
10. Dark mode : utiliser les variables CSS (hsl(var(--primary))) jamais de couleurs hardcodees
