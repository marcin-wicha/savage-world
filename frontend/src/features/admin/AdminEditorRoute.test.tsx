import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/lib/query-client'
import { useRestMutation, useRestQuery } from '@/lib/queries'

import { AdminEditorRoute } from './AdminEditorRoute'

vi.mock('@/lib/queries', () => ({
  useRestMutation: vi.fn(),
  useRestQuery: vi.fn(),
}))

const useRestMutationMock = vi.mocked(useRestMutation)
const useRestQueryMock = vi.mocked(useRestQuery)
const referenceData = { resources: [{ key: 'origins', label: 'Origins', count: 1 }] }
const recordsData = {
  resource: 'origins',
  records: [{ id: 7, name: 'Human', slug: 'human', description: 'A flexible origin.' }],
}

function renderEditor() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AdminEditorRoute />
    </QueryClientProvider>,
  )
}

describe('AdminEditorRoute', () => {
  beforeEach(() => {
    useRestQueryMock.mockImplementation((_key, path) => {
      if (path === '/api/v1/admin/reference_data') {
        return {
          data: referenceData,
          isPending: false,
          isError: false,
        } as never
      }

      return {
        data: recordsData,
        isPending: false,
        isError: false,
      } as never
    })
    useRestMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
  })

  it('shows resources, records, and row actions', () => {
    renderEditor()

    expect(screen.getByRole('button', { name: /origins/i })).toBeInTheDocument()
    expect(screen.getByText('Human')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('submits a new record through the REST mutation', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    useRestMutationMock.mockReturnValue({ mutate, isPending: false } as never)

    renderEditor()
    await user.click(screen.getByRole('button', { name: /add origin/i }))
    await user.type(screen.getByLabelText(/name/i), 'Elf')
    await user.type(screen.getByLabelText(/description/i), 'A graceful origin.')
    await user.click(screen.getByRole('button', { name: /create record/i }))

    expect(mutate).toHaveBeenCalledWith({
      record: { name: 'Elf', slug: null, description: 'A graceful origin.' },
    })
  })
})
