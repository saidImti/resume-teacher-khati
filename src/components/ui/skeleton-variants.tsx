import { cn } from '@/lib/utils'
import { CSSProperties } from 'react'

interface SkeletonProps {
  className?: string
  style?: CSSProperties
}

function SkeletonBlock({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted/60', className)}
      style={style}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <SkeletonBlock className="h-3 w-2/3" />
          <SkeletonBlock className="h-2.5 w-1/3" />
        </div>
      </div>
      <SkeletonBlock className="h-3 w-full" />
      <SkeletonBlock className="h-3 w-4/5" />
      <div className="flex gap-2 pt-1">
        <SkeletonBlock className="h-6 w-16 rounded-full" />
        <SkeletonBlock className="h-6 w-20 rounded-full" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-0 rounded-xl border border-border overflow-hidden">
      <div className="flex gap-4 px-4 py-3 bg-muted/30 border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} className="h-3" style={{ width: `${100 / cols}%` }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-border last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonBlock
              key={j}
              className="h-3"
              style={{ width: `${j === 0 ? 40 : 100 / cols}%`, opacity: Math.max(0.2, 1 - i * 0.07) }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-7 w-12" />
            <SkeletonBlock className="h-2.5 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonList count={4} />
        <SkeletonList count={4} />
      </div>
    </div>
  )
}
