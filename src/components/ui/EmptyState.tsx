import { cn } from '@/lib/utils'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

interface EmptyStateAction {
  label: string
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary'
}

interface EmptyStateProps {
  /** Illustration SVG intégrée — choisir parmi les presets ou passer 'custom' */
  illustration?: 'groups' | 'sites' | 'resumes' | 'padlets' | 'archives' | 'search' | 'users' | 'custom'
  /** Nœud SVG custom si illustration = 'custom' */
  customIllustration?: React.ReactNode
  title: string
  description?: string
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

// ─── Illustrations SVG ────────────────────────────────────────────────────────

function IllustrationGroups() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full" aria-hidden="true">
      <circle cx="40" cy="40" r="36" fill="hsl(var(--primary)/0.08)" />
      <rect x="22" y="30" width="16" height="20" rx="3" fill="hsl(var(--primary)/0.15)" stroke="hsl(var(--primary)/0.4)" strokeWidth="1.5"/>
      <rect x="42" y="30" width="16" height="20" rx="3" fill="hsl(var(--primary)/0.15)" stroke="hsl(var(--primary)/0.4)" strokeWidth="1.5"/>
      <circle cx="30" cy="24" r="4" fill="hsl(var(--primary)/0.25)" stroke="hsl(var(--primary)/0.5)" strokeWidth="1.5"/>
      <circle cx="50" cy="24" r="4" fill="hsl(var(--primary)/0.25)" stroke="hsl(var(--primary)/0.5)" strokeWidth="1.5"/>
      <line x1="40" y1="25" x2="40" y2="30" stroke="hsl(var(--primary)/0.3)" strokeWidth="1.5" strokeDasharray="2 2"/>
      <circle cx="40" cy="22" r="3" fill="hsl(var(--primary)/0.4)" stroke="hsl(var(--primary)/0.7)" strokeWidth="1.5"/>
      <path d="M37 47 Q40 52 43 47" stroke="hsl(var(--primary)/0.5)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

function IllustrationSites() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full" aria-hidden="true">
      <circle cx="40" cy="40" r="36" fill="hsl(var(--primary)/0.08)" />
      <rect x="18" y="36" width="20" height="22" rx="2" fill="hsl(var(--primary)/0.15)" stroke="hsl(var(--primary)/0.4)" strokeWidth="1.5"/>
      <rect x="42" y="30" width="20" height="28" rx="2" fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary)/0.5)" strokeWidth="1.5"/>
      <path d="M26 36 L26 28 L34 24 L34 36" fill="hsl(var(--primary)/0.1)" stroke="hsl(var(--primary)/0.4)" strokeWidth="1.5"/>
      <path d="M42 30 L42 24 L52 20 L52 30" fill="hsl(var(--primary)/0.1)" stroke="hsl(var(--primary)/0.4)" strokeWidth="1.5"/>
      <rect x="24" y="42" width="4" height="5" rx="0.5" fill="hsl(var(--primary)/0.3)"/>
      <rect x="48" y="38" width="5" height="6" rx="0.5" fill="hsl(var(--primary)/0.3)"/>
      <rect x="55" y="38" width="5" height="6" rx="0.5" fill="hsl(var(--primary)/0.3)"/>
    </svg>
  )
}

function IllustrationResumes() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full" aria-hidden="true">
      <circle cx="40" cy="40" r="36" fill="hsl(var(--primary)/0.08)" />
      <rect x="22" y="20" width="28" height="36" rx="3" fill="hsl(var(--primary)/0.12)" stroke="hsl(var(--primary)/0.35)" strokeWidth="1.5"/>
      <rect x="27" y="27" width="18" height="1.5" rx="0.75" fill="hsl(var(--primary)/0.4)"/>
      <rect x="27" y="31" width="14" height="1.5" rx="0.75" fill="hsl(var(--primary)/0.25)"/>
      <rect x="27" y="35" width="16" height="1.5" rx="0.75" fill="hsl(var(--primary)/0.25)"/>
      <rect x="27" y="39" width="12" height="1.5" rx="0.75" fill="hsl(var(--primary)/0.25)"/>
      <rect x="27" y="43" width="15" height="1.5" rx="0.75" fill="hsl(var(--primary)/0.25)"/>
      <circle cx="54" cy="52" r="9" fill="hsl(var(--primary))" opacity="0.85"/>
      <path d="M50.5 52 L53 54.5 L57.5 49.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IllustrationPadlets() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full" aria-hidden="true">
      <circle cx="40" cy="40" r="36" fill="hsl(var(--primary)/0.08)" />
      <rect x="18" y="24" width="18" height="14" rx="2.5" fill="hsl(var(--primary)/0.15)" stroke="hsl(var(--primary)/0.4)" strokeWidth="1.5"/>
      <rect x="40" y="24" width="22" height="9" rx="2.5" fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary)/0.5)" strokeWidth="1.5"/>
      <rect x="18" y="42" width="22" height="14" rx="2.5" fill="hsl(var(--primary)/0.12)" stroke="hsl(var(--primary)/0.35)" strokeWidth="1.5"/>
      <rect x="44" y="38" width="18" height="18" rx="2.5" fill="hsl(var(--primary)/0.18)" stroke="hsl(var(--primary)/0.45)" strokeWidth="1.5"/>
      <circle cx="40" cy="37" r="2" fill="hsl(var(--primary)/0.5)"/>
    </svg>
  )
}

function IllustrationArchives() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full" aria-hidden="true">
      <circle cx="40" cy="40" r="36" fill="hsl(var(--primary)/0.08)" />
      <rect x="18" y="26" width="44" height="8" rx="2" fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary)/0.45)" strokeWidth="1.5"/>
      <rect x="18" y="38" width="44" height="18" rx="2" fill="hsl(var(--primary)/0.1)" stroke="hsl(var(--primary)/0.3)" strokeWidth="1.5"/>
      <rect x="24" y="42" width="12" height="2" rx="1" fill="hsl(var(--primary)/0.35)"/>
      <rect x="24" y="47" width="20" height="2" rx="1" fill="hsl(var(--primary)/0.25)"/>
      <rect x="24" y="52" width="16" height="2" rx="1" fill="hsl(var(--primary)/0.2)"/>
      <circle cx="55" cy="30" r="2.5" fill="hsl(var(--primary)/0.5)"/>
    </svg>
  )
}

function IllustrationSearch() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full" aria-hidden="true">
      <circle cx="40" cy="40" r="36" fill="hsl(var(--primary)/0.08)" />
      <circle cx="36" cy="36" r="14" stroke="hsl(var(--primary)/0.45)" strokeWidth="2"/>
      <line x1="46" y1="46" x2="58" y2="58" stroke="hsl(var(--primary)/0.45)" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M30 36 Q36 28 42 36" stroke="hsl(var(--primary)/0.3)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

function IllustrationUsers() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full" aria-hidden="true">
      <circle cx="40" cy="40" r="36" fill="hsl(var(--primary)/0.08)" />
      <circle cx="32" cy="30" r="7" fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary)/0.45)" strokeWidth="1.5"/>
      <path d="M16 56 C16 46 24 40 32 40 C40 40 48 46 48 56" stroke="hsl(var(--primary)/0.4)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="52" cy="32" r="5" fill="hsl(var(--primary)/0.15)" stroke="hsl(var(--primary)/0.35)" strokeWidth="1.5"/>
      <path d="M42 52 C42 46 46 42 52 42 C58 42 62 46 62 52" stroke="hsl(var(--primary)/0.3)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

const ILLUSTRATIONS: Record<string, React.ReactNode> = {
  groups:   <IllustrationGroups />,
  sites:    <IllustrationSites />,
  resumes:  <IllustrationResumes />,
  padlets:  <IllustrationPadlets />,
  archives: <IllustrationArchives />,
  search:   <IllustrationSearch />,
  users:    <IllustrationUsers />,
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function EmptyState({
  illustration = 'resumes',
  customIllustration,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const sizeConfig = {
    sm: { wrapper: 'py-10', icon: 'h-14 w-14', title: 'text-base', desc: 'text-xs' },
    md: { wrapper: 'py-16', icon: 'h-20 w-20', title: 'text-lg',   desc: 'text-sm' },
    lg: { wrapper: 'py-20', icon: 'h-24 w-24', title: 'text-xl',   desc: 'text-sm' },
  }[size]

  const illus = illustration === 'custom' ? customIllustration : ILLUSTRATIONS[illustration]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center animate-fade-in-up',
        sizeConfig.wrapper,
        className
      )}
    >
      {/* Illustration */}
      <div className={cn('mb-5', sizeConfig.icon)}>
        {illus}
      </div>

      {/* Texte */}
      <h3 className={cn('font-semibold text-foreground', sizeConfig.title)}>
        {title}
      </h3>
      {description && (
        <p className={cn('mt-2 text-muted-foreground max-w-xs leading-relaxed', sizeConfig.desc)}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
          {action && (
            action.href ? (
              <Link
                href={action.href}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors active:scale-[0.97]',
                  action.variant === 'secondary'
                    ? 'border border-border hover:bg-muted text-foreground'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                {action.label}
              </Link>
            ) : (
              <button
                onClick={action.onClick}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors active:scale-[0.97]',
                  action.variant === 'secondary'
                    ? 'border border-border hover:bg-muted text-foreground'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                {action.label}
              </button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted text-foreground transition-colors active:scale-[0.97]"
              >
                {secondaryAction.label}
              </Link>
            ) : (
              <button
                onClick={secondaryAction.onClick}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted text-foreground transition-colors active:scale-[0.97]"
              >
                {secondaryAction.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}
