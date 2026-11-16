import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { api } from '@/lib/api-client'

import { PartiesRoute } from './PartiesRoute'
import { renderAt } from './test-utils'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } }
})

const apiGetMock = vi.mocked(api.get)
const apiPostMock = vi.mocked(api.post)

function renderRoute() {
  return renderAt('/list', '/list', <PartiesRoute />)
}

describe('PartiesRoute', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPostMock.mockReset()
  })

  it('lists parties with the viewer role', async () => {
    apiGetMock.mockResolvedValue({
      parties: [
        {
          id: 1,
          name: 'The Crew',
          description: 'Treasure hunters',
          led_by_me: true,
          member_count: 2,
          my_status: null,
        },
        {
          id: 2,
          name: 'Night Watch',
          description: null,
          led_by_me: false,
          member_count: 3,
          my_status: 'pending',
        },
      ],
    })

    renderRoute()

    expect(await screen.findByText('The Crew')).toBeInTheDocument()
    expect(screen.getByText('Leader')).toBeInTheDocument()
    expect(screen.getByText('Awaiting approval')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Open' })).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/parties/1')
  })

  it('shows the empty and error states', async () => {
    apiGetMock.mockResolvedValueOnce({ parties: [] })
    const { unmount } = renderRoute()
    expect(await screen.findByText('You are not in any party yet.')).toBeInTheDocument()
    unmount()

    apiGetMock.mockRejectedValueOnce(new Error('boom'))
    renderRoute()
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load parties')
  })

  it('validates and creates a party', async () => {
    const user = userEvent.setup()
    apiGetMock.mockResolvedValue({ parties: [] })
    apiPostMock.mockResolvedValue({ party: { id: 9 } })

    renderRoute()

    await user.click(await screen.findByRole('button', { name: 'Create party' }))
    expect(await screen.findByText('Party name is required.')).toBeInTheDocument()
    expect(apiPostMock).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Party name'), 'The Crew')
    await user.type(screen.getByLabelText('Description'), 'Heist')
    await user.click(screen.getByRole('button', { name: 'Create party' }))

    expect(apiPostMock).toHaveBeenCalledWith('/api/v1/parties', {
      party: { name: 'The Crew', description: 'Heist' },
    })
  })

  it('reports a failed create', async () => {
    const user = userEvent.setup()
    apiGetMock.mockResolvedValue({ parties: [] })
    apiPostMock.mockRejectedValue(new Error('nope'))

    renderRoute()

    await user.type(await screen.findByLabelText('Party name'), 'The Crew')
    await user.click(screen.getByRole('button', { name: 'Create party' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not create the party')
  })
})
