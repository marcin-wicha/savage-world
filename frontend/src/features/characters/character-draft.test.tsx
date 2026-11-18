import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'

import { api } from '@/lib/api-client'

import {
  type CharacterResponse,
  characterToFormValues,
  hasDraftContent,
  toCharacterSaveFields,
  useCharacterDraftAutosave,
} from './character-draft'
import { characterFormDefaults } from './character-form'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return {
    ...actual,
    api: { ...actual.api, post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

const apiPostMock = vi.mocked(api.post)
const apiPutMock = vi.mocked(api.put)
const apiDeleteMock = vi.mocked(api.delete)

const storedCharacter = (
  overrides: Partial<CharacterResponse['character']> = {},
): CharacterResponse['character'] => ({
  id: 5,
  name: null,
  status: 'draft',
  updated_at: '2026-11-18T10:00:00Z',
  concept: null,
  creation_step: 0,
  rank: 'novice',
  origin_id: null,
  origin_name: null,
  edge_ids: [],
  hindrance_ids: [],
  skill_ids: [],
  attributes: characterFormDefaults.attributes,
  skill_dice: {},
  ...overrides,
})

const fields = (name: string, step = 0) =>
  toCharacterSaveFields({ ...characterFormDefaults, concept: { name, description: '' } }, step)

function renderAutosave(initialCharacterId: number | null = null, enabled = true) {
  const onCreated = vi.fn()
  const queryClient = new QueryClient()
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const hook = renderHook(
    () => useCharacterDraftAutosave({ initialCharacterId, enabled, onCreated, delayMs: 0 }),
    { wrapper },
  )

  return { ...hook, onCreated }
}

describe('character draft mapping', () => {
  it('builds the character payload, keeping only selected hindrance severities', () => {
    const payload = toCharacterSaveFields(
      {
        ...characterFormDefaults,
        concept: { name: 'Mira', description: 'Desert scout' },
        origin: '3',
        hindrances: ['7'],
        hindrance_severities: { '7': 'major', '8': 'minor' },
        gear: { '2': 1 },
        equipped_gear: ['2', '9'],
      },
      4,
    )

    expect(payload).toMatchObject({
      name: 'Mira',
      concept: 'Desert scout',
      origin_id: 3,
      hindrance_ids: [7],
      hindrance_severities: { '7': 'major' },
      equipped_gear_ids: [2],
      creation_step: 4,
    })
    expect(toCharacterSaveFields(characterFormDefaults)).toMatchObject({ origin_id: null })
    expect(toCharacterSaveFields(characterFormDefaults)).not.toHaveProperty('creation_step')
  })

  it('restores form values and point spending from a stored character', () => {
    const values = characterToFormValues(
      storedCharacter({
        name: 'Mira',
        concept: 'Desert scout',
        origin_id: 3,
        origin_name: 'Dunestriders',
        hindrance_ids: [7],
        hindrances: [{ id: 7, name: 'Greedy', slug: 'greedy' }],
        hindrance_severities: { '7': 'major' },
        skill_ids: [4],
        skills: [{ id: 4, name: 'Fighting', slug: 'fighting' }],
        skill_dice: { '4': 'd8' },
        creation_points: { earned: 2, spent: { attributes: 1, skills: 0, edges: 0 } },
      }),
    )

    expect(values).toMatchObject({
      concept: { name: 'Mira', description: 'Desert scout' },
      origin: '3',
      hindrances: ['7'],
      hindrance_slugs: { '7': 'greedy' },
      hindrance_severities: { '7': 'major' },
      skill_slugs: { '4': 'fighting' },
      skill_dice: { '4': 'd8' },
      hindrance_points_earned: 2,
      attribute_hindrance_points_spent: 1,
      hindrance_points_spent: 1,
    })
  })

  it('treats a blank character as having no draft content', () => {
    expect(hasDraftContent(characterFormDefaults)).toBe(false)
    expect(
      hasDraftContent({ ...characterFormDefaults, concept: { name: 'M', description: '' } }),
    ).toBe(true)
  })
})

describe('useCharacterDraftAutosave', () => {
  beforeEach(() => {
    apiPostMock.mockReset().mockResolvedValue({ character: storedCharacter() })
    apiPutMock.mockReset().mockResolvedValue({ character: storedCharacter() })
    apiDeleteMock.mockReset().mockResolvedValue(undefined)
  })

  it('creates a draft character on the first save and updates it afterwards', async () => {
    const { result, onCreated } = renderAutosave()

    act(() => result.current.schedule(fields('Mira')))
    await waitFor(() => expect(result.current.status).toBe('saved'))

    expect(apiPostMock).toHaveBeenCalledWith('/api/v1/characters', { character: fields('Mira') })
    expect(onCreated).toHaveBeenCalledWith(5)
    expect(result.current.characterId).toBe(5)

    act(() => result.current.schedule(fields('Mira Voss', 2)))
    await waitFor(() => expect(apiPutMock).toHaveBeenCalledTimes(1))

    expect(apiPutMock).toHaveBeenCalledWith('/api/v1/characters/5', {
      character: fields('Mira Voss', 2),
    })
    expect(apiPostMock).toHaveBeenCalledTimes(1)
  })

  it('reports failed saves', async () => {
    apiPostMock.mockRejectedValue(new Error('offline'))
    const { result } = renderAutosave()

    act(() => result.current.schedule(fields('Mira')))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.characterId).toBeNull()
  })

  it('does nothing while disabled', async () => {
    const { result } = renderAutosave(null, false)

    act(() => result.current.schedule(fields('Mira')))

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(apiPostMock).not.toHaveBeenCalled()
  })

  it('flushes a pending change immediately and reports the character id', async () => {
    const { result } = renderAutosave(9)
    const longDelay = renderHook(
      () =>
        useCharacterDraftAutosave({
          initialCharacterId: 9,
          enabled: true,
          onCreated: vi.fn(),
          delayMs: 60_000,
        }),
      {
        wrapper: ({ children }: PropsWithChildren) => (
          <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
        ),
      },
    )

    act(() => longDelay.result.current.schedule(fields('Mira')))
    let flushedId: number | null = null
    await act(async () => {
      flushedId = await longDelay.result.current.flush()
    })

    expect(flushedId).toBe(9)
    expect(apiPutMock).toHaveBeenCalledWith('/api/v1/characters/9', { character: fields('Mira') })
    expect(result.current.characterId).toBe(9)
  })

  it('discards the draft character and starts a new one on the next change', async () => {
    const { result } = renderAutosave(9)

    await act(() => result.current.discard())

    expect(apiDeleteMock).toHaveBeenCalledWith('/api/v1/characters/9')
    expect(result.current.characterId).toBeNull()

    act(() => result.current.schedule(fields('Fresh')))
    await waitFor(() => expect(result.current.characterId).toBe(5))
    expect(apiPostMock).toHaveBeenCalledTimes(1)
  })

  it('stops saving once stopped', async () => {
    const { result } = renderAutosave(9)

    await act(() => result.current.stop())
    act(() => result.current.schedule(fields('Late change')))

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(apiPutMock).not.toHaveBeenCalled()
    expect(apiDeleteMock).not.toHaveBeenCalled()
  })
})
