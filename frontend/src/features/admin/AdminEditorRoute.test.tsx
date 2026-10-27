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
const referenceData = {
  resources: [
    { key: 'origins', label: 'Origins', count: 1 },
    { key: 'edges', label: 'Edges', count: 2 },
  ],
}
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

  it('searches and filters records', async () => {
    const user = userEvent.setup()
    useRestQueryMock.mockImplementation((_key, path) => {
      if (path === '/api/v1/admin/reference_data') {
        return { data: referenceData, isPending: false, isError: false } as never
      }
      return {
        data: {
          resource: 'edges',
          records: [
            { id: 1, name: 'Alertness', slug: 'alertness', category: 'background' },
            { id: 2, name: 'Berserk', slug: 'berserk', category: 'combat' },
          ],
        },
        isPending: false,
        isError: false,
      } as never
    })

    renderEditor()
    await user.click(screen.getByRole('button', { name: /edges/i }))
    expect(screen.getByText('Alertness')).toBeInTheDocument()
    expect(screen.getByText('Berserk')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Search Edges' }), 'alert')
    expect(screen.getByText('Alertness')).toBeInTheDocument()
    expect(screen.queryByText('Berserk')).not.toBeInTheDocument()

    await user.clear(screen.getByRole('textbox', { name: 'Search Edges' }))
    await user.click(screen.getByRole('button', { name: 'Category filter' }))
    await user.click(screen.getByRole('button', { name: 'combat' }))
    expect(screen.queryByText('Alertness')).not.toBeInTheDocument()
    expect(screen.getByText('Berserk')).toBeInTheDocument()
  })

  it('opens the selected record form in a modal over the table', async () => {
    const user = userEvent.setup()

    renderEditor()
    await user.click(screen.getByRole('button', { name: /edit/i }))

    expect(screen.getByRole('dialog', { name: 'Edit Origin' })).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
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
