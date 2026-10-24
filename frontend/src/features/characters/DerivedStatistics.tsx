import * as React from 'react'

import ArrowRightIcon from '@icons/arrow_right.svg?react'
import ShieldIcon from '@icons/shield.svg?react'
import SwordIcon from '@icons/sword.svg?react'

import { type SkillDieType } from '@/components/dice-types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type DerivedStatisticId = 'pace' | 'parry' | 'toughness'

type DerivedStatisticContribution = {
  label: string
  value: number
}

type DerivedStatistic = {
  id: DerivedStatisticId
  label: string
  value: number
  armor?: number
  description: string
  contributions: readonly DerivedStatisticContribution[]
}

type DerivedStatisticsProps = {
  statistics?: readonly DerivedStatistic[]
  vigor?: SkillDieType
  className?: string
}

const statisticIcons = {
  pace: ArrowRightIcon,
  parry: SwordIcon,
  toughness: ShieldIcon,
} satisfies Record<DerivedStatisticId, React.ComponentType<React.ComponentProps<'svg'>>>

const dieValues: Record<SkillDieType, number> = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12 }

function statisticsFor(vigor: SkillDieType): readonly DerivedStatistic[] {
  const vigorBonus = dieValues[vigor] / 2

  return [
    {
      id: 'pace',
      label: 'Pace',
      value: 6,
      description: 'Pace is the number of inches you can move during a round.',
      contributions: [{ label: 'Base Pace', value: 6 }],
    },
    {
      id: 'parry',
      label: 'Parry',
      value: 2,
      description: 'Parry is the target number an opponent must meet to hit you in melee.',
      contributions: [{ label: 'Base Parry', value: 2 }],
    },
    {
      id: 'toughness',
      label: 'Toughness',
      value: 2 + vigorBonus,
      armor: 0,
      description: 'Toughness is the target number an attack must meet to cause a wound.',
      contributions: [
        { label: 'Base Toughness', value: 2 },
        { label: `Half Vigor (${vigor})`, value: vigorBonus },
        { label: 'Armor', value: 0 },
      ],
    },
  ]
}

function formatValue(value: number) {
  return value > 0 ? `+${value}` : `${value}`
}

function StatisticTooltip({ statistic }: { statistic: DerivedStatistic }) {
  return (
    <TooltipContent
      side="bottom"
      align="center"
      className="max-w-72 items-stretch gap-3 p-3"
      data-testid={`${statistic.id}-tooltip`}
    >
      <div className="grid gap-1">
        <p className="font-medium">{statistic.label}</p>
        <p className="text-background/75 leading-5">{statistic.description}</p>
      </div>
      <div className="grid gap-1.5">
        <ul className="grid gap-1 text-xs">
          {statistic.contributions.map((contribution) => (
            <li key={contribution.label} className="flex items-center justify-between gap-4">
              <span>{contribution.label}</span>
              <span className="font-medium tabular-nums">{formatValue(contribution.value)}</span>
            </li>
          ))}
        </ul>
        {statistic.armor !== undefined ? (
          <p className="text-background/75 text-xs leading-4">
            Armor is included in the total and shown in parentheses.
          </p>
        ) : null}
      </div>
    </TooltipContent>
  )
}

export function DerivedStatistics({ statistics, vigor = 'd4', className }: DerivedStatisticsProps) {
  const statisticsToDisplay = statistics ?? statisticsFor(vigor)

  return (
    <section
      aria-label="Derived statistics"
      data-slot="derived-statistics"
      className={cn('border-border border-y', className)}
    >
      <div className="flex items-center justify-center divide-x sm:justify-start">
        {statisticsToDisplay.map((statistic) => {
          const Icon = statisticIcons[statistic.id]
          const value =
            statistic.armor === undefined
              ? `${statistic.value}`
              : `${statistic.value}(${statistic.armor})`

          return (
            <Tooltip key={statistic.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`${statistic.label}: ${value}`}
                  className="group focus-visible:ring-ring/50 flex min-w-0 flex-1 items-center justify-center gap-2 px-4 py-3 text-left outline-none first:pl-0 last:pr-0 focus-visible:ring-3 sm:flex-none sm:justify-start sm:pr-8"
                  data-statistic={statistic.id}
                >
                  <Icon
                    aria-hidden="true"
                    className="text-muted-foreground group-hover:text-foreground group-focus-visible:text-foreground size-6 shrink-0 transition-colors"
                  />
                  <span className="text-foreground text-lg leading-none font-medium tabular-nums">
                    {value}
                  </span>
                  <span className="sr-only">{statistic.label}</span>
                </button>
              </TooltipTrigger>
              <StatisticTooltip statistic={statistic} />
            </Tooltip>
          )
        })}
      </div>
    </section>
  )
}
