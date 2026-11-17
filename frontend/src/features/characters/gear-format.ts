export type DamageExpression = {
  strength: boolean
  dice: { count: number; sides: number }[]
  modifier: number
}

export function formatDamage(damage: DamageExpression) {
  const terms = [
    ...(damage.strength ? ['Str'] : []),
    ...damage.dice.map((die) => `${die.count > 1 ? die.count : ''}d${die.sides}`),
  ]
  const modifier = damage.modifier ? `${damage.modifier > 0 ? '+' : ''}${damage.modifier}` : ''

  return `${terms.join('+')}${modifier}`
}
