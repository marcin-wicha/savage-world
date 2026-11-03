import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { api } from '@/lib/api-client'

import { CharacterSheetRoute } from './CharacterSheetRoute'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return { ...actual, api: { ...actual.api, get: vi.fn() } }
})

const apiGetMock = vi.mocked(api.get)

function renderSheet() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/characters/12/sheet']}>
        <Routes>
          <Route path="/characters/:id/sheet" element={<CharacterSheetRoute />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CharacterSheetRoute', () => {
  beforeEach(() => apiGetMock.mockReset())

  it('renders the saved character as a printable sheet', async () => {
    apiGetMock.mockResolvedValue({
      character: {
        id: 12,
        name: 'Katarina Voss',
        rank: 'seasoned',
        origin_name: 'Dunestriders',
        attributes: { agility: 'd6', smarts: 'd8', spirit: 'd4', strength: 'd6', vigor: 'd8' },
        skills: [{ id: 5, name: 'Fighting', attribute: 'agility', die: 'd8' }],
        edges: [{ id: 4, name: 'Alertness' }],
        hindrances: [{ id: 2, name: 'Bloodthirsty' }],
      },
    })

    renderSheet()

    expect(await screen.findByRole('heading', { name: 'Katarina Voss' })).toBeInTheDocument()
    expect(screen.getByText('Fighting')).toBeInTheDocument()
    expect(screen.getAllByText('d8').length).toBeGreaterThan(0)
    expect(screen.getByText('Alertness')).toBeInTheDocument()
    expect(screen.getByText('Bloodthirsty')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Print sheet' })).toBeInTheDocument()
    expect(screen.getByText('Agility').parentElement?.parentElement).toHaveClass('grid')
    expect(screen.getByText('Agility').parentElement?.parentElement).not.toHaveClass('grid-cols-2')
    expect(apiGetMock).toHaveBeenCalledWith('/api/v1/characters/12', expect.any(Object))
  })

  it('lets the player fill in Player and Notes on the sheet', async () => {
    const user = userEvent.setup()
    apiGetMock.mockResolvedValue({
      character: {
        id: 12,
        name: 'Katarina Voss',
        rank: 'seasoned',
        origin_name: 'Dunestriders',
        attributes: { agility: 'd6', smarts: 'd8', spirit: 'd4', strength: 'd6', vigor: 'd8' },
        skills: [],
        edges: [],
        hindrances: [],
      },
    })

    renderSheet()

    const player = await screen.findByRole('textbox', { name: 'Player' })
    const notes = screen.getByRole('textbox', { name: 'Notes' })
    expect(notes).toHaveAttribute('aria-multiline', 'true')

    await user.type(player, 'Alex')
    await user.type(notes, 'Owes a favor to the marshal.')

    expect(player).toHaveTextContent('Alex')
    expect(notes).toHaveTextContent('Owes a favor to the marshal.')
  })

  it('shows a useful error when the character cannot be loaded', async () => {
    apiGetMock.mockResolvedValue({ character: null })

    renderSheet()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load this character sheet.',
    )
    expect(screen.getByRole('link', { name: 'Back to characters' })).toHaveAttribute(
      'href',
      '/characters',
    )
  })
})
