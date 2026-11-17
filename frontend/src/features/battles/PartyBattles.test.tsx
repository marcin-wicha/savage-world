import { screen } from '@testing-library/react'

import { renderAt } from '@/features/parties/test-utils'
import { api } from '@/lib/api-client'

import { PartyBattles } from './PartyBattles'
import { battleFixture } from './test-fixtures'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return { ...actual, api: { ...actual.api, get: vi.fn() } }
})

const apiGetMock = vi.mocked(api.get)

describe('PartyBattles', () => {
  beforeEach(() => apiGetMock.mockReset())

  it('lists past battles and links to the simulator', async () => {
    apiGetMock.mockResolvedValue({ battles: [battleFixture] })

    renderAt('/p', '/p', <PartyBattles partyId={3} canSimulate />)

    expect(await screen.findByText('Party win rate 80%')).toBeInTheDocument()
    expect(screen.getByText(/1 enemy · 50 simulations/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View battle 5' })).toHaveAttribute(
      'href',
      '/battles/5',
    )
    expect(screen.getByRole('link', { name: 'Simulate battle' })).toHaveAttribute(
      'href',
      '/parties/3/battles/new',
    )
    expect(apiGetMock).toHaveBeenCalledWith('/api/v1/parties/3/battles', expect.any(Object))
  })

  it('hides the simulator link without characters and shows the empty state', async () => {
    apiGetMock.mockResolvedValue({ battles: [] })

    renderAt('/p', '/p', <PartyBattles partyId={3} canSimulate={false} />)

    expect(await screen.findByText('No battles yet.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Simulate battle' })).not.toBeInTheDocument()
  })
})
