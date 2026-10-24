import { meetsEdgeRequirements } from './edge-requirements'

const character = {
  attributes: {
    agility: 8,
    smarts: 6,
    spirit: 6,
    strength: 10,
    vigor: 6,
  },
  skillDiceBySlug: {
    athletics: 8,
    fighting: 6,
  },
  edgeSlugs: new Set(['arcane-background', 'ace']),
  hindranceSlugs: new Set(['wanted', 'slow']),
}

const requirement = (kind: string, extra = {}) =>
  ({ kind, ...extra }) as unknown as Parameters<typeof meetsEdgeRequirements>[0][number]

describe('metEdgeRequirements', () => {
  it('passes edges with no requirements', () => {
    expect(meetsEdgeRequirements([], character)).toBe(true)
  })

  it('evaluates attribute requirements against the assigned die', () => {
    expect(
      meetsEdgeRequirements(
        [requirement('attribute', { attribute: 'agility', die: 8 })],
        character,
      ),
    ).toBe(true)
    expect(
      meetsEdgeRequirements(
        [requirement('attribute', { attribute: 'agility', die: 10 })],
        character,
      ),
    ).toBe(false)
    expect(
      meetsEdgeRequirements([requirement('attribute', { attribute: 'smarts', die: 8 })], character),
    ).toBe(false)
  })

  it('evaluates skill requirements against the assigned skills', () => {
    expect(
      meetsEdgeRequirements([requirement('skill', { skill: 'athletics', die: 8 })], character),
    ).toBe(true)
    expect(
      meetsEdgeRequirements([requirement('skill', { skill: 'fighting', die: 8 })], character),
    ).toBe(false)
    expect(
      meetsEdgeRequirements([requirement('skill', { skill: 'stealth', die: 4 })], character),
    ).toBe(false)
  })

  it('evaluates edge, hindrance, and arcane background requirements by slug', () => {
    expect(meetsEdgeRequirements([requirement('edge', { slug: 'ace' })], character)).toBe(true)
    expect(meetsEdgeRequirements([requirement('edge', { slug: 'wizard' })], character)).toBe(false)
    expect(meetsEdgeRequirements([requirement('hindrance', { slug: 'slow' })], character)).toBe(
      true,
    )
    expect(meetsEdgeRequirements([requirement('hindrance', { slug: 'young' })], character)).toBe(
      false,
    )
    expect(
      meetsEdgeRequirements([requirement('arcane_background', { value: 'any' })], character),
    ).toBe(true)
    expect(
      meetsEdgeRequirements([requirement('arcane_background', { value: 'magic' })], {
        ...character,
        edgeSlugs: new Set(['ace']),
      }),
    ).toBe(false)
  })

  it('treats wild card requirements as met and special requirements as unmet', () => {
    expect(meetsEdgeRequirements([requirement('wild_card')], character)).toBe(true)
    expect(
      meetsEdgeRequirements([requirement('special', { text: 'Heroic rank' })], character),
    ).toBe(false)
  })

  it('requires every top-level clause to be met', () => {
    expect(
      meetsEdgeRequirements(
        [
          requirement('attribute', { attribute: 'agility', die: 8 }),
          requirement('skill', { skill: 'athletics', die: 8 }),
        ],
        character,
      ),
    ).toBe(true)
    expect(
      meetsEdgeRequirements(
        [
          requirement('attribute', { attribute: 'agility', die: 8 }),
          requirement('skill', { skill: 'stealth', die: 8 }),
        ],
        character,
      ),
    ).toBe(false)
  })

  it('passes any-requirements when one nested clause is met', () => {
    expect(
      meetsEdgeRequirements(
        [
          requirement('any', {
            clauses: [
              requirement('skill', { skill: 'stealth', die: 8 }),
              requirement('skill', { skill: 'athletics', die: 8 }),
            ],
          }),
        ],
        character,
      ),
    ).toBe(true)
    expect(
      meetsEdgeRequirements(
        [
          requirement('any', {
            clauses: [
              requirement('skill', { skill: 'stealth', die: 8 }),
              requirement('skill', { skill: 'spellcasting', die: 8 }),
            ],
          }),
        ],
        character,
      ),
    ).toBe(false)
  })
})
