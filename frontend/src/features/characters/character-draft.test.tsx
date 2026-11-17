import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'

import { api } from '@/lib/api-client'

import {
  hasDraftContent,
  restoreDraftValues,
  toDraftData,
  useCharacterDraftAutosave,
} from './character-draft'
import { characterFormDefaults } from './character-form'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return {
    ...actual,
    api: { ...actual.api, post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  }
})

const apiPostMock = vi.mocked(api.post)
const apiPatchMock = vi.mocked(api.patch)
const apiDeleteMock = vi.mocked(api.delete)

const draftResponse = (id: number) => ({
  character_draft: { id, name: '', step: 0, updated_at: '2026-11-17T10:00:00Z', data: {} },
})

const payload = (name: string, step = 0) => ({
  data: toDraftData({ ...characterFormDefaults, concept: { name, description: '' } }),
  step,
})

function renderAutosave(initialDraftId: number | null = null) {
  const onCreated = vi.fn()
  const queryClient = new QueryClient()
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const hook = renderHook(
    () => useCharacterDraftAutosave({ initialDraftId, onCreated, delayMs: 0 }),
    { wrapper },
  )

  return { ...hook, onCreated }
}

describe('character draft values', () => {
  it('restores valid fields and falls back to defaults for invalid ones', () => {
    const values = restoreDraftValues({
      rank: 'demigod',
      skills: ['3'],
      concept: { name: 'Mira', description: '' },
      avatar_file: 'nope',
    })

    expect(values.rank).toBe('novice')
    expect(values.skills).toEqual(['3'])
    expect(values.concept.name).toBe('Mira')
    expect(values.avatar_file).toBeNull()
    expect(values.attributes).toEqual(characterFormDefaults.attributes)
    expect(restoreDraftValues(['not', 'an', 'object'])).toEqual(characterFormDefaults)
  })

  it('leaves the avatar file out of the stored snapshot', () => {
    const data = toDraftData({
      ...characterFormDefaults,
      avatar_file: new File(['x'], 'avatar.png', { type: 'image/png' }),
    })

    expect(data).not.toHaveProperty('avatar_file')
  })

  it('detects whether values differ from a blank character', () => {
    expect(hasDraftContent(characterFormDefaults)).toBe(false)
    expect(
      hasDraftContent({ ...characterFormDefaults, concept: { name: 'M', description: '' } }),
    ).toBe(true)
  })
})

describe('useCharacterDraftAutosave', () => {
  beforeEach(() => {
    apiPostMock.mockReset().mockResolvedValue(draftResponse(5))
    apiPatchMock.mockReset().mockResolvedValue(draftResponse(5))
    apiDeleteMock.mockReset().mockResolvedValue(undefined)
  })

  it('creates a draft on the first save and updates it afterwards', async () => {
    const { result, onCreated } = renderAutosave()

    act(() => result.current.schedule(payload('Mira')))
    await waitFor(() => expect(result.current.status).toBe('saved'))

    expect(apiPostMock).toHaveBeenCalledWith('/api/v1/character_drafts', {
      character_draft: payload('Mira'),
    })
    expect(onCreated).toHaveBeenCalledWith(5)
    expect(result.current.draftId).toBe(5)

    act(() => result.current.schedule(payload('Mira Voss', 2)))
    await waitFor(() => expect(apiPatchMock).toHaveBeenCalledTimes(1))

    expect(apiPatchMock).toHaveBeenCalledWith('/api/v1/character_drafts/5', {
      character_draft: payload('Mira Voss', 2),
    })
    expect(apiPostMock).toHaveBeenCalledTimes(1)
  })

  it('updates an existing draft without creating another', async () => {
    const { result, onCreated } = renderAutosave(9)

    act(() => result.current.schedule(payload('Mira')))
    await waitFor(() => expect(result.current.status).toBe('saved'))

    expect(apiPatchMock).toHaveBeenCalledWith('/api/v1/character_drafts/9', expect.anything())
    expect(apiPostMock).not.toHaveBeenCalled()
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('reports failed saves', async () => {
    apiPostMock.mockRejectedValue(new Error('offline'))
    const { result } = renderAutosave()

    act(() => result.current.schedule(payload('Mira')))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.draftId).toBeNull()
  })

  it('discards the draft and starts a new one on the next change', async () => {
    const { result } = renderAutosave(9)

    await act(() => result.current.discard())

    expect(apiDeleteMock).toHaveBeenCalledWith('/api/v1/character_drafts/9')
    expect(result.current.draftId).toBeNull()

    act(() => result.current.schedule(payload('Fresh')))
    await waitFor(() => expect(result.current.draftId).toBe(5))
    expect(apiPostMock).toHaveBeenCalledTimes(1)
  })

  it('stops saving once the character is finished', async () => {
    const { result } = renderAutosave(9)

    await act(() => result.current.finish())
    act(() => result.current.schedule(payload('Late change')))

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(apiDeleteMock).toHaveBeenCalledWith('/api/v1/character_drafts/9')
    expect(apiPatchMock).not.toHaveBeenCalled()
    expect(apiPostMock).not.toHaveBeenCalled()
  })
})
