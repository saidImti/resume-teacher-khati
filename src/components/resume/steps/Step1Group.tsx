'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Users, Calendar, ChevronDown, ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Group, Level, Site } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LevelBadge } from '@/components/ui/LevelBadge'
import { cn } from '@/lib/utils'

// ─── Schema ──────────────────────────────────────────────────────────────────

const Step1Schema = z.object({
  groupId: z.string().uuid('Veuillez sélectionner un groupe'),
  sessionDate: z.string().min(1, 'Date du cours requise'),
})

export type Step1Data = z.infer<typeof Step1Schema>

// ─── Types ───────────────────────────────────────────────────────────────────

interface GroupWithLevel extends Group {
  level?: Level
}

interface GroupsBySite {
  site: Site
  groups: GroupWithLevel[]
}

interface Step1GroupProps {
  groupsBySite: GroupsBySite[]
  defaultGroupId?: string
  onNext: (data: Step1Data) => void
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function Step1Group({ groupsBySite, defaultGroupId, onNext }: Step1GroupProps) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(Step1Schema),
    defaultValues: {
      groupId: defaultGroupId ?? '',
      sessionDate: today ?? '',
    },
  })

  const selectedGroupId = watch('groupId')

  // Trouver le groupe sélectionné
  const selectedGroup = groupsBySite
    .flatMap((s) => s.groups)
    .find((g) => g.id === selectedGroupId)

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Sélectionner le groupe</h2>
        <p className="text-sm text-muted-foreground">
          Choisissez le groupe et la date du cours.
        </p>
      </div>

      {/* Sélection du groupe */}
      <div className="space-y-2">
        <Label>Groupe <span className="text-destructive">*</span></Label>

        {groupsBySite.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Aucun groupe trouvé. Créez d'abord un groupe depuis le dashboard.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupsBySite.map(({ site, groups }) => (
              <div key={site.id}>
                {/* Site header */}
                <div
                  className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide"
                >
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: site.color }}
                  />
                  {site.name}
                </div>

                {/* Groupes du site */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setValue('groupId', group.id, { shouldValidate: true })}
                      className={cn(
                        'text-left rounded-lg border p-3 transition-all duration-150',
                        selectedGroupId === group.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:border-primary/40 bg-card hover:bg-muted/30'
                      )}
                    >
                      <div className="font-medium text-sm">{group.name}</div>
                      {group.level && (
                        <div className="mt-1">
                          <LevelBadge level={group.level} size="sm" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input caché pour react-hook-form */}
        <input type="hidden" {...register('groupId')} />
        {errors.groupId && (
          <p className="text-xs text-destructive mt-1">{errors.groupId.message}</p>
        )}
      </div>

      {/* Groupe sélectionné — résumé */}
      {selectedGroup && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{selectedGroup.name}</p>
            {selectedGroup.level && (
              <LevelBadge level={selectedGroup.level} size="sm" />
            )}
          </div>
        </div>
      )}

      {/* Date du cours */}
      <div className="space-y-2">
        <Label htmlFor="sessionDate">
          Date du cours <span className="text-destructive">*</span>
        </Label>
        <Input
          id="sessionDate"
          type="date"
          leftIcon={<Calendar className="h-4 w-4" />}
          error={errors.sessionDate?.message}
          {...register('sessionDate')}
        />
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/dashboard')}
          className="text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Annuler
        </Button>
        <Button type="submit" disabled={groupsBySite.length === 0}>
          Continuer
          <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
        </Button>
      </div>
    </form>
  )
}
