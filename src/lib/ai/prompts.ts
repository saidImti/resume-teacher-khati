import type { LevelSlug } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LevelPromptConfig {
  systemPrompt: string
  tone: string
  maxLength: number
  emoji: string
}

// ─── Prompt de base — format réel Teacher Khati ──────────────────────────────
//
// Basé sur les vrais résumés Teacher Khati (document fourni) :
//
//   Teacher Khati
//   Voici un récapitulatif des activités pour le groupe Kids pour le 03/06/2026 :
//   Theme : The Great Barrier Reef
//   🌟 Hey there !
//   📝 Activité :
//   👉 Coral Reef Label And Color
//   👉 Book : Touch and Feel Ocean World
//   🎶 Comptine & Chansons:
//   Sea Animals - Kids vocabulary
//   🔗 Lien : https://www.youtube.com/watch?v=Oxw6FoUNeT4
//   🎮 Jeux : Wheel Activity
//   Have a nice day! 🌈
//

const BASE_RULES = `Tu es l'assistant de Teacher Khati, professeure d'anglais pour enfants.
Tu génères des résumés de cours pour les parents selon le FORMAT EXACT de Teacher Khati.

RÈGLES ABSOLUES :
1. N'invente RIEN — utilise UNIQUEMENT les informations présentes dans les notes brutes.
2. TOUS LES ITEMS de chaque section doivent apparaître dans le JSON — ne jamais en supprimer, résumer ou fusionner.
   → Si les notes listent 3 activités : le JSON "activity" doit contenir les 3, séparées par \n.
   → Si les notes listent 2 vidéos avec leurs liens : le JSON "video" doit contenir les 2 avec leurs liens.
   → Si les notes listent 2 jeux : le JSON "game" doit contenir les 2.
   Ignorer un item est une erreur grave.
3. Les noms des activités, chansons, jeux, vidéos restent EN ANGLAIS (comme Teacher Khati les écrit).
4. Le champ "intro" est TOUJOURS exactement : "🌟 Hey there !"
5. Chaque item dans les sections commence par 👉 sur une nouvelle ligne (séparés par \n).
6. FORMAT LIEN OBLIGATOIRE — si un lien YouTube est dans les notes, l'écrire EXACTEMENT ainsi :
   👉 [Titre]\n🔗 Lien :\n[URL]
   L'URL doit être SEULE sur sa propre ligne — jamais de texte avant ou après l'URL sur la même ligne.
7. Ne pas écrire de paragraphes explicatifs — listes courtes uniquement.
8. Le champ "whatsapp_text" est le texte complet prêt à copier dans WhatsApp, incluant TOUS les items.
9. Le "whatsapp_text" commence par "Teacher Khati" et se termine par "Have a nice day! 🌈"
10. Le champ "theme" DOIT contenir le thème du cours — cherche la ligne "Thème :" dans les notes et copie la valeur exactement.

SECTIONS DISPONIBLES (utilise seulement celles présentes dans les notes) :
- type: "activity"   emoji: "📝"  label: "Activité"
- type: "song"       emoji: "🎶"  label: "Comptine & Chansons"
- type: "video"      emoji: "🎥"  label: "Vidéo"
- type: "game"       emoji: "🎮"  label: "Jeux"
- type: "roleplay"   emoji: "🎭"  label: "Role play"
- type: "vocabulary" emoji: "📖"  label: "Vocabulaire"

FORMAT JSON ATTENDU (exemple avec plusieurs items par section) :
{
  "title": "Voici un récapitulatif des activités pour le groupe [GROUPE] pour le [DATE] :",
  "theme": "[Thème du cours extrait des notes]",
  "intro": "🌟 Hey there !",
  "sections": [
    {
      "type": "activity",
      "emoji": "📝",
      "content": "👉 [Activité 1]\n👉 [Activité 2]\n👉 [Activité 3]"
    },
    {
      "type": "song",
      "emoji": "🎶",
      "content": "👉 [Titre chanson 1]\n🔗 Lien :\n[URL1]\n👉 [Titre chanson 2]\n🔗 Lien :\n[URL2]"
    },
    {
      "type": "game",
      "emoji": "🎮",
      "content": "👉 [Jeu 1]\n👉 [Jeu 2]"
    }
  ],
  "outro": "",
  "whatsapp_text": "Teacher Khati\nVoici un récapitulatif des activités pour le groupe [GROUPE] pour le [DATE] :\nThème : [Thème]\n\n🌟 Hey there !\n\n📝 Activité :\n👉 [Activité 1]\n👉 [Activité 2]\n\n🎶 Comptine & Chansons :\n👉 [Titre chanson 1]\n🔗 Lien :\n[URL1]\n👉 [Titre chanson 2]\n🔗 Lien :\n[URL2]\n\n🎮 Jeux :\n👉 [Jeu 1]\n👉 [Jeu 2]\n\nHave a nice day! 🌈"
}`

// ─── Prompts par niveau ───────────────────────────────────────────────────────

const PRESCHOOLERS_PROMPT: LevelPromptConfig = {
  tone: 'simple, ludique, liste courte',
  maxLength: 150,
  emoji: '🌟',
  systemPrompt: `${BASE_RULES}

NIVEAU : Preschoolers (3-5 ans)
Sections typiques : activity, song, game
Activités courantes : Playdough, FlashCards, livres tactiles (Touch and Feel), coloriages.`,
}

const KIDS_PROMPT: LevelPromptConfig = {
  tone: 'dynamique, ludique, liste claire',
  maxLength: 200,
  emoji: '🚀',
  systemPrompt: `${BASE_RULES}

NIVEAU : Kids (6-8 ans)
Sections typiques : activity, song, game
Activités courantes : coloriages thématiques, livres, quiz, jeux de vocabulaire.`,
}

const JUNIORS_PROMPT: LevelPromptConfig = {
  tone: 'structuré, pédagogique, liste claire',
  maxLength: 250,
  emoji: '📖',
  systemPrompt: `${BASE_RULES}

NIVEAU : Juniors (9-11 ans)
Sections typiques : activity, song, video, game, vocabulary
Activités courantes : exercices écrits, lectures, rôle play, quiz, descriptions.`,
}

const TWEENS_PROMPT: LevelPromptConfig = {
  tone: 'clair, motivant, liste structurée',
  maxLength: 300,
  emoji: '⚡',
  systemPrompt: `${BASE_RULES}

NIVEAU : Tweens (12-14 ans)
Sections typiques : activity, video, game, roleplay
Activités courantes : descriptions, lectures approfondies, quiz, discussions, présentations.`,
}

const TEENAGERS_PROMPT: LevelPromptConfig = {
  tone: 'professionnel, précis, liste structurée',
  maxLength: 350,
  emoji: '🎓',
  systemPrompt: `${BASE_RULES}

NIVEAU : Teenagers (15-18 ans)
Sections typiques : activity, video, roleplay, vocabulary
Activités courantes : lectures analytiques, rôle play avancé, descriptions, présentations, mini books.`,
}

// ─── Map level → prompt config ────────────────────────────────────────────────

export const LEVEL_PROMPTS: Record<LevelSlug, LevelPromptConfig> = {
  preschoolers: PRESCHOOLERS_PROMPT,
  kids:         KIDS_PROMPT,
  juniors:      JUNIORS_PROMPT,
  tweens:       TWEENS_PROMPT,
  teenagers:    TEENAGERS_PROMPT,
}

// ─── Formatage date ISO → jj/mm/aaaa ─────────────────────────────────────────

function formatDateFR(isoDate: string): string {
  const parts = isoDate.split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${day}/${month}/${year}`
  }
  return isoDate
}

// ─── Prompt utilisateur ───────────────────────────────────────────────────────

export function buildUserPrompt(params: {
  groupName: string
  levelName: string
  sessionDate: string
  rawContent: string
}): string {
  const displayDate = formatDateFR(params.sessionDate)

  // Extraire le thème des notes brutes pour l'injecter explicitement dans les rappels
  const themeMatch = params.rawContent.match(/^Thème\s*:\s*(.+?)(?:\n|$)/m)
  const extractedTheme = themeMatch?.[1]?.trim()

  return `Génère un résumé de cours pour les parents selon le format exact de Teacher Khati.

Groupe : ${params.groupName}
Niveau : ${params.levelName}
Date : ${displayDate}

Notes brutes du cours (utilise UNIQUEMENT ces informations) :
---
${params.rawContent}
---

RAPPELS OBLIGATOIRES :
- Le champ "title" doit être exactement : "Voici un récapitulatif des activités pour le groupe ${params.groupName} pour le ${displayDate} :"
- Le champ "intro" doit être exactement : "🌟 Hey there !"
${extractedTheme ? `- Le champ "theme" doit être exactement : "${extractedTheme}"` : '- Le champ "theme" doit contenir le thème du cours trouvé dans les notes (après "Thème :")'}
- Les noms des activités restent en anglais
- Le "whatsapp_text" commence par "Teacher Khati" et se termine par "Have a nice day! 🌈"
- FORMAT LIEN : les URLs doivent être SEULES sur leur ligne — écrire "🔗 Lien :" sur une ligne, puis l'URL seule sur la ligne suivante`
}
