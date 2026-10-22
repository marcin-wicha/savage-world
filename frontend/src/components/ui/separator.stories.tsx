import type { Meta, StoryObj } from '@storybook/react-vite'

import { Separator } from './separator'

const meta = {
  title: 'Design System/Separator',
  component: Separator,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Separator>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  render: (args) => (
    <div className="w-72">
      <p className="text-sm font-medium">Attributes</p>
      <p className="text-muted-foreground text-sm">Agility, Smarts, Spirit, Strength, Vigor</p>
      <Separator {...args} className="my-4" />
      <p className="text-sm font-medium">Skills</p>
      <p className="text-muted-foreground text-sm">Core and advanced skills live here.</p>
    </div>
  ),
}

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
  },
  render: (args) => (
    <div className="flex h-12 items-center gap-4 text-sm">
      <span>Novice</span>
      <Separator {...args} />
      <span>Seasoned</span>
      <Separator {...args} />
      <span>Veteran</span>
    </div>
  ),
}
