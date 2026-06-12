import { cn } from '@/lib/utils'
import type { Level, LevelSlug } from '@/types'

const LEVEL_STYLES: Record<LevelSlug, { bg: string; text: string; border: string }> = {
  preschoolers: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  kids:         { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200'   },
  juniors:      { bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-200'    },
  tweens:       { bg: 'bg-violet-100',  text: 'text-violet-700',  border: 'border-violet-200'  },
  teenagers:    { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-200'     },
}

interface LevelBadgeProps {
  level: Pick<Level, 'name' | 'slug' | 'emoji'>
  size?: 'sm' | 'md'
  className?: string
}

export function LevelBadge({ level, size = 'md', className }: LevelBadgeProps) {
  const styles = LEVEL_STYLES[level.slug as LevelSlug] ?? LEVEL_STYLES.kids

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium border',
        styles.bg, styles.text, styles.border,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      <span>{level.emoji}</span>
      <span>{level.name}</span>
    </span>
  )
}
