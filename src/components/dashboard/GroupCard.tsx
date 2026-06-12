'use client'

import Link from 'next/link'
import { Clock, Plus, ChevronRight } from 'lucide-react'
import type { Group, Level } from '@/types'
import { LevelBadge } from '@/components/ui/LevelBadge'
import { Button } from '@/components/ui/button'
import { cn, getDayName } from '@/lib/utils'

interface GroupCardProps {
  group: Group
  level?: Level
  lastSessionDate?: string | null
}

export function GroupCard({ group, level, lastSessionDate }: GroupCardProps) {
  const scheduleLabel = group.day_of_week !== null && group.time_slot
    ? `${getDayName(group.day_of_week)} · ${group.time_slot}`
    : group.day_of_week !== null
    ? getDayName(group.day_of_week)
    : null

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-border bg-card p-4',
        'hover:border-primary/40 hover:shadow-sm transition-all duration-200',
        'flex flex-col gap-3'
      )}
    >
      {/* En-tête */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
            {group.name}
          </h3>
          {level && (
            <div className="mt-1">
              <LevelBadge level={level} size="sm" />
            </div>
          )}
        </div>

        {/* Indicateur niveau (couleur) */}
        {level && (
          <div
            className="h-2 w-2 rounded-full shrink-0 mt-1"
            style={{ backgroundColor: level.color }}
          />
        )}
      </div>

      {/* Infos secondaires */}
      <div className="space-y-1">
        {scheduleLabel && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            <span className="truncate">{scheduleLabel}</span>
          </div>
        )}
        {lastSessionDate && (
          <div className="text-xs text-muted-foreground">
            Dernier cours : {new Date(lastSessionDate).toLocaleDateString('fr-FR')}
          </div>
        )}
        {!lastSessionDate && !scheduleLabel && (
          <div className="text-xs text-muted-foreground italic">
            Aucun cours enregistré
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <Link href={`/resumes/new?groupId=${group.id}`} className="flex-1">
          <Button size="sm" className="w-full text-xs">
            <Plus className="h-3.5 w-3.5" />
            Nouveau cours
          </Button>
        </Link>

        <Link href={`/archives?groupId=${group.id}`}>
          <Button size="sm" variant="outline" className="shrink-0">
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
