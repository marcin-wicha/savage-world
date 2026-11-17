import type { Meta, StoryObj } from '@storybook/react-vite'

import { CharacterAvatar } from './character-avatar'

const portrait =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#2a2724"/><circle cx="32" cy="24" r="12" fill="#e8e2d6"/><rect x="14" y="40" width="36" height="24" rx="12" fill="#e8e2d6"/></svg>',
  )

const meta = {
  title: 'Design System/CharacterAvatar',
  component: CharacterAvatar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    name: 'Katarina Voss',
    size: 'md',
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof CharacterAvatar>

export default meta
type Story = StoryObj<typeof meta>

export const Initials: Story = {}

export const WithImage: Story = {
  args: { src: portrait },
}

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-4">
      <CharacterAvatar {...args} size="sm" />
      <CharacterAvatar {...args} size="md" />
      <CharacterAvatar {...args} size="lg" />
    </div>
  ),
}
