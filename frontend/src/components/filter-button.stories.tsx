import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { FilterButton, type FilterOption } from './filter-button'

const rankOptions: FilterOption[] = [
  { value: 'novice', label: 'Novice' },
  { value: 'seasoned', label: 'Seasoned' },
  { value: 'veteran', label: 'Veteran' },
  { value: 'heroic', label: 'Heroic' },
  { value: 'legendary', label: 'Legendary' },
]

const categoryOptions: FilterOption[] = [
  { value: 'combat', label: 'Combat' },
  { value: 'social', label: 'Social' },
  { value: 'exploration', label: 'Exploration' },
  { value: 'arcane', label: 'Arcane' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'background', label: 'Background' },
  { value: 'professional', label: 'Professional' },
  { value: 'weird', label: 'Weird' },
]

const meta = {
  title: 'Design System/Filter Button',
  component: FilterButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    label: 'Rank',
    options: rankOptions,
  },
} satisfies Meta<typeof FilterButton>

export default meta
type Story = StoryObj<typeof meta>

export const SingleSelect: Story = {}

export const Active: Story = {
  args: {
    defaultValue: ['seasoned'],
  },
}

export const Multiple: Story = {
  args: {
    label: 'Category',
    options: categoryOptions,
    multiple: true,
    defaultValue: ['combat', 'social'],
  },
}

export const Searchable: Story = {
  args: {
    label: 'Category',
    options: categoryOptions,
    multiple: true,
    searchable: true,
  },
}

function ControlledFilter() {
  const [value, setValue] = useState<string[]>(['combat'])

  return (
    <div className="flex flex-col gap-3">
      <FilterButton
        label="Category"
        options={categoryOptions}
        multiple
        searchable
        value={value}
        onValueChange={setValue}
      />
      <p className="text-muted-foreground text-sm">
        Selected: {value.length > 0 ? value.join(', ') : 'none'}
      </p>
    </div>
  )
}

export const Controlled: Story = {
  render: () => <ControlledFilter />,
}
