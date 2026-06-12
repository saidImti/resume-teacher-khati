import { cn } from '@/lib/utils'

interface FadeInProps {
  children: React.ReactNode
  className?: string
  /** Délai en ms (pour les listes avec stagger) */
  delay?: number
  /** Direction d'apparition */
  from?: 'bottom' | 'top' | 'left' | 'right' | 'none'
}

/**
 * Composant d'animation d'entrée pure CSS.
 * Aucune dépendance JS — utilise les keyframes définis dans globals.css.
 *
 * Usage simple :
 *   <FadeIn><MonComposant /></FadeIn>
 *
 * Usage avec stagger (liste) :
 *   {items.map((item, i) => (
 *     <FadeIn key={item.id} delay={i * 60}>
 *       <ItemCard item={item} />
 *     </FadeIn>
 *   ))}
 */
export function FadeIn({ children, className, delay = 0, from = 'bottom' }: FadeInProps) {
  const animClass = {
    bottom: 'animate-fade-in-up',
    top:    'animate-fade-in-down',
    left:   'animate-fade-in-right',
    right:  'animate-fade-in-left',
    none:   'animate-fade-in',
  }[from]

  return (
    <div
      className={cn(animClass, className)}
      style={delay > 0 ? { animationDelay: `${delay}ms`, animationFillMode: 'both' } : undefined}
    >
      {children}
    </div>
  )
}
