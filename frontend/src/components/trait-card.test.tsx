import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { TraitCard } from './trait-card'

describe('TraitCard', () => {
  it('renders the header, eyebrow, and description', () => {
    render(<TraitCard title="Berserk" eyebrow="Edge" description="Strike with reckless fury." />)

    expect(screen.getByText('Berserk')).toBeInTheDocument()
    expect(screen.getByText('Edge')).toBeInTheDocument()
    expect(screen.getByText('Strike with reckless fury.')).toBeInTheDocument()
  })

  it('selects the whole card on click', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<TraitCard title="Berserk" onClick={onClick} />)

    await user.click(screen.getByRole('button', { name: /berserk/i }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('exposes the selected state to assistive technology', () => {
    const { container } = render(<TraitCard title="Berserk" selected />)

    const card = screen.getByRole('button', { name: /berserk/i })

    expect(card).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelector('[data-slot="trait-card"]')).toHaveAttribute(
      'data-selected',
      'true',
    )
  })

  it('renders artwork on the card face', () => {
    const { container } = render(
      <TraitCard title="Bolster" backgroundImage="/traits/bolster.png" />,
    )

    const artwork = container.querySelector('[data-slot="trait-card-artwork"]')

    expect(artwork).toHaveAttribute('src', '/traits/bolster.png')
  })

  it('applies hardcoded pixel dimensions for each size', () => {
    const { container } = render(<TraitCard title="Berserk" size="lg" />)

    expect(container.querySelector('[data-slot="trait-card"]')).toHaveStyle({
      width: '288px',
      height: '403px',
    })
  })

  it('does not fire when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<TraitCard title="Berserk" disabled onClick={onClick} />)

    await user.click(screen.getByRole('button', { name: /berserk/i }))

    expect(onClick).not.toHaveBeenCalled()
  })
})
