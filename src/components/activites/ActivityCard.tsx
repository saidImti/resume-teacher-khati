import Link from 'next/link'
import type { Activity } from '@/types'

// ─── Constantes ───────────────────────────────────────────────────────────────

export const SKILL_LABELS: Record<string, { label: string; color: string }> = {
  speaking:   { label: 'Speaking',   color: 'bg-orange-50 text-orange-600' },
  listening:  { label: 'Listening',  color: 'bg-sky-50 text-sky-600' },
  reading:    { label: 'Reading',    color: 'bg-violet-50 text-violet-600' },
  writing:    { label: 'Writing',    color: 'bg-emerald-50 text-emerald-600' },
  phonics:    { label: 'Phonics',    color: 'bg-pink-50 text-pink-600' },
  vocabulary: { label: 'Vocabulary', color: 'bg-amber-50 text-amber-700' },
  grammar:    { label: 'Grammar',    color: 'bg-blue-50 text-blue-600' },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ActivityCardProps {
  activity: Activity
  compact?: boolean
  onAdd?: (activity: Activity) => void
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function ActivityCard({ activity, compact, onAdd }: ActivityCardProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border
        bg-card hover:bg-accent/30 transition group">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-base shrink-0">{activity.emoji ?? '🎯'}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{activity.name}</p>
            <div className="flex gap-1 flex-wrap mt-0.5">
              {activity.skills.slice(0, 2).map((s) => {
                const meta = SKILL_LABELS[s]
                if (!meta) return null
                return (
                  <span key={s} className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${meta.color}`}>
                    {meta.label}
                  </span>
                )
              })}
              {activity.duration_min && (
                <span className="text-xs text-muted-foreground">
                  {activity.duration_min} min
                </span>
              )}
            </div>
          </div>
        </div>
        {onAdd && (
          <button
            onClick={() => onAdd(activity)}
            className="ml-2 p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20
              transition text-xs font-bold shrink-0"
            title="Ajouter au résumé"
          >
            +
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card hover:border-primary/30
      hover:shadow-sm transition group overflow-hidden">
      {/* Icône + nom */}
      <div className="flex items-start gap-3 p-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
          {activity.emoji ?? '🎯'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
            {activity.name}
          </p>
          {activity.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {activity.description}
            </p>
          )}
        </div>
      </div>

      {/* Compétences */}
      <div className="px-4 pb-3 flex flex-wrap gap-1">
        {activity.skills.map((s) => {
          const meta = SKILL_LABELS[s]
          if (!meta) return null
          return (
            <span key={s} className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
              {meta.label}
            </span>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50 bg-accent/20">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {activity.duration_min && <span>⏱ {activity.duration_min} min</span>}
          {activity.usage_count > 0 && <span>✓ {activity.usage_count}×</span>}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/activites/${activity.id}/edit`}
            className="text-xs text-muted-foreground hover:text-foreground transition px-2 py-1 rounded hover:bg-accent"
          >
            ✏️
          </Link>
          {onAdd && (
            <button
              onClick={() => onAdd(activity)}
              className="text-xs font-medium px-3 py-1 rounded-lg bg-primary text-primary-foreground
                hover:bg-primary/90 transition"
            >
              Ajouter
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
