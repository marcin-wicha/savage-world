import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { renderAt } from '@/features/parties/test-utils'
import { api } from '@/lib/api-client'
import { LanguageProvider } from '@/lib/i18n'

import { BattleRoute } from './BattleRoute'
import { battleFixture } from './test-fixtures'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return { ...actual, api: { ...actual.api, get: vi.fn(), delete: vi.fn() } }
})

const apiGetMock = vi.mocked(api.get)
const apiDeleteMock = vi.mocked(api.delete)

function renderRoute() {
  return renderAt('/battles/5', '/battles/:id', <BattleRoute />)
}

describe('BattleRoute', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiDeleteMock.mockReset()
  })

  it('shows the outcome summary, roster statistics, and the round-by-round log', async () => {
    apiGetMock.mockResolvedValue({ battle: battleFixture })

    renderRoute()

    expect(await screen.findByRole('heading', { name: 'Battle simulation' })).toBeInTheDocument()
    expect(apiGetMock).toHaveBeenCalledWith('/api/v1/battles/5', expect.any(Object))
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('40 / 8 / 2')).toBeInTheDocument()
    expect(screen.getByText('Party victory')).toBeInTheDocument()
    expect(screen.getByText(/Seed 42/)).toBeInTheDocument()
    expect(screen.getByText(/Dim light/)).toBeInTheDocument()
    expect(screen.getByText(/Toughness 9 \(3\)/)).toBeInTheDocument()
    expect(screen.getByText(/Long Sword Str\+d8/)).toBeInTheDocument()
    expect(screen.getByText(/Taken out 10%/)).toBeInTheDocument()
    expect(screen.getByText(/Fled 6%/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Round 1' })).toBeInTheDocument()
    expect(screen.getByText('Valeria attacks Goblin 1 with Long Sword: hit.')).toBeInTheDocument()
    expect(screen.getByText('Goblin 1 is out of the fight.')).toBeInTheDocument()
    expect(screen.getByText('The party wins.')).toBeInTheDocument()
  })

  describe('browsing runs', () => {
    const battle = {
      ...battleFixture,
      run_results: [
        { index: 0, winner: 'party' as const, rounds: 1 },
        { index: 1, winner: 'enemies' as const, rounds: 4 },
        { index: 2, winner: 'draw' as const, rounds: 20 },
        { index: 3, winner: 'party' as const, rounds: 3 },
      ],
    }
    const lostRunLog = [
      { type: 'battle_start', round: 0 },
      ...[1, 2, 3, 4].map((round) => ({ type: 'round_start', round })),
      { type: 'battle_end', round: 4, winner: 'enemies' },
    ]

    function mockRuns() {
      apiGetMock.mockImplementation((path: string) => {
        if (path === '/api/v1/battles/5') return Promise.resolve({ battle })
        if (path === '/api/v1/battles/5/runs/1') {
          return Promise.resolve({
            run: { index: 1, winner: 'enemies', rounds: 4, log: lostRunLog },
          })
        }
        return Promise.reject(new Error(`Unexpected GET ${path}`))
      })
    }

    it('shows the first run from the battle and counts outcomes for the filters', async () => {
      mockRuns()

      renderRoute()

      const filters = await screen.findByRole('group', { name: 'Filter runs by outcome' })
      expect(
        within(filters)
          .getAllByRole('button')
          .map((button) => button.textContent),
      ).toEqual(['All (4)', 'Won (2)', 'Lost (1)', 'Draw (1)'])
      expect(screen.getByLabelText('Run')).toHaveValue('0')
      expect(screen.getByText('Run 1: Won · 1 round')).toBeInTheDocument()
      expect(screen.getByText('The party wins.')).toBeInTheDocument()
      expect(apiGetMock).toHaveBeenCalledTimes(1)
    })

    it('loads the full log of any chosen run', async () => {
      const user = userEvent.setup()
      mockRuns()

      renderRoute()

      await user.selectOptions(await screen.findByLabelText('Run'), '1')

      expect(await screen.findByRole('heading', { name: 'Round 4' })).toBeInTheDocument()
      expect(screen.getByText('Run 2: Lost · 4 rounds')).toBeInTheDocument()
      expect(apiGetMock).toHaveBeenCalledWith('/api/v1/battles/5/runs/1', expect.any(Object))
    })

    it('filters runs by outcome', async () => {
      const user = userEvent.setup()
      mockRuns()

      renderRoute()

      await user.click(await screen.findByRole('button', { name: 'Lost (1)' }))

      expect(screen.getByRole('button', { name: 'Lost (1)' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      expect(
        within(screen.getByLabelText('Run'))
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['Run 2 · Lost · 4 rounds'])
      expect(await screen.findByRole('heading', { name: 'Round 4' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Won (2)' }))
      expect(
        within(screen.getByLabelText('Run'))
          .getAllByRole('option')
          .map((option) => option.getAttribute('value')),
      ).toEqual(['0', '3'])
    })

    it('explains when a run cannot be loaded', async () => {
      const user = userEvent.setup()
      mockRuns()

      renderRoute()

      await user.click(await screen.findByRole('button', { name: 'Draw (1)' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Could not load this run. Try again.',
      )
    })

    it('falls back to the first run for battles without run results', async () => {
      apiGetMock.mockResolvedValue({ battle: battleFixture })

      renderRoute()

      expect(
        within(await screen.findByLabelText('Run'))
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['Run 1 · Won · 2 rounds'])
      expect(screen.getByRole('button', { name: 'Lost (0)' })).toBeDisabled()
    })
  })

  it('translates the log into Polish', async () => {
    window.localStorage.setItem('savage-worlds-language', 'pl')
    apiGetMock.mockResolvedValue({ battle: battleFixture })

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <LanguageProvider>
          <MemoryRouter initialEntries={['/battles/5']}>
            <Routes>
              <Route path="/battles/:id" element={<BattleRoute />} />
            </Routes>
          </MemoryRouter>
        </LanguageProvider>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Drużyna wygrywa.')).toBeInTheDocument()
    expect(
      screen.getByText('Valeria atakuje cel Goblin 1 bronią Long Sword: trafienie.'),
    ).toBeInTheDocument()
    window.localStorage.clear()
  })

  it('deletes the battle after confirmation', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    apiGetMock.mockResolvedValue({ battle: battleFixture })
    apiDeleteMock.mockResolvedValue(undefined)

    renderRoute()
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(apiDeleteMock).toHaveBeenCalledWith('/api/v1/battles/5'))
    confirm.mockRestore()
  })

  it('hides deletion when not allowed and shows errors', async () => {
    apiGetMock.mockResolvedValueOnce({ battle: { ...battleFixture, can_delete: false } })
    const { unmount } = renderRoute()
    await screen.findByRole('heading', { name: 'Battle simulation' })
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    unmount()

    apiGetMock.mockRejectedValueOnce(new Error('forbidden'))
    renderRoute()
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the battle.')
  })
})
