import * as React from 'react'

import { DiceIcon } from '@/components/dice-icon'
import { DiceToggle } from '@/components/dice-toggle'
import { skillDieTypes, type SkillDieType } from '@/components/dice-types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type SkillDieProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  die?: SkillDieType | null
  defaultDie?: SkillDieType | null
  onDieChange?: (die: SkillDieType) => void
  modifier?: number
  defaultModifier?: number
  onModifierChange?: (modifier: number) => void
  label?: string
  showModifier?: boolean
  maxDie?: SkillDieType | null
  disabled?: boolean
  readOnly?: boolean
}

function parseModifier(value: string) {
  const parsed = Number.parseInt(value, 10)

  return Number.isNaN(parsed) ? 0 : Math.max(parsed, 0)
}

function SkillDie({
  die,
  defaultDie = null,
  onDieChange,
  modifier,
  defaultModifier = 0,
  onModifierChange,
  label = 'Skill die',
  showModifier = true,
  maxDie = null,
  disabled = false,
  readOnly = false,
  className,
  ...props
}: SkillDieProps) {
  const [uncontrolledDie, setUncontrolledDie] = React.useState(defaultDie)
  const [uncontrolledModifier, setUncontrolledModifier] = React.useState(defaultModifier)
  const activeDie = die === undefined ? uncontrolledDie : die
  const currentModifier = modifier ?? uncontrolledModifier
  const modifierId = React.useId()

  const changeDie = (nextDie: SkillDieType) => {
    if (die === undefined) setUncontrolledDie(nextDie)
    onDieChange?.(nextDie)
  }

  const changeModifier = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextModifier = parseModifier(event.target.value)

    if (modifier === undefined) setUncontrolledModifier(nextModifier)
    onModifierChange?.(nextModifier)
  }

  if (readOnly) {
    if (!activeDie) return null

    return (
      <div
        data-slot="skill-die-readonly"
        role="img"
        aria-label={`${label}: ${activeDie}${currentModifier > 0 ? `+${currentModifier}` : ''}`}
        className={cn('inline-flex items-center gap-1', className)}
        {...props}
      >
        <DiceIcon dice={activeDie} className="text-primary size-10" />
        {currentModifier > 0 ? (
          <span className="text-sm font-medium tabular-nums">+{currentModifier}</span>
        ) : null}
      </div>
    )
  }

  return (
    <div
      data-slot="skill-die"
      role="group"
      aria-label={label}
      className={cn('flex flex-wrap items-center gap-1', className)}
      {...props}
    >
      {skillDieTypes.map((option) => (
        <DiceToggle
          key={option}
          dice={option}
          pressed={activeDie === option}
          disabled={
            disabled ||
            (maxDie !== null && skillDieTypes.indexOf(option) > skillDieTypes.indexOf(maxDie))
          }
          onPressedChange={(pressed) => {
            if (pressed) changeDie(option)
          }}
        />
      ))}

      {showModifier ? (
        <>
          <Label htmlFor={modifierId} className="text-muted-foreground ml-2 text-sm">
            Modifier
          </Label>
          <Input
            id={modifierId}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={currentModifier === 0 ? '' : currentModifier}
            placeholder="+0"
            disabled={disabled}
            onChange={changeModifier}
            className="h-8 w-20"
          />
        </>
      ) : null}
    </div>
  )
}

export { SkillDie, type SkillDieProps }
