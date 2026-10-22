import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { CharactersRoute } from './CharactersRoute'

describe('CharactersRoute', () => {
  it('links to the character creation flow', () => {
    render(
      <MemoryRouter>
        <CharactersRoute />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /create a character/i })).toHaveAttribute(
      'href',
      '/characters/new',
    )
  })
})
