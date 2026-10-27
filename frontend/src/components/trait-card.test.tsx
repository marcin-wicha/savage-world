import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { TraitCard } from './trait-card'

describe('TraitCard', () => {
  it('renders the header, eyebrow, and description', () => {
    render(<TraitCard title="Berserk" eyebrow="Edge" description="Strike with reckless fury." />)

    expect(screen.getByText('Berserk')).toBeInTheDocument()
    expect(screen.getByText('Edge')).toBeInTheDocument()
    expect(screen.getByText('Strike with reckless fury.')).toBeInTheDocument()
  })

  it('renders header content in the sticky card header', () => {
    const { container } = render(
      <TraitCard title="Berserk" headerContent={<span>Die controls</span>} />,
    )

    const header = container.querySelector('[data-slot="card-header"]')

    expect(header).toContainElement(screen.getByText('Die controls'))
  })

  it('keeps long descriptions inside a scrollable card body', () => {
    const { container } = render(
      <TraitCard
        title="Long Hindrance"
        size="lg"
        description={'A spell gone wrong. '.repeat(100)}
      />,
    )

    const description = container.querySelector('[data-slot="trait-card-description"]')
    const footer = container.querySelector('[data-slot="trait-card-footer"]')
    const header = container.querySelector('[data-slot="card-header"]')

    expect(footer).toHaveClass('pointer-events-none')
    expect(description).toHaveClass('pointer-events-auto', 'max-h-72')
    expect(description?.firstElementChild).toHaveClass('overflow-y-auto')
    expect(header).toHaveClass('sticky', 'top-0')
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

  it('hides artwork that fails to load', () => {
    const { container } = render(
      <TraitCard title="Bolster" backgroundImage="/traits/missing.png" />,
    )

    const artwork = container.querySelector('[data-slot="trait-card-artwork"]')

    expect(artwork).toBeInTheDocument()

    fireEvent.error(artwork!)

    expect(artwork).not.toBeVisible()
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
