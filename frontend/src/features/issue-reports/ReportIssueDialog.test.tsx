import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, api } from '@/lib/api-client'
import { LanguageProvider } from '@/lib/i18n'
import { createQueryClient } from '@/lib/query-client'

import { ReportIssueButton } from './ReportIssueDialog'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return {
    ...actual,
    api: {
      ...actual.api,
      post: vi.fn(),
    },
  }
})

const apiPostMock = vi.mocked(api.post)

function renderButton() {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <LanguageProvider>
        <MemoryRouter initialEntries={['/characters/new?step=skills']}>
          <ReportIssueButton />
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  )
}

describe('ReportIssueButton', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  it('opens the report dialog from the bug icon', async () => {
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: 'Report an issue' }))

    expect(screen.getByRole('dialog', { name: 'Report an issue' })).toBeInTheDocument()
  })

  it.each([{ ctrlKey: true }, { metaKey: true }])(
    'opens the report dialog with the keyboard shortcut %o',
    (modifier) => {
      renderButton()

      const event = new KeyboardEvent('keydown', { key: 'b', cancelable: true, ...modifier })
      fireEvent(window, event)

      expect(event.defaultPrevented).toBe(true)
      expect(screen.getByRole('dialog', { name: 'Report an issue' })).toBeInTheDocument()
    },
  )

  it('ignores B without a modifier', () => {
    renderButton()

    fireEvent.keyDown(window, { key: 'b' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('validates required fields before sending', async () => {
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: 'Report an issue' }))
    await user.click(screen.getByRole('button', { name: 'Send report' }))

    expect(await screen.findByText('Title is required.')).toBeInTheDocument()
    expect(screen.getByText('Description is required.')).toBeInTheDocument()
    expect(apiPostMock).not.toHaveBeenCalled()
  })

  it('submits the report with page context and links to the created issue', async () => {
    const user = userEvent.setup()
    apiPostMock.mockResolvedValue({
      issue: { number: 42, url: 'https://github.com/owner/repo/issues/42' },
    } as never)
    renderButton()

    await user.click(screen.getByRole('button', { name: 'Report an issue' }))
    await user.type(screen.getByLabelText('Title'), 'Skill dice reset')
    await user.type(screen.getByLabelText('Description'), 'Going back resets my skills.')
    await user.click(screen.getByRole('button', { name: 'Send report' }))

    expect(await screen.findByRole('link', { name: '#42' })).toHaveAttribute(
      'href',
      'https://github.com/owner/repo/issues/42',
    )
    expect(apiPostMock).toHaveBeenCalledWith('/api/v1/issue_reports', {
      issue_report: expect.objectContaining({
        title: 'Skill dice reset',
        description: 'Going back resets my skills.',
        page_url: '/characters/new?step=skills',
        language: 'en',
      }),
    })
  })

  it('shows an error when the report cannot be sent', async () => {
    const user = userEvent.setup()
    apiPostMock.mockRejectedValue(new ApiError('Could not create the issue', 502, null))
    renderButton()

    await user.click(screen.getByRole('button', { name: 'Report an issue' }))
    await user.type(screen.getByLabelText('Title'), 'Broken')
    await user.type(screen.getByLabelText('Description'), 'Nothing works.')
    await user.click(screen.getByRole('button', { name: 'Send report' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not send the report. Please try again.',
    )
  })
})
