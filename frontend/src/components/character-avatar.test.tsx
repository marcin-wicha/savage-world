import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CharacterAvatar } from './character-avatar'

describe('CharacterAvatar', () => {
  it('renders the uploaded image with an accessible name', () => {
    render(<CharacterAvatar name="Katarina Voss" src="/api/v1/characters/1/avatar/abc" />)

    expect(screen.getByRole('img', { name: 'Katarina Voss' })).toHaveAttribute(
      'src',
      '/api/v1/characters/1/avatar/abc',
    )
  })

  it('falls back to decorative initials without an image', () => {
    const { container } = render(<CharacterAvatar name="Katarina Voss" />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container).toHaveTextContent('KV')
  })
})
