'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface WizardStep {
  id: number
  label: string
  icon: string
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 1, label: 'Groupe', icon: '👥' },
  { id: 2, label: 'Contenu', icon: '📝' },
  { id: 3, label: 'Génération', icon: '✨' },
  { id: 4, label: 'Révision', icon: '📄' },
  { id: 5, label: 'WhatsApp', icon: '📱' },
]

// Step 3 (Génération) est automatique — ne pas autoriser le clic direct dessus
const CLICKABLE_STEPS = new Set([1, 2, 4, 5])

interface WizardProgressProps {
  currentStep: number
  maxReachedStep?: number
  onStepClick?: (step: number) => void
}

export function WizardProgress({ currentStep, maxReachedStep = 1, onStepClick }: WizardProgressProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {WIZARD_STEPS.map((step, index) => {
        const isCompleted = step.id < currentStep
        const isActive = step.id === currentStep
        const isUpcoming = step.id > currentStep
        const isClickable =
          CLICKABLE_STEPS.has(step.id) &&
          step.id !== currentStep &&
          step.id <= maxReachedStep &&
          !!onStepClick

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Cercle de l'étape */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick?.(step.id)}
                title={isClickable ? `Aller à ${step.label}` : undefined}
                className={cn(
                  'h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isActive && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  isUpcoming && 'bg-muted text-muted-foreground',
                  isClickable && 'cursor-pointer hover:ring-4 hover:ring-primary/30 hover:scale-105',
                  !isClickable && 'cursor-default'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{step.icon}</span>
                )}
              </button>
              <span
                className={cn(
                  'text-xs font-medium hidden sm:block transition-colors',
                  isActive && 'text-primary',
                  isCompleted && 'text-primary',
                  isUpcoming && 'text-muted-foreground',
                  isClickable && 'underline underline-offset-2 cursor-pointer'
                )}
                onClick={() => isClickable && onStepClick?.(step.id)}
              >
                {step.label}
              </span>
            </div>

            {/* Ligne de connexion (sauf après le dernier) */}
            {index < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2 rounded-full transition-colors duration-300',
                  step.id < currentStep ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
