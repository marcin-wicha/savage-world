import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { MultiStepFlow, type MultiStepFlowStep } from './multi-step-flow'

const steps: MultiStepFlowStep[] = [
  { id: 'concept', title: 'Concept', content: <p>Concept content</p> },
  { id: 'attributes', title: 'Attributes', content: <p>Attributes content</p> },
  { id: 'edges', title: 'Edges', content: <p>Edges content</p> },
]

describe('MultiStepFlow', () => {
  it('renders the current step and marks it in the header', () => {
    render(<MultiStepFlow steps={steps} />)

    expect(screen.getByText('Concept content')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /concept/i })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('button', { name: /back/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /attributes/i })).toBeDisabled()
  })

  it('advances and goes back through the flow', async () => {
    const user = userEvent.setup()

    render(<MultiStepFlow steps={steps} />)

    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Attributes content')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /completed.*concept/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /concept/i }))
    expect(screen.getByText('Concept content')).toBeInTheDocument()
  })

  it('calls onStepChange when navigating', async () => {
    const user = userEvent.setup()
    const onStepChange = vi.fn()

    render(<MultiStepFlow steps={steps} onStepChange={onStepChange} />)

    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(onStepChange).toHaveBeenCalledWith(1)
  })

  it('does not navigate when controlled without updating currentStep', async () => {
    const user = userEvent.setup()
    const onStepChange = vi.fn()

    render(<MultiStepFlow steps={steps} currentStep={0} onStepChange={onStepChange} />)

    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(onStepChange).toHaveBeenCalledWith(1)
    expect(screen.getByText('Concept content')).toBeInTheDocument()
  })

  it('disables advancing when the current step cannot advance', () => {
    const canAdvance = vi.fn(() => false)

    render(<MultiStepFlow steps={steps} canAdvance={canAdvance} />)

    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
    expect(canAdvance).toHaveBeenCalledWith(steps[0], 0)
  })

  it('calls onBack from the first step when provided', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()

    render(<MultiStepFlow steps={steps} onBack={onBack} />)

    const back = screen.getByRole('button', { name: /back/i })
    expect(back).toBeEnabled()

    await user.click(back)

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('blocks advancing when onBeforeNext resolves false', async () => {
    const user = userEvent.setup()
    const onBeforeNext = vi.fn(async () => false)

    render(<MultiStepFlow steps={steps} onBeforeNext={onBeforeNext} />)

    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(onBeforeNext).toHaveBeenCalledWith(steps[0], 0)
    expect(screen.getByText('Concept content')).toBeInTheDocument()
  })

  it('advances when onBeforeNext resolves true', async () => {
    const user = userEvent.setup()
    const onBeforeNext = vi.fn(async () => true)

    render(<MultiStepFlow steps={steps} onBeforeNext={onBeforeNext} />)

    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(await screen.findByText('Attributes content')).toBeInTheDocument()
  })

  it('calls onComplete from the final step', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()

    render(
      <MultiStepFlow
        steps={steps}
        defaultStep={2}
        completeLabel="Save character"
        onComplete={onComplete}
      />,
    )

    await user.click(screen.getByRole('button', { name: /save character/i }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Edges content')).toBeInTheDocument()
  })

  it('renders nothing without steps', () => {
    const { container } = render(<MultiStepFlow steps={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
