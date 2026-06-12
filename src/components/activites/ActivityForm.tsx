'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import type { Level } from '@/types'

// ─── Schéma Zod ───────────────────────────────────────────────────────────────

const SKILLS = ['speaking', 'listening', 'reading', 'writing', 'phonics', 'vocabulary', 'grammar'] as const
type SkillType = typeof SKILLS[number]

const ActivityFormSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(150),
  description: z.string().max(500).optional(),
  level_ids: z.array(z.string().uuid()).min(1, 'Sélectionner au moins un niveau'),
  skills: z.array(z.enum(SKILLS)).min(1, 'Sélectionner au moins une compétence'),
  tags: z.string().optional(), // saisie libre, on split par virgule
  duration_min: z.preprocess(
    (v) => (v === '' ? null : Number(v)),
    z.number().int().min(1).max(120).nullable().optional()
  ),
  emoji: z.string().max(10).optional(),
})

export type ActivityFormValues = z.infer<typeof ActivityFormSchema>

// ─── Constantes ───────────────────────────────────────────────────────────────

const SKILL_LABELS: Record<SkillType, string> = {
  speaking: '🗣 Speaking',
  listening: '👂 Listening',
  reading: '📖 Reading',
  writing: '✍️ Writing',
  phonics: '🔤 Phonics',
  vocabulary: '📚 Vocabulary',
  grammar: '📐 Grammar',
}

const EMOJI_SUGGESTIONS = ['🎯', '🎮', '🎲', '🃏', '🎭', '🎨', '🏆', '⭐', '🌟', '💡', '🔊', '📝', '🗺️', '🎵']

// ─── Props ────────────────────────────────────────────────────────────────────

interface ActivityFormProps {
  levels: Level[]
  defaultValues?: Partial<ActivityFormValues>
  activityId?: string
  mode: 'create' | 'edit'
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function ActivityForm({ levels, defaultValues, activityId, mode }: ActivityFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(ActivityFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      level_ids: defaultValues?.level_ids ?? [],
      skills: defaultValues?.skills ?? [],
      tags: defaultValues?.tags ?? '',
      duration_min: defaultValues?.duration_min ?? undefined,
      emoji: defaultValues?.emoji ?? '🎯',
    },
  })

  const watchedSkills = watch('skills') ?? []
  const watchedLevelIds = watch('level_ids') ?? []
  const watchedEmoji = watch('emoji')

  function toggleSkill(skill: SkillType) {
    if (watchedSkills.includes(skill)) {
      setValue('skills', watchedSkills.filter((s) => s !== skill), { shouldValidate: true })
    } else {
      setValue('skills', [...watchedSkills, skill], { shouldValidate: true })
    }
  }

  function toggleLevel(id: string) {
    if (watchedLevelIds.includes(id)) {
      setValue('level_ids', watchedLevelIds.filter((l) => l !== id), { shouldValidate: true })
    } else {
      setValue('level_ids', [...watchedLevelIds, id], { shouldValidate: true })
    }
  }

  async function onSubmit(values: ActivityFormValues) {
    setIsSubmitting(true)
    try {
      const payload = {
        ...values,
        tags: values.tags
          ? values.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
      }

      const url = mode === 'create' ? '/api/activities' : `/api/activities/${activityId}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erreur lors de la sauvegarde')
        return
      }

      toast.success(mode === 'create' ? 'Activité créée ✓' : 'Activité mise à jour ✓')
      router.push('/activites')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">

      {/* Emoji + Nom sur la même ligne */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">
          Nom de l&apos;activité <span className="text-destructive">*</span>
        </label>
        <div className="flex gap-2">
          <div className="relative">
            <input
              {...register('emoji')}
              className="w-14 text-center px-1 py-2 rounded-lg border border-input bg-background text-xl
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              maxLength={4}
              placeholder="🎯"
            />
          </div>
          <input
            {...register('name')}
            placeholder="ex: Simon Says, Story Retelling..."
            className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>
        {/* Suggestions emojis */}
        <div className="flex gap-1 flex-wrap">
          {EMOJI_SUGGESTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setValue('emoji', e)}
              className={`text-sm p-1 rounded transition ${
                watchedEmoji === e ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-accent'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">Description</label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Décrivez brièvement l'activité..."
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
        />
      </div>

      {/* Niveaux */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Niveaux <span className="text-destructive">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {levels.map((level) => (
            <button
              key={level.id}
              type="button"
              onClick={() => toggleLevel(level.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                watchedLevelIds.includes(level.id)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-muted-foreground hover:text-foreground'
              }`}
            >
              {level.emoji} {level.name}
            </button>
          ))}
        </div>
        {errors.level_ids && <p className="text-xs text-destructive">{errors.level_ids.message}</p>}
      </div>

      {/* Compétences */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Compétences travaillées <span className="text-destructive">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => toggleSkill(skill)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                watchedSkills.includes(skill)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-muted-foreground hover:text-foreground'
              }`}
            >
              {SKILL_LABELS[skill]}
            </button>
          ))}
        </div>
        {errors.skills && <p className="text-xs text-destructive">{errors.skills.message}</p>}
      </div>

      {/* Durée + Tags */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Durée (minutes)</label>
          <input
            {...register('duration_min')}
            type="number"
            min={1}
            max={120}
            placeholder="15"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Tags <span className="text-xs text-muted-foreground">(séparés par virgule)</span>
          </label>
          <input
            {...register('tags')}
            placeholder="chansons, jeu, carte..."
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>
      </div>

      {/* Boutons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium
            hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? mode === 'create' ? 'Création...' : 'Sauvegarde...'
            : mode === 'create' ? 'Créer l\'activité' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/activites')}
          className="px-5 py-2 rounded-lg border border-input text-sm font-medium hover:bg-accent transition"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
