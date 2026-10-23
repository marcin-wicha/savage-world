import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { FilterButton, type FilterOption } from './filter-button'

const options: FilterOption[] = [
  { value: 'combat', label: 'Combat' },
  { value: 'social', label: 'Social' },
  { value: 'exploration', label: 'Exploration' },
]

describe('FilterButton', () => {
  it('selects a single option and shows its label', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()

    render(<FilterButton label="Category" options={options} onValueChange={onValueChange} />)

    await user.click(screen.getByRole('button', { name: 'Category filter' }))
    await user.click(screen.getByRole('button', { name: 'Combat' }))

    expect(onValueChange).toHaveBeenCalledWith(['combat'])
    expect(screen.getByRole('button', { name: 'Category filter, 1 selected' })).toHaveTextContent(
      'Combat',
    )
    expect(screen.getByRole('button', { name: 'Clear Category filter' })).toBeInTheDocument()
  })

  it('shows the selection count for multiple selection', async () => {
    const user = userEvent.setup()

    render(<FilterButton label="Category" options={options} multiple />)

    await user.click(screen.getByRole('button', { name: 'Category filter' }))
    await user.click(screen.getByRole('checkbox', { name: 'Combat' }))
    await user.click(screen.getByRole('checkbox', { name: 'Social' }))

    expect(screen.getByRole('button', { name: 'Category filter, 2 selected' })).toHaveTextContent(
      'Category (2)',
    )
    expect(screen.getByRole('checkbox', { name: 'Combat' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Social' })).toBeChecked()
  })

  it('clears the active filter with the X button', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()

    render(
      <FilterButton
        label="Category"
        options={options}
        defaultValue={['combat']}
        onValueChange={onValueChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Clear Category filter' }))

    expect(onValueChange).toHaveBeenCalledWith([])
    expect(screen.getByRole('button', { name: 'Category filter' })).toHaveTextContent('Category')
    expect(screen.queryByRole('button', { name: 'Clear Category filter' })).not.toBeInTheDocument()
  })

  it('filters the option list with the search input', async () => {
    const user = userEvent.setup()

    render(<FilterButton label="Category" options={options} multiple searchable />)

    await user.click(screen.getByRole('button', { name: 'Category filter' }))
    await user.type(screen.getByRole('textbox', { name: 'Search Category options' }), 'soc')

    expect(screen.getByRole('checkbox', { name: 'Social' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Combat' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Exploration' })).not.toBeInTheDocument()
  })

  it('shows the empty state when no options match', async () => {
    const user = userEvent.setup()

    render(<FilterButton label="Category" options={options} searchable />)

    await user.click(screen.getByRole('button', { name: 'Category filter' }))
    await user.type(screen.getByRole('textbox', { name: 'Search Category options' }), 'zzz')

    expect(screen.getByText('No options found.')).toBeInTheDocument()
  })
})
