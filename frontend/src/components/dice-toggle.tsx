import * as React from 'react'

import { DiceIcon } from '@/components/dice-icon'
import { type DiceType } from '@/components/dice-types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ButtonSize = NonNullable<React.ComponentProps<typeof Button>['size']>

const iconSizes = {
  xs: 'size-6',
  sm: 'size-7',
  default: 'size-8',
  lg: 'size-10',
  'icon-xs': 'size-7',
  'icon-sm': 'size-8',
  icon: 'size-10',
  'icon-lg': 'size-12',
} satisfies Record<ButtonSize, string>

type DiceToggleProps = Omit<React.ComponentProps<'button'>, 'children'> & {
  dice: DiceType
  size?: React.ComponentProps<typeof Button>['size']
  label?: string
  pressed?: boolean
  defaultPressed?: boolean
  onPressedChange?: (pressed: boolean) => void
}

function DiceToggle({
  dice,
  label,
  size = 'icon',
  pressed,
  defaultPressed = false,
  onPressedChange,
  onClick,
  className,
  type = 'button',
  ...props
}: DiceToggleProps) {
  const [uncontrolledPressed, setUncontrolledPressed] = React.useState(defaultPressed)
  const isPressed = pressed ?? uncontrolledPressed
  const iconSize = iconSizes[size ?? 'icon']

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)

    if (event.defaultPrevented) return

    const nextPressed = !isPressed

    if (pressed === undefined) setUncontrolledPressed(nextPressed)
    onPressedChange?.(nextPressed)
  }

  return (
    <Button
      data-slot="dice-toggle"
      data-dice={dice}
      data-active={isPressed}
      type={type}
      variant="ghost"
      size={size}
      aria-label={label ?? `Toggle ${dice}`}
      aria-pressed={isPressed}
      onClick={handleClick}
      className={cn(
        'text-muted-foreground hover:text-foreground cursor-pointer',
        isPressed && 'text-primary hover:text-primary',
        className,
      )}
      {...props}
    >
      <DiceIcon dice={dice} className={iconSize} />
    </Button>
  )
}

export { DiceToggle, type DiceToggleProps }
