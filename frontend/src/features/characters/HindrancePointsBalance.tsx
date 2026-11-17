import { useFormContext, useWatch } from 'react-hook-form'

import { useLanguage } from '@/lib/i18n-context'

import type { CharacterFormValues } from './character-form'

const maxHindrancePoints = 4

const pointUses = [
  {
    step: 'Attributes',
    cost: '1 point raises an attribute one die type',
    field: 'attribute_hindrance_points_spent',
  },
  {
    step: 'Skills',
    cost: '1 point buys an extra skill point',
    field: 'skill_hindrance_points_spent',
  },
  {
    step: 'Edges',
    cost: '2 points buy one edge',
    field: 'edge_hindrance_points_spent',
  },
] as const

type HindrancePointsBalanceProps = {
  earnedPoints?: number
}

export function HindrancePointsBalance({
  earnedPoints: earnedPointsOverride,
}: HindrancePointsBalanceProps = {}) {
  const { t } = useLanguage()
  const form = useFormContext<CharacterFormValues>()
  const earnedPointsFromForm =
    useWatch({ control: form.control, name: 'hindrance_points_earned' }) ?? 0
  const spentPoints = useWatch({ control: form.control, name: 'hindrance_points_spent' }) ?? 0
  const spentByStep = useWatch({
    control: form.control,
    name: pointUses.map((use) => use.field),
  })
  const earnedPoints = Math.min(earnedPointsOverride ?? earnedPointsFromForm, maxHindrancePoints)
  const availablePoints = Math.max(earnedPoints - spentPoints, 0)
  const pointsSummary = `${availablePoints} / ${maxHindrancePoints}`
  const pointsProgress = (availablePoints / maxHindrancePoints) * 100

  return (
    <div
      data-slot="hindrance-points-balance"
      role="status"
      aria-live="polite"
      className="border-border bg-muted/20 grid max-w-xl gap-3 rounded-lg border p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-foreground text-sm font-medium">{t('Hindrance points')}</p>
          <p className="text-muted-foreground text-xs leading-5">
            {t(
              'Earned from your Hindrances and shared by the Attributes, Skills, and Edges steps. Points spent on one step are no longer available for the others.',
            )}
          </p>
        </div>
        <p className="text-foreground shrink-0 text-lg font-semibold" data-slot="hindrance-points">
          {pointsSummary}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={t('Hindrance points available')}
        aria-valuemin={0}
        aria-valuemax={maxHindrancePoints}
        aria-valuenow={availablePoints}
        aria-valuetext={`${pointsSummary} ${t('hindrance points available')}`}
        className="bg-muted h-2 overflow-hidden rounded-full"
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pointsProgress}%` }}
        />
      </div>
      <ul aria-label={t('Ways to spend hindrance points')} className="grid gap-1.5 text-xs">
        {pointUses.map((use, index) => (
          <li key={use.step} className="flex items-baseline justify-between gap-3">
            <span>
              <span className="text-foreground font-medium">{t(use.step)}</span>
              <span className="text-muted-foreground"> · {t(use.cost)}</span>
            </span>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {t('spent')}: {spentByStep[index] ?? 0}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
