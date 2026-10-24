import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from './button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

const meta = {
  title: 'Design System/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover for details</Button>
        </TooltipTrigger>
        <TooltipContent>Helpful information appears here.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
}
