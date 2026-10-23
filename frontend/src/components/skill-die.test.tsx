import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SkillDie } from './skill-die'

function getGroup() {
  return screen.getByRole('group', { name: 'Skill die' })
}

describe('SkillDie', () => {
  it('renders d4 through d12 and a modifier input', () => {
    render(<SkillDie />)

    const group = getGroup()
    const buttons = within(group).getAllByRole('button')

    expect(buttons).toHaveLength(5)

    for (const die of ['d4', 'd6', 'd8', 'd10', 'd12']) {
      expect(screen.getByRole('button', { name: `Toggle ${die}` })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    }

    expect(screen.queryByRole('button', { name: 'Toggle d20' })).not.toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Modifier' })).toBeInTheDocument()
  })

  it('activates only one die at a time', async () => {
    const user = userEvent.setup()
    const onDieChange = vi.fn()

    render(<SkillDie onDieChange={onDieChange} />)

    const d6 = screen.getByRole('button', { name: 'Toggle d6' })
    const d8 = screen.getByRole('button', { name: 'Toggle d8' })

    await user.click(d6)

    expect(d6).toHaveAttribute('aria-pressed', 'true')
    expect(d8).toHaveAttribute('aria-pressed', 'false')
    expect(onDieChange).toHaveBeenLastCalledWith('d6')

    await user.click(d8)

    expect(d6).toHaveAttribute('aria-pressed', 'false')
    expect(d8).toHaveAttribute('aria-pressed', 'true')
    expect(onDieChange).toHaveBeenLastCalledWith('d8')

    await user.click(d8)

    expect(d8).toHaveAttribute('aria-pressed', 'true')
    expect(onDieChange).toHaveBeenCalledTimes(2)
  })

  it('supports a controlled die', async () => {
    const user = userEvent.setup()
    const onDieChange = vi.fn()

    render(<SkillDie die="d10" onDieChange={onDieChange} />)

    await user.click(screen.getByRole('button', { name: 'Toggle d12' }))

    expect(onDieChange).toHaveBeenCalledWith('d12')
    expect(screen.getByRole('button', { name: 'Toggle d10' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Toggle d12' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('reports modifier changes and clears back to zero', async () => {
    const user = userEvent.setup()
    const onModifierChange = vi.fn()

    render(<SkillDie onModifierChange={onModifierChange} />)

    const input = screen.getByRole('spinbutton', { name: 'Modifier' })

    await user.type(input, '2')

    expect(onModifierChange).toHaveBeenLastCalledWith(2)
    expect(input).toHaveValue(2)

    await user.clear(input)

    expect(onModifierChange).toHaveBeenLastCalledWith(0)
    expect(input).toHaveValue(null)
  })

  it('clamps negative modifiers to zero', () => {
    const onModifierChange = vi.fn()

    render(<SkillDie onModifierChange={onModifierChange} />)

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Modifier' }), {
      target: { value: '-3' },
    })

    expect(onModifierChange).toHaveBeenLastCalledWith(0)
  })

  it('renders only the active die and modifier in read-only mode', () => {
    render(<SkillDie readOnly defaultDie="d10" defaultModifier={2} />)

    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Skill die: d10+2' })).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('omits the modifier when it is zero in read-only mode', () => {
    render(<SkillDie readOnly defaultDie="d8" />)

    expect(screen.getByRole('img', { name: 'Skill die: d8' })).toBeInTheDocument()
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument()
  })

  it('renders nothing in read-only mode without a selected die', () => {
    const { container } = render(<SkillDie readOnly />)

    expect(container).toBeEmptyDOMElement()
  })

  it('disables the dice and modifier input', () => {
    render(<SkillDie disabled />)

    for (const die of ['d4', 'd6', 'd8', 'd10', 'd12']) {
      expect(screen.getByRole('button', { name: `Toggle ${die}` })).toBeDisabled()
    }

    expect(screen.getByRole('spinbutton', { name: 'Modifier' })).toBeDisabled()
  })

  it('disables dice above the maximum die while keeping lower dice available', () => {
    render(<SkillDie die="d8" maxDie="d8" />)

    expect(screen.getByRole('button', { name: 'Toggle d6' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Toggle d8' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Toggle d10' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Toggle d12' })).toBeDisabled()
  })
})
