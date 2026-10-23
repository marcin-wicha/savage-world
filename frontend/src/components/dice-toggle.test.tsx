import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DiceToggle } from './dice-toggle'
import { diceTypes } from './dice-types'

describe('DiceToggle', () => {
  it('renders an inactive toggle for each dice type', () => {
    render(
      <div>
        {diceTypes.map((dice) => (
          <DiceToggle key={dice} dice={dice} />
        ))}
      </div>,
    )

    for (const dice of diceTypes) {
      expect(screen.getByRole('button', { name: `Toggle ${dice}` })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    }
  })

  it('toggles its active state when clicked', async () => {
    const user = userEvent.setup()
    const onPressedChange = vi.fn()

    render(<DiceToggle dice="d8" onPressedChange={onPressedChange} />)

    const button = screen.getByRole('button', { name: 'Toggle d8' })

    await user.click(button)

    expect(onPressedChange).toHaveBeenLastCalledWith(true)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveAttribute('data-active', 'true')

    await user.click(button)

    expect(onPressedChange).toHaveBeenLastCalledWith(false)
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveAttribute('data-active', 'false')
  })

  it('toggles with the keyboard and exposes a pointer cursor', async () => {
    const user = userEvent.setup()

    render(<DiceToggle dice="d10" />)

    const button = screen.getByRole('button', { name: 'Toggle d10' })

    expect(button).toHaveClass('cursor-pointer')

    await user.tab()
    expect(button).toHaveFocus()

    await user.keyboard(' ')
    expect(button).toHaveAttribute('aria-pressed', 'true')

    await user.keyboard('{Enter}')
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('respects controlled pressed state', async () => {
    const user = userEvent.setup()
    const onPressedChange = vi.fn()

    render(<DiceToggle dice="d20" pressed={false} onPressedChange={onPressedChange} />)

    const button = screen.getByRole('button', { name: 'Toggle d20' })

    await user.click(button)

    expect(onPressedChange).toHaveBeenCalledWith(true)
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('uses the icon button size by default and accepts a size override', () => {
    const { rerender } = render(<DiceToggle dice="d6" />)

    expect(screen.getByRole('button', { name: 'Toggle d6' })).toHaveAttribute('data-size', 'icon')

    rerender(<DiceToggle dice="d6" size="sm" />)

    expect(screen.getByRole('button', { name: 'Toggle d6' })).toHaveAttribute('data-size', 'sm')
  })

  it.each([
    ['icon-xs', 'size-7'],
    ['icon-sm', 'size-8'],
    ['icon', 'size-10'],
    ['icon-lg', 'size-12'],
  ] as const)('scales the icon for the %s button size', (size, iconClass) => {
    const { container } = render(<DiceToggle dice="d6" size={size} />)

    expect(container.querySelector('svg')).toHaveClass(iconClass)
  })

  it('accepts a custom label', () => {
    render(<DiceToggle dice="d6" label="Toggle Strength die" />)

    expect(screen.getByRole('button', { name: 'Toggle Strength die' })).toBeInTheDocument()
  })

  it('renders imported svg icons as currentColor components', () => {
    const { container } = render(<DiceToggle dice="d4" />)

    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '-40 -40 80 80')
    expect(container.querySelector('path')).toHaveAttribute('fill', 'currentColor')
  })
})
