import type { Meta, StoryObj } from '@storybook/react-vite'

import { Textarea } from './textarea'

const meta = {
  title: 'Design System/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    placeholder: 'A wandering monster hunter chasing a debt across the frontier.',
    disabled: false,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: 'This textarea is disabled.',
  },
}
