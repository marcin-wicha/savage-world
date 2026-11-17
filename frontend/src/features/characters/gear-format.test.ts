import { describe, expect, it } from 'vitest'

import { formatDamage } from './gear-format'

describe('formatDamage', () => {
  it('formats strength-based damage', () => {
    expect(formatDamage({ strength: true, dice: [{ count: 1, sides: 8 }], modifier: 0 })).toBe(
      'Str+d8',
    )
  })

  it('formats multiple dice with modifiers', () => {
    expect(formatDamage({ strength: false, dice: [{ count: 2, sides: 6 }], modifier: 1 })).toBe(
      '2d6+1',
    )
    expect(formatDamage({ strength: true, dice: [], modifier: -1 })).toBe('Str-1')
  })
})
