import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
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
  name: string
  rank: string
  origin_name: string | null
}

function renderRoute(characters: TestCharacter[] = []) {
  apiGetMock.mockResolvedValue({ characters })
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
    expect(screen.getAllByRole('link', { name: /create a character/i })).toHaveLength(2)
  })
})
