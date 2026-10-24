import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { TooltipProvider } from '@/components/ui/tooltip'

import { NewCharacterRoute } from './NewCharacterRoute'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return {
    ...actual,
    graphqlRequest: vi.fn().mockResolvedValue({
      hindrances: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
      skills: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
    }),
  }
})

function renderRoute() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemoryRouter initialEntries={['/characters/new']}>
          <Routes>
            <Route path="/characters/new" element={<NewCharacterRoute />} />
            <Route path="/characters" element={<h1>Characters page</h1>} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

describe('NewCharacterRoute', () => {
  it('renders every creation step and starts on the concept step', () => {
    renderRoute()

    for (const title of [
      'Concept',
      'Origin',
      'Hindrances',
      'Attributes',
      'Skills',
      'Edges',
      'Gear',
      'Summary',
    ]) {
      expect(screen.getByRole('button', { name: new RegExp(title, 'i') })).toBeInTheDocument()
    }

    expect(screen.getByLabelText(/character name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^concept$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back/i })).toBeEnabled()
  })

  it('blocks advancing until the concept step is valid', async () => {
    const user = userEvent.setup()

    renderRoute()

    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(await screen.findByText(/give your character a name/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /choose an origin/i })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(await screen.findByRole('heading', { name: /choose an origin/i })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /derived statistics/i })).toBeInTheDocument()
  })

  it('keeps the hindrance point balance visible after the Hindrances step', async () => {
    const user = userEvent.setup()

    renderRoute()

    await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(await screen.findByRole('heading', { name: /assign attributes/i })).toBeInTheDocument()
    expect(screen.getByText('Hindrance points')).toBeInTheDocument()
    expect(screen.getByText('0 / 4')).toBeInTheDocument()
  })

  it('recalculates Toughness when Vigor changes on the Attributes step', async () => {
    const user = userEvent.setup()

    renderRoute()

    await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(await screen.findByRole('heading', { name: /assign attributes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /toughness: 4\(0\)/i })).toBeInTheDocument()

    const vigorGroup = screen.getByRole('group', { name: /vigor die/i })
    await user.click(within(vigorGroup).getByRole('button', { name: /d6/i }))

    expect(screen.getByRole('button', { name: /toughness: 5\(0\)/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /toughness: 4\(0\)/i })).not.toBeInTheDocument()
  })

  it('returns to the roster from the first step', async () => {
    const user = userEvent.setup()

    renderRoute()

    await user.click(screen.getByRole('button', { name: /back/i }))

    expect(screen.getByRole('heading', { name: /characters page/i })).toBeInTheDocument()
  })

  it('moves through the flow and completes back to the roster', async () => {
    const user = userEvent.setup()

    renderRoute()

    await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByRole('heading', { name: /choose an origin/i })).toBeInTheDocument()

    for (let step = 0; step < 6; step += 1) {
      await user.click(screen.getByRole('button', { name: /next/i }))
    }
    expect(
      await screen.findByRole('heading', { name: /review your character/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save character/i }))

    expect(screen.getByRole('heading', { name: /characters page/i })).toBeInTheDocument()
  })
})
