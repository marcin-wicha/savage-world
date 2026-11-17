import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { api } from '@/lib/api-client'

import { CharactersRoute } from './CharactersRoute'
import { loadCharacterDraft, saveCharacterDraft } from './character-draft'
import { characterFormDefaults } from './character-form'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return {
    ...actual,
    api: {
      ...actual.api,
      get: vi.fn(),
      delete: vi.fn(),
    },
  }
})

const apiGetMock = vi.mocked(api.get)
const apiDeleteMock = vi.mocked(api.delete)

type TestCharacter = {
  id: number
  name: string
  avatar_url?: string | null
  rank: string
  origin_name: string | null
}

function renderRoute(characters: TestCharacter[] = [], sessionUserId?: number) {
  apiGetMock.mockImplementation((path: string) =>
    Promise.resolve(
      path === '/api/v1/session' && sessionUserId !== undefined
        ? {
            user: { id: sessionUserId, email_address: 'player@example.com', role: 'user' },
            csrf_token: 'token',
          }
        : { characters },
    ),
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CharactersRoute />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CharactersRoute', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiDeleteMock.mockReset()
  })

  it('loads characters from the roster API', async () => {
    renderRoute([
      {
        id: 1,
        name: 'Katarina Voss',
        rank: 'seasoned',
        origin_name: 'Dunestriders',
      },
    ])

    expect(await screen.findByText('Katarina Voss')).toBeInTheDocument()
    expect(screen.getByText('Seasoned')).toBeInTheDocument()
    expect(screen.getByText('Dunestriders')).toBeInTheDocument()
    expect(screen.queryByText('Edges')).not.toBeInTheDocument()
    expect(screen.queryByText('Hindrances')).not.toBeInTheDocument()
    expect(screen.queryByText('Skills')).not.toBeInTheDocument()
    expect(screen.getByText('Create a character')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/characters/1/edit')
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/v1/characters',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('shows each character avatar', async () => {
    renderRoute([
      {
        id: 1,
        name: 'Katarina Voss',
        avatar_url: '/api/v1/characters/1/avatar/abc',
        rank: 'novice',
        origin_name: null,
      },
      { id: 2, name: 'Rook Ashford', avatar_url: null, rank: 'novice', origin_name: null },
    ])

    expect(await screen.findByRole('img', { name: 'Katarina Voss' })).toHaveAttribute(
      'src',
      '/api/v1/characters/1/avatar/abc',
    )
    expect(screen.getByText('RA')).toBeInTheDocument()
  })

  it('deletes a character after confirmation', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    apiDeleteMock.mockResolvedValue(null)

    renderRoute([{ id: 7, name: 'Katarina Voss', rank: 'novice', origin_name: null }])

    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    expect(confirm).toHaveBeenCalledWith('Delete Katarina Voss?')
    expect(apiDeleteMock).toHaveBeenCalledWith('/api/v1/characters/7')
    confirm.mockRestore()
  })

  it('shows the empty state when the roster has no characters', async () => {
    renderRoute()

    expect(await screen.findByText('No characters yet')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /create a character/i })).toHaveLength(1)
  })

  it('shows a single create link when the roster has characters', async () => {
    renderRoute([{ id: 1, name: 'Katarina Voss', rank: 'novice', origin_name: null }])

    expect(await screen.findByText('Katarina Voss')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /create a character/i })).toHaveLength(1)
  })

  describe('with an unfinished character draft', () => {
    beforeEach(() => {
      window.localStorage.clear()
      saveCharacterDraft(
        7,
        { ...characterFormDefaults, concept: { name: 'Mira', description: '' } },
        3,
      )
    })

    afterEach(() => {
      window.localStorage.clear()
      vi.restoreAllMocks()
    })

    const renderSignedIn = (characters: TestCharacter[] = []) => renderRoute(characters, 7)

    it('offers to continue the draft instead of a separate create link', async () => {
      renderSignedIn()

      expect(await screen.findByText('Unfinished character')).toBeInTheDocument()
      expect(screen.getByText(/Mira/)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Continue draft' })).toHaveAttribute(
        'href',
        '/characters/new',
      )
      expect(screen.queryByRole('link', { name: /create a character/i })).not.toBeInTheDocument()
      expect(screen.queryByText('No characters yet')).not.toBeInTheDocument()
    })

    it('discards the draft after confirmation', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      renderSignedIn()

      await user.click(await screen.findByRole('button', { name: 'Discard draft' }))

      expect(screen.queryByText('Unfinished character')).not.toBeInTheDocument()
      expect(await screen.findByText('No characters yet')).toBeInTheDocument()
      expect(loadCharacterDraft(7)).toBeNull()
    })

    it('keeps the draft when discarding is cancelled', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      renderSignedIn()

      await user.click(await screen.findByRole('button', { name: 'Discard draft' }))

      expect(screen.getByText('Unfinished character')).toBeInTheDocument()
      expect(loadCharacterDraft(7)).not.toBeNull()
    })
  })
})
