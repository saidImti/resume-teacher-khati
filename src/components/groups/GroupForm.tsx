'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import type { Level, Site, AcademicYear } from '@/types'

// ─── Schéma Zod ──────────────────────────────────────────────────────────────

const GroupFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Max 100 caractères'),
  site_id: z.string().uuid('Site requis'),
  level_id: z.string().uuid('Niveau requis'),
  academic_year_id: z.string().uuid('Année scolaire requise'),
  day_of_week: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().int().min(0).max(6).nullable()
  ),
  time_slot: z.string().max(20).nullable().optional(),
  max_students: z.preprocess(
    (v) => (v === '' ? undefined : Number(v)),
    z.number().int().min(1, 'Min 1').max(50, 'Max 50').optional()
  ),
})

export type GroupFormValues = z.infer<typeof GroupFormSchema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface GroupFormProps {
  sites: Site[]
  levels: Level[]
  academicYears: AcademicYear[]
  defaultValues?: Partial<GroupFormValues>
  groupId?: string   // fourni en mode édition
  mode: 'create' | 'edit'
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
]

// ─── Composant ────────────────────────────────────────────────────────────────

export function GroupForm({
  sites,
  levels,
  academicYears,
  defaultValues,
  groupId,
  mode,
}: GroupFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(GroupFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      site_id: defaultValues?.site_id ?? '',
      level_id: defaultValues?.level_id ?? '',
      academic_year_id: defaultValues?.academic_year_id ?? (academicYears.find((y) => y.is_active)?.id ?? ''),
      day_of_week: defaultValues?.day_of_week ?? null,
      time_slot: defaultValues?.time_slot ?? '',
      max_students: defaultValues?.max_students ?? 12,
    },
  })

  async function onSubmit(values: GroupFormValues) {
    setIsSubmitting(true)
    try {
      const url = mode === 'create' ? '/api/groups' : `/api/groups/${groupId}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Erreur lors de la sauvegarde')
        return
      }

      toast.success(mode === 'create' ? 'Groupe créé ✓' : 'Groupe mis à jour ✓')
      router.push('/settings/groups')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur réseau')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">

      {/* Nom */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">
          Nom du groupe <span className="text-destructive">*</span>
        </label>
        <input
          {...register('name')}
          placeholder="ex: Kids A, Juniors Mercredi..."
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Site */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">
          Site <span className="text-destructive">*</span>
        </label>
        <select
          {...register('site_id')}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
        >
          <option value="">-- Choisir un site --</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
        {errors.site_id && (
          <p className="text-xs text-destructive">{errors.site_id.message}</p>
        )}
      </div>

      {/* Niveau */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">
          Niveau <span className="text-destructive">*</span>
        </label>
        <select
          {...register('level_id')}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
        >
          <option value="">-- Choisir un niveau --</option>
          {levels.map((level) => (
            <option key={level.id} value={level.id}>
              {level.emoji} {level.name} ({level.age_min}-{level.age_max} ans)
            </option>
          ))}
        </select>
        {errors.level_id && (
          <p className="text-xs text-destructive">{errors.level_id.message}</p>
        )}
      </div>

      {/* Année scolaire */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">
          Année scolaire <span className="text-destructive">*</span>
        </label>
        <select
          {...register('academic_year_id')}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
        >
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name} {year.is_active ? '(en cours)' : ''}
            </option>
          ))}
        </select>
        {errors.academic_year_id && (
          <p className="text-xs text-destructive">{errors.academic_year_id.message}</p>
        )}
      </div>

      {/* Jour + Horaire sur la même ligne */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Jour</label>
          <select
            {...register('day_of_week')}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          >
            <option value="">-- Aucun --</option>
            {DAYS_OF_WEEK.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Horaire</label>
          <input
            {...register('time_slot')}
            placeholder="ex: 16h00-17h00"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>
      </div>

      {/* Nombre max d'élèves */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">
          Nombre max d&apos;élèves
        </label>
        <input
          {...register('max_students')}
          type="number"
          min={1}
          max={50}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
        />
        {errors.max_students && (
          <p className="text-xs text-destructive">{errors.max_students.message}</p>
        )}
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
            : mode === 'create' ? 'Créer le groupe' : 'Enregistrer'}
        </button>

        <button
          type="button"
          onClick={() => router.push('/settings/groups')}
          className="px-5 py-2 rounded-lg border border-input text-sm font-medium
            hover:bg-accent transition"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
