import * as React from 'react'

import D4Icon from '@icons/d4_number.svg?react'
import D6Icon from '@icons/d6_number.svg?react'
import D8Icon from '@icons/d8_number.svg?react'
import D10Icon from '@icons/d10_number.svg?react'
import D12Icon from '@icons/d12_number.svg?react'
import D20Icon from '@icons/d20_number.svg?react'

import { type DiceType } from '@/components/dice-types'

const diceIcons = {
  d4: D4Icon,
  d6: D6Icon,
  d8: D8Icon,
  d10: D10Icon,
  d12: D12Icon,
  d20: D20Icon,
} satisfies Record<DiceType, React.ComponentType<React.ComponentProps<'svg'>>>

type DiceIconProps = React.ComponentProps<'svg'> & {
  dice: DiceType
}

function DiceIcon({ dice, ...props }: DiceIconProps) {
  const Icon = diceIcons[dice]

  return <Icon aria-hidden="true" {...props} />
}

export { DiceIcon, type DiceIconProps }
