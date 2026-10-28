import { useFormContext, useWatch } from 'react-hook-form'

import { useLanguage } from '@/lib/i18n-context'

import type { CharacterFormValues } from './character-form'

const maxHindrancePoints = 4

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
            {t('Remaining from selected Hindrances for later creation steps.')}
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
    </div>
  )
}
