import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { HomeRoute } from './HomeRoute'

describe('HomeRoute', () => {
  it('renders the product introduction', () => {
    render(
      <MemoryRouter>
        <HomeRoute />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /build your next legend/i })).toBeInTheDocument()
  })
})
