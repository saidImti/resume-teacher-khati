import { cn } from '@/lib/utils'
import type { ResumeStatus } from '@/types'

const STATUS_CONFIG: Record<ResumeStatus, { label: string; className: string; dot: string }> = {
  draft:    { label: 'Brouillon', className: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400'    },
  reviewed: { label: 'Révisé',   className: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500'    },
  approved: { label: 'Approuvé', className: 'bg-green-100 text-green-700',  dot: 'bg-green-500'   },
  sent:     { label: 'Envoyé',   className: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500'  },
}

interface StatusBadgeProps {
  status: ResumeStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        config.className,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}
