import type { Preview } from '@storybook/react-vite'

import '../src/index.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: [
          'Design System',
          ['Introduction', 'Foundations', 'Button', 'Badge', 'Card', 'Input', 'Label', 'Separator'],
        ],
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme === 'light' ? 'light' : 'dark'

      return (
        <div className={theme === 'dark' ? 'dark' : undefined}>
          <div className="bg-background text-foreground min-h-screen p-6">
            <Story />
          </div>
        </div>
      )
    },
  ],
}

export default preview
