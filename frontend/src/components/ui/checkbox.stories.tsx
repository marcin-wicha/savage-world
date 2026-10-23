import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Checkbox } from './checkbox'

const meta = {
  title: 'Design System/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    'aria-label': 'Accept terms',
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
}

function ControlledCheckbox() {
  const [checked, setChecked] = useState(false)

  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(value) => setChecked(value === true)} />
      <span>{checked ? 'Checked' : 'Unchecked'}</span>
    </label>
  )
}

export const Controlled: Story = {
  render: () => <ControlledCheckbox />,
}
