import type { Meta, StoryObj } from '@storybook/react-vite'

import { TooltipProvider } from '@/components/ui/tooltip'

import { DerivedStatistics } from './DerivedStatistics'

const meta = {
  title: 'Character Creation/Derived Statistics',
  component: DerivedStatistics,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DerivedStatistics>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <DerivedStatistics className="w-full max-w-xl" />
    </TooltipProvider>
  ),
}
