import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { api } from '@/lib/api-client'

import { CharactersRoute } from './CharactersRoute'

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
  name: string | null
  status?: 'draft' | 'alive' | 'dead'
  updated_at?: string
  avatar_url?: string | null
  rank: string
  origin_name: string | null
}

function renderRoute(characters: TestCharacter[] = []) {
  apiGetMock.mockResolvedValue({
    characters: characters.map((character) => ({
      status: 'alive',
      updated_at: '2026-11-17T10:00:00Z',
      ...character,
    })),
  })
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

  it('marks dead characters', async () => {
    renderRoute([{ id: 1, name: 'Fallen Hero', rank: 'novice', origin_name: null, status: 'dead' }])

    expect(await screen.findByText('Fallen Hero')).toBeInTheDocument()
    expect(screen.getByText('Dead')).toBeInTheDocument()
  })

  describe('with unfinished character drafts', () => {
    const drafts: TestCharacter[] = [
      { id: 5, name: 'Mira', status: 'draft', rank: 'novice', origin_name: null },
      { id: 6, name: null, status: 'draft', rank: 'novice', origin_name: null },
    ]

    afterEach(() => vi.restoreAllMocks())

    it('lists drafts separately with links to continue each one', async () => {
      renderRoute(drafts)

      expect(
        await screen.findByRole('heading', { name: 'Unfinished characters' }),
      ).toBeInTheDocument()
      expect(screen.getByText('Mira')).toBeInTheDocument()
      expect(screen.getByText('Unnamed character')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Continue draft: Mira' })).toHaveAttribute(
        'href',
        '/characters/5/edit',
      )
      expect(screen.queryByRole('link', { name: 'Sheet' })).not.toBeInTheDocument()
      expect(screen.queryByText('No characters yet')).not.toBeInTheDocument()
      expect(screen.getAllByRole('link', { name: /create a character/i })).toHaveLength(1)
    })

    it('discards a draft after confirmation', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      apiDeleteMock.mockResolvedValue(null)
      renderRoute(drafts)

      await user.click(await screen.findByRole('button', { name: 'Discard draft: Mira' }))

      await waitFor(() => {
        expect(apiDeleteMock).toHaveBeenCalledWith('/api/v1/characters/5')
      })
    })

    it('keeps the draft when discarding is cancelled', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      renderRoute(drafts)

      await user.click(await screen.findByRole('button', { name: 'Discard draft: Mira' }))

      expect(apiDeleteMock).not.toHaveBeenCalled()
    })

    it('reports a failed discard', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      apiDeleteMock.mockRejectedValue(new Error('boom'))
      renderRoute(drafts)

      await user.click(await screen.findByRole('button', { name: 'Discard draft: Mira' }))

      expect(await screen.findByText('Could not discard the draft. Try again.')).toBeInTheDocument()
    })
  })
})
