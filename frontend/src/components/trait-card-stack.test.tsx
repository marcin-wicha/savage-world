import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { TraitCardStack, type TraitCardStackTrait } from './trait-card-stack'

const traits: TraitCardStackTrait[] = [
  { title: 'Berserk', description: 'Strike with reckless fury.' },
  { title: 'Hard to Kill', description: 'Ignore a wound.' },
  { title: 'Quick', description: 'Draw a better initiative card.' },
]

describe('TraitCardStack', () => {
  it('shows the category on the card back', () => {
    render(<TraitCardStack category="Combat" traits={traits} />)

    expect(screen.getByText('Combat')).toBeInTheDocument()
  })

  it('renders the shared artwork on every card back', () => {
    const { container } = render(<TraitCardStack category="Combat" traits={traits} />)

    const artwork = container.querySelectorAll('[data-slot="trait-card-stack-back-art"]')

    expect(artwork).toHaveLength(3)
    artwork.forEach((image) => expect(image).toHaveAttribute('src', '/traits/back.png'))
  })

  it('reveals up to the requested number of cards at once', () => {
    render(<TraitCardStack category="Combat" traits={traits} revealedCount={2} defaultOpen />)

    expect(screen.getByText('Berserk')).toBeInTheDocument()
    expect(screen.getByText('Hard to Kill')).toBeInTheDocument()
    expect(screen.queryByText('Quick')).not.toBeInTheDocument()
  })

  it('reveals the first trait when the back is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const { container } = render(
      <TraitCardStack category="Combat" traits={traits} onOpenChange={onOpenChange} />,
    )

    const front = container.querySelector('[data-slot="trait-card-stack-front"]')

    expect(front).toHaveAttribute('inert')

    await user.click(screen.getByRole('button', { name: 'Reveal Combat traits' }))

    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(front).not.toHaveAttribute('inert')
    expect(container.querySelector('[data-slot="trait-card-stack"]')).toHaveAttribute(
      'data-open',
      'true',
    )
  })

  it('pages through the traits with the carousel arrows', async () => {
    const user = userEvent.setup()
    render(<TraitCardStack category="Combat" traits={traits} revealedCount={2} defaultOpen />)

    await user.click(screen.getByRole('button', { name: 'Next trait' }))

    expect(screen.getByText('Quick')).toBeInTheDocument()
    expect(screen.queryByText('Berserk')).not.toBeInTheDocument()
    expect(screen.queryByText('Hard to Kill')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next trait' }))

    expect(screen.getByText('Berserk')).toBeInTheDocument()
    expect(screen.getByText('Hard to Kill')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous trait' }))

    expect(screen.getByText('Quick')).toBeInTheDocument()
  })

  it('calls onSelect when the revealed card is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<TraitCardStack category="Combat" traits={traits} defaultOpen onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: 'Berserk' }))

    expect(onSelect).toHaveBeenCalledWith(traits[0], 0)
  })

  it('hides the arrows until the stack is revealed', () => {
    render(<TraitCardStack category="Combat" traits={traits} />)

    expect(screen.queryByRole('button', { name: 'Next trait' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous trait' })).not.toBeInTheDocument()
  })
})
