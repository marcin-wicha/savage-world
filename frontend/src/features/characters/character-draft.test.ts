import {
  clearCharacterDraft,
  hasDraftContent,
  loadCharacterDraft,
  saveCharacterDraft,
} from './character-draft'
import { characterFormDefaults } from './character-form'

describe('character drafts', () => {
  beforeEach(() => window.localStorage.clear())

  it('round-trips form values and the current step per user', () => {
    saveCharacterDraft(
      1,
      {
        ...characterFormDefaults,
        concept: { name: 'Mira', description: '' },
        attributes: { ...characterFormDefaults.attributes, agility: 'd8' },
        avatar_file: new File(['x'], 'avatar.png', { type: 'image/png' }),
      },
      4,
    )

    const draft = loadCharacterDraft(1)

    expect(draft?.step).toBe(4)
    expect(draft?.values.concept.name).toBe('Mira')
    expect(draft?.values.attributes.agility).toBe('d8')
    expect(draft?.values.avatar_file).toBeNull()
    expect(loadCharacterDraft(2)).toBeNull()
  })

  it('clears a saved draft', () => {
    saveCharacterDraft(1, characterFormDefaults, 1)
    clearCharacterDraft(1)

    expect(loadCharacterDraft(1)).toBeNull()
  })

  it('ignores malformed storage and falls back to defaults for invalid fields', () => {
    window.localStorage.setItem('savage-worlds-character-draft:1', 'not json')
    expect(loadCharacterDraft(1)).toBeNull()

    window.localStorage.setItem(
      'savage-worlds-character-draft:1',
      JSON.stringify({
        values: { rank: 'demigod', skills: ['3'], concept: { name: 'Mira', description: '' } },
        step: 2,
        saved_at: '2026-11-17T10:00:00.000Z',
      }),
    )

    const draft = loadCharacterDraft(1)

    expect(draft?.values.rank).toBe('novice')
    expect(draft?.values.skills).toEqual(['3'])
    expect(draft?.values.attributes).toEqual(characterFormDefaults.attributes)
  })

  it('detects whether values differ from a blank character', () => {
    expect(hasDraftContent(characterFormDefaults)).toBe(false)
    expect(
      hasDraftContent({ ...characterFormDefaults, concept: { name: 'M', description: '' } }),
    ).toBe(true)
  })
})
