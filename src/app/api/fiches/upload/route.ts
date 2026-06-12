import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Types de fichiers supportés ──────────────────────────────────────────────

const AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-m4a']
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/avi', 'video/x-matroska', 'video/webm']
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const AUDIO_EXTS = ['.mp3', '.m4a', '.wav', '.ogg', '.webm']
const VIDEO_EXTS = ['.mp4', '.mov', '.avi', '.mkv']
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

function isAudio(name: string, type: string) {
  return AUDIO_TYPES.includes(type) || AUDIO_EXTS.some((e) => name.toLowerCase().endsWith(e))
}
function isVideo(name: string, type: string) {
  return VIDEO_TYPES.includes(type) || VIDEO_EXTS.some((e) => name.toLowerCase().endsWith(e))
}
function isImage(name: string, type: string) {
  return IMAGE_TYPES.includes(type) || IMAGE_EXTS.some((e) => name.toLowerCase().endsWith(e))
}
function isPdf(name: string, type: string) {
  return type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')
}

const MAX_SIZE = 25 * 1024 * 1024 // 25 MB

// ─── POST /api/fiches/upload ──────────────────────────────────────────────────
// Reçoit un fichier en multipart/form-data, extrait le texte et le retourne.

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Impossible de lire le formulaire.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: `Fichier trop grand (max 25 Mo).` }, { status: 400 })
  }

  const name    = file.name
  const type    = file.type
  const buffer  = await file.arrayBuffer()

  // ── Transcription audio ────────────────────────────────────────────────────
  if (isAudio(name, type)) {
    try {
      const audioFile = new File([buffer], name, { type: type || 'audio/mpeg' })
      const transcript = await openai.audio.transcriptions.create({
        file:     audioFile,
        model:    'whisper-1',
        language: 'fr',
        prompt:   'Cours d\'anglais pour enfants. Vocabulaire, exercices, grammaire.',
      })
      return NextResponse.json({ text: transcript.text, method: 'whisper' })
    } catch (err) {
      console.error('Whisper error:', err)
      return NextResponse.json({ error: 'Erreur lors de la transcription audio.' }, { status: 500 })
    }
  }

  // ── Vidéo : extrait audio et transcrit ────────────────────────────────────
  if (isVideo(name, type)) {
    try {
      // Pour la vidéo, on envoie directement à Whisper — OpenAI accepte certains formats vidéo
      const videoFile = new File([buffer], name, { type: type || 'video/mp4' })
      const transcript = await openai.audio.transcriptions.create({
        file:     videoFile,
        model:    'whisper-1',
        language: 'fr',
        prompt:   'Cours d\'anglais pour enfants.',
      })
      return NextResponse.json({ text: transcript.text, method: 'whisper-video' })
    } catch (err) {
      console.error('Whisper video error:', err)
      // Fallback: describe as unsupported
      return NextResponse.json({
        text: `[Fichier vidéo : ${name}] — Contenu non extractible automatiquement. Ajoutez des notes manuelles pour ce cours.`,
        method: 'video-placeholder',
      })
    }
  }

  // ── Image : GPT-4o vision ─────────────────────────────────────────────────
  if (isImage(name, type)) {
    try {
      const base64  = Buffer.from(buffer).toString('base64')
      const mimeType = type || 'image/jpeg'

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' },
            },
            {
              type: 'text',
              text: 'Tu es un assistant pédagogique. Extrait tout le texte visible dans cette image de cours d\'anglais : vocabulaire, consignes, exercices, grammaire, dialogues. Retourne le contenu complet en texte structuré.',
            },
          ],
        }],
      })

      const text = response.choices[0]?.message?.content ?? ''
      return NextResponse.json({ text, method: 'vision' })
    } catch (err) {
      console.error('Vision error:', err)
      return NextResponse.json({ error: 'Erreur lors de l\'analyse de l\'image.' }, { status: 500 })
    }
  }

  // ── PDF : GPT-4o avec extraction base64 ───────────────────────────────────
  if (isPdf(name, type)) {
    try {
      const base64 = Buffer.from(buffer).toString('base64')

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o',
        max_tokens: 3000,
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en extraction de contenu pédagogique. Extrait tout le texte d\'un document PDF de cours d\'anglais.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Voici un document PDF de cours d\'anglais en base64. Extrait tout le contenu texte visible : vocabulaire, exercices, grammaire, dialogues, thèmes. Retourne le texte complet et structuré.',
              },
              {
                // Send as file content if model supports it, otherwise try as image first page
                type: 'image_url',
                image_url: { url: `data:application/pdf;base64,${base64}` },
              },
            ],
          },
        ],
      })

      const text = response.choices[0]?.message?.content ?? ''
      if (text.length > 100) {
        return NextResponse.json({ text, method: 'pdf-vision' })
      }

      // Fallback: return raw hint
      return NextResponse.json({
        text: `[Document PDF : ${name}] — ${file.size} octets. Veuillez coller le texte manuellement dans la zone de saisie.`,
        method: 'pdf-fallback',
      })
    } catch {
      return NextResponse.json({
        text: `[Document PDF : ${name}] — Contenu non extractible. Copiez-collez le texte manuellement.`,
        method: 'pdf-error',
      })
    }
  }

  // ── Fichier texte brut ────────────────────────────────────────────────────
  try {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
    if (text.length < 50 || /[\x00-\x08\x0E-\x1F]{5,}/.test(text)) {
      // Fichier binaire non reconnu
      return NextResponse.json({
        text: `[Fichier : ${name}] — Format non supporté pour extraction automatique. Ajoutez les notes manuellement.`,
        method: 'unsupported',
      })
    }
    return NextResponse.json({ text: text.slice(0, 10000), method: 'text' })
  } catch {
    return NextResponse.json({ error: 'Format de fichier non reconnu.' }, { status: 400 })
  }
}
