import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
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
