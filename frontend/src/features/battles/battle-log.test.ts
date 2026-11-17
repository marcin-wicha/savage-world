import { describe, expect, it } from 'vitest'

import { describeTraitRoll, fill, formatEvent } from './battle-log'
import type { BattleEvent } from './battle-types'

const names = { 'character-1': 'Valeria', 'enemy-2-1': 'Goblin 1' }
const identity = (text: string) => text

function event(type: string, data: Record<string, unknown> = {}): BattleEvent {
  return { type, round: 1, ...data }
}

describe('battle log formatting', () => {
  it('fills placeholders', () => {
    expect(fill('{actor} hits {target}', { actor: 'A', target: 'B' })).toBe('A hits B')
    expect(fill('{missing}', {})).toBe('{missing}')
  })

  it('describes trait rolls with aces, the Wild Die, and modifiers', () => {
    expect(
      describeTraitRoll(
        { die: 'd8', trait: [[8, 3]], wild: [2], modifier: -2, totals: [9] },
        identity,
      ),
    ).toBe('d8: 8+3 · Wild Die: 2 · -2 · = 9')
  })

  it('formats attacks with modifiers and the target number', () => {
    const formatted = formatEvent(
      event('attack', {
        actor: 'character-1',
        target: 'enemy-2-1',
        weapon: 'Long Sword',
        outcome: 'raise',
        wild_attack: true,
        roll: { die: 'd10', trait: [[9]], wild: [4], modifier: 3, totals: [12] },
        modifiers: [
          { label: 'wild_attack', value: 2 },
          { label: 'gang_up', value: 1 },
        ],
        target_number: 6,
        rerolled: false,
      }),
      names,
      identity,
    )

    expect(formatted?.text).toBe(
      'Valeria makes a Wild Attack on Goblin 1 with Long Sword: hit with a raise.',
    )
    expect(formatted?.detail).toContain('Wild Attack +2 · Gang Up +1 · TN 6')
  })

  it('formats damage, soak, and incapacitation', () => {
    expect(
      formatEvent(
        event('damage', {
          actor: 'enemy-2-1',
          target: 'character-1',
          weapon: 'Axe',
          roll: { rolls: [{ die: 'd8', rolls: [8, 4] }], modifier: 0, total: 12 },
          toughness: 7,
          outcome: 'wounded',
          wounds: 1,
          raise_bonus: false,
          armor_piercing: 2,
        }),
        names,
        identity,
      ),
    ).toEqual({
      text: 'Valeria takes 12 damage against Toughness 7: wounded (1 wound).',
      detail: 'd8: 8+4 = 12 · AP 2',
      emphasis: undefined,
    })

    expect(
      formatEvent(event('soak', { actor: 'character-1', removed: 1, wounds: 2 }), names, identity)
        ?.text,
    ).toBe('Valeria spends a Benny to soak: 1 of 2 wounds removed.')

    expect(
      formatEvent(
        event('incapacitated', { actor: 'character-1', outcome: 'bleeding_out', injury: 'arm' }),
        names,
        identity,
      )?.text,
    ).toBe('Valeria is incapacitated and bleeding out. Injury: Arm.')
  })

  it('formats initiative, morale, and the battle end', () => {
    expect(
      formatEvent(
        event('initiative', {
          cards: [
            { card: { label: 'Joker' }, combatants: ['character-1'] },
            { card: { label: 'K♠' }, combatants: ['enemy-2-1'] },
          ],
        }),
        names,
        identity,
      )?.text,
    ).toBe('Action cards: Joker Valeria · K♠ Goblin 1')
    expect(
      formatEvent(event('morale', { actor: 'enemy-2-1', outcome: 'fled' }), names, identity)?.text,
    ).toBe('Goblin 1 breaks and flees.')
    expect(formatEvent(event('battle_end', { winner: 'party' }), names, identity)?.text).toBe(
      'The party wins.',
    )
  })

  it('skips events without a description', () => {
    expect(formatEvent(event('benny', { actor: 'character-1' }), names, identity)).toBeNull()
  })
})
