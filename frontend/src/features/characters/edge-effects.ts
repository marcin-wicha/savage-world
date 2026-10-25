import type { CharacterFormValues } from './character-form'

export type EdgeEffect =
  | {
      kind: 'trait_modifier'
      target: 'attribute' | 'skill' | 'damage'
      trait: string
      modifier: number
    }
  | { kind: 'trait_die_step'; target: 'attribute' | 'skill'; trait: string; steps: number }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseEdgeEffects(value: unknown): EdgeEffect[] {
  if (!Array.isArray(value)) return []

  return value.filter((effect): effect is EdgeEffect => {
    if (!isRecord(effect)) return false
    if (effect.target !== 'attribute' && effect.target !== 'skill' && effect.target !== 'damage')
      return false
    if (typeof effect.trait !== 'string') return false
    if (effect.kind === 'trait_modifier') {
      return typeof effect.modifier === 'number' && Number.isInteger(effect.modifier)
    }
    if (effect.kind === 'trait_die_step' && effect.target !== 'damage') {
      return typeof effect.steps === 'number' && Number.isInteger(effect.steps)
    }
    return false
  })
}

export function applyEdgeEffects(
  die: CharacterFormValues['attributes'][keyof CharacterFormValues['attributes']],
  effects: EdgeEffect[],
  target: 'attribute' | 'skill',
  trait: string,
) {
  const dice = ['d4', 'd6', 'd8', 'd10', 'd12'] as const
  const matching = effects.filter((effect) => effect.target === target && effect.trait === trait)
  const steps = matching.reduce(
    (total, effect) => total + (effect.kind === 'trait_die_step' ? effect.steps : 0),
    0,
  )
  const modifier = matching.reduce(
    (total, effect) => total + (effect.kind === 'trait_modifier' ? effect.modifier : 0),
    0,
  )
  const dieIndex = Math.max(0, Math.min(dice.indexOf(die) + steps, dice.length - 1))

  return { die: dice[dieIndex], modifier }
}

export function describeEdgeEffect(effect: EdgeEffect): string {
  const trait =
    effect.target === 'damage'
      ? effect.trait === 'all'
        ? 'Damage'
        : `Damage (${effect.trait.replace(/-/g, ' ')})`
      : effect.trait.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

  return effect.kind === 'trait_modifier'
    ? `${trait} ${effect.modifier >= 0 ? '+' : ''}${effect.modifier}`
    : `${trait} ${effect.steps >= 0 ? '+' : ''}${effect.steps} die step${Math.abs(effect.steps) === 1 ? '' : 's'}`
}
