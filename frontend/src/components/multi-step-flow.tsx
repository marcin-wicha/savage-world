import * as React from 'react'
import { Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type MultiStepFlowStep = {
  id: string
  title: string
  content: React.ReactNode
}

type MultiStepFlowProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  steps: MultiStepFlowStep[]
  currentStep?: number
  defaultStep?: number
  onStepChange?: (step: number) => void
  onComplete?: () => void
  onBack?: () => void
  canAdvance?: (step: MultiStepFlowStep, index: number) => boolean
  backLabel?: string
  nextLabel?: string
  completeLabel?: string
  headerLabel?: string
  headerClassName?: string
  contentClassName?: string
  footerClassName?: string
}

function clampStep(step: number, total: number) {
  return Math.min(Math.max(step, 0), Math.max(total - 1, 0))
}

function MultiStepFlow({
  steps,
  currentStep,
  defaultStep = 0,
  onStepChange,
  onComplete,
  onBack,
  canAdvance,
  backLabel = 'Back',
  nextLabel = 'Next',
  completeLabel = 'Complete',
  headerLabel = 'Progress',
  headerClassName,
  contentClassName,
  footerClassName,
  className,
  ...props
}: MultiStepFlowProps) {
  const [uncontrolledStep, setUncontrolledStep] = React.useState(defaultStep)
  const activeStep = clampStep(currentStep ?? uncontrolledStep, steps.length)
  const step = steps[activeStep]
  const isFirst = activeStep === 0
  const isLast = activeStep === steps.length - 1
  const nextAllowed = step ? (canAdvance?.(step, activeStep) ?? true) : false

  if (!step) return null

  const goTo = (next: number) => {
    const target = clampStep(next, steps.length)

    if (target === activeStep) return

    if (currentStep === undefined) setUncontrolledStep(target)
    onStepChange?.(target)
  }

  return (
    <div data-slot="multi-step-flow" className={cn('flex flex-col', className)} {...props}>
      <nav
        aria-label={headerLabel}
        data-slot="multi-step-flow-header"
        className={cn(headerClassName)}
      >
        <ol className="grid gap-3 sm:flex sm:items-center">
          {steps.map((item, index) => {
            const isComplete = index < activeStep
            const isCurrent = index === activeStep
            const isFuture = index > activeStep

            return (
              <li
                key={item.id}
                className="flex min-w-0 items-center gap-3 sm:flex-1 sm:last:flex-none"
              >
                <button
                  type="button"
                  onClick={() => goTo(index)}
                  disabled={isFuture}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'group focus-visible:ring-ring/50 flex min-w-0 items-center gap-3 rounded-lg text-left transition-colors outline-none focus-visible:ring-3 disabled:cursor-default',
                    !isFuture && 'cursor-pointer',
                  )}
                >
                  {isComplete ? <span className="sr-only">Completed: </span> : null}
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors',
                      isComplete && 'border-primary bg-primary text-primary-foreground',
                      isCurrent && 'border-primary bg-background text-foreground',
                      isFuture && 'border-border bg-background text-muted-foreground',
                    )}
                  >
                    {isComplete ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block text-sm',
                        isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground',
                      )}
                    >
                      {item.title}
                    </span>
                  </span>
                </button>
                {index < steps.length - 1 ? (
                  <span aria-hidden="true" className="bg-border hidden h-px flex-1 sm:block" />
                ) : null}
              </li>
            )
          })}
        </ol>
      </nav>
      <p className="sr-only" aria-live="polite">
        Step {activeStep + 1} of {steps.length}: {step.title}
      </p>
      <div data-slot="multi-step-flow-content" className={cn('mt-6', contentClassName)}>
        {step.content}
      </div>
      <div
        data-slot="multi-step-flow-footer"
        className={cn(
          'mt-6 flex items-center justify-between gap-3 border-t pt-4',
          footerClassName,
        )}
      >
        <Button
          variant="ghost"
          onClick={() => {
            if (isFirst) {
              onBack?.()
            } else {
              goTo(activeStep - 1)
            }
          }}
          disabled={isFirst && !onBack}
        >
          {backLabel}
        </Button>
        <Button
          onClick={() => {
            if (isLast) {
              onComplete?.()
            } else {
              goTo(activeStep + 1)
            }
          }}
          disabled={!nextAllowed}
        >
          {isLast ? completeLabel : nextLabel}
        </Button>
      </div>
    </div>
  )
}

export { MultiStepFlow, type MultiStepFlowProps, type MultiStepFlowStep }
