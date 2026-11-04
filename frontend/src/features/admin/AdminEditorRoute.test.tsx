import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, api } from '@/lib/api-client'
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
    expect(screen.getByRole('button', { name: /^edit$/i }).parentElement).not.toHaveClass(
      'opacity-0',
    )
    expect(screen.getByText('Human').closest('tr')).toHaveClass('block', 'sm:table-row')
    expect(screen.getAllByText('Slug')).toHaveLength(2)
  })

  it('searches and filters records', async () => {
    const user = userEvent.setup()
    const edgeRecords = {
      resource: 'edges',
      records: [
        { id: 1, name: 'Alertness', slug: 'alertness', category: 'background' },
        { id: 2, name: 'Berserk', slug: 'berserk', category: 'combat' },
      ],
    }
    useRestQueryMock.mockImplementation((_key, path) => {
      if (path === '/api/v1/admin/reference_data') {
        return { data: referenceData, isPending: false, isError: false } as never
      }
      return {
        data: edgeRecords,
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

  it('shows powers and their reference fields in the Powers resource', async () => {
    const user = userEvent.setup()
    const resources = { resources: [{ key: 'powers', label: 'Powers', count: 1 }] }
    const powerRecords = {
      resource: 'powers',
      records: [
        {
          id: 1,
          name: 'Arcane Bolt',
          slug: 'arcane-bolt',
          rank: 'novice',
          power_points: '1',
          duration: 'Instant',
          range: 'Smarts×2',
          summary: 'A ranged arcane attack.',
          source_book: 'Fantasy Companion',
          source_page: 146,
        },
      ],
    }
    useRestQueryMock.mockImplementation((_key, path) => {
      if (path === '/api/v1/admin/reference_data') {
        return {
          data: resources,
          isPending: false,
          isError: false,
        } as never
      }

      return {
        data: powerRecords,
        isPending: false,
        isError: false,
      } as never
    })

    renderEditor()
    await user.click(screen.getByRole('button', { name: /powers/i }))

    expect(screen.getByText('Arcane Bolt')).toBeInTheDocument()
    expect(screen.getByText('Smarts×2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /edit/i }))
    expect(screen.getByRole('combobox', { name: 'Rank' })).toHaveValue('novice')
    expect(screen.getByRole('textbox', { name: 'Power points' })).toHaveValue('1')
    expect(screen.getByRole('textbox', { name: 'Duration' })).toHaveValue('Instant')
    expect(screen.getByRole('textbox', { name: 'Summary' })).toHaveValue('A ranged arcane attack.')
  })

  it('opens the selected record form in a modal over the table', async () => {
    const user = userEvent.setup()

    renderEditor()
    await user.click(screen.getByRole('button', { name: /edit/i }))

    expect(screen.getByRole('dialog', { name: 'Edit Origin' })).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it.each(['origins', 'edges', 'hindrances', 'skills', 'gears'])(
    'toggles visibility for %s',
    async (resource) => {
      const user = userEvent.setup()
      const mutate = vi.fn()
      useRestMutationMock.mockReturnValue({ mutate, isPending: false } as never)
      const resources = { resources: [{ key: resource, label: resource, count: 1 }] }
      const records = {
        resource,
        records: [
          {
            id: 7,
            name: 'Draft',
            slug: 'draft',
            description: 'Draft description',
            hidden: true,
            severity: 'minor',
            category: 'background',
            minimum_rank: 'novice',
            requirements: [],
            effects: {},
            cost: '10',
            source_book: 'SWADE',
            source_page: 1,
            linked_attribute: 'agility',
            core: false,
            repeatable: false,
          },
        ],
      }
      useRestQueryMock.mockImplementation(
        (_key, path) =>
          ({
            data: path === '/api/v1/admin/reference_data' ? resources : records,
            isPending: false,
            isError: false,
          }) as never,
      )

      renderEditor()
      await user.click(screen.getByRole('button', { name: /edit/i }))
      const toggle = screen.getByRole('checkbox', { name: 'Hidden from character creator' })
      expect(toggle).toBeChecked()
      await user.click(toggle)
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
      expect(mutate).toHaveBeenCalledWith({ record: expect.objectContaining({ hidden: false }) })
    },
  )

  it.each(['origins', 'edges', 'hindrances', 'skills'])(
    'edits and clears the database artwork URL for %s',
    async (resource) => {
      const user = userEvent.setup()
      const mutate = vi.fn()
      const artworkUrl = 'https://cdn.example.com/custom/reference-illustration.webp'
      useRestMutationMock.mockReturnValue({ mutate, isPending: false } as never)
      const resources = { resources: [{ key: resource, label: resource, count: 1 }] }
      const records = {
        resource,
        records: [
          {
            id: 7,
            name: 'Custom reference',
            slug: 'custom-reference',
            description: 'A reference entry.',
            artwork_url: artworkUrl,
            severity: 'minor',
            category: 'background',
            minimum_rank: 'novice',
            requirements: [],
            source_book: 'SWADE',
            source_page: 1,
            repeatable: false,
            linked_attribute: 'agility',
            core: false,
          },
        ],
      }
      useRestQueryMock.mockImplementation((_key, path) => {
        return {
          data: path === '/api/v1/admin/reference_data' ? resources : records,
          isPending: false,
          isError: false,
        } as never
      })

      renderEditor()
      await user.click(screen.getByRole('button', { name: /edit/i }))
      const artworkInput = screen.getByRole('textbox', { name: 'Artwork URL' })
      expect(artworkInput).toHaveValue(artworkUrl)

      await user.clear(artworkInput)
      await user.type(artworkInput, 'https://images.example.org/replacement.png')
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
      expect(mutate).toHaveBeenLastCalledWith({
        record: expect.objectContaining({
          artwork_url: 'https://images.example.org/replacement.png',
        }),
      })

      await user.clear(artworkInput)
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
      expect(mutate).toHaveBeenLastCalledWith({
        record: expect.objectContaining({ artwork_url: null }),
      })
    },
  )

  it.each(['origins', 'edges', 'hindrances', 'skills', 'gears'])(
    'uploads artwork after creating %s and closes on success',
    async (resource) => {
      const user = userEvent.setup()
      const post = vi.spyOn(api, 'post').mockResolvedValue({ artwork_url: '/api/v1/artwork/new' })
      const resources = { resources: [{ key: resource, label: resource, count: 0 }] }
      const records = { resource, records: [] }
      useRestQueryMock.mockImplementation(
        (_key, path) =>
          ({
            data: path === '/api/v1/admin/reference_data' ? resources : records,
            isPending: false,
            isError: false,
          }) as never,
      )
      useRestMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false } as never)

      renderEditor()
      await user.click(screen.getByRole('button', { name: 'Add the first record' }))
      await user.upload(
        screen.getByLabelText('Upload artwork'),
        new File(['image'], 'art.png', { type: 'image/png' }),
      )
      const createOptions = useRestMutationMock.mock.calls
        .filter(([config]) => config.method === 'POST')
        .at(-1)?.[1]
      expect(post).not.toHaveBeenCalled()
      await act(async () => {
        createOptions?.onSuccess?.(
          { record: { id: 42 } } as never,
          { record: {} },
          undefined,
          {} as never,
        )
      })

      await waitFor(() => expect(post).toHaveBeenCalledOnce())
      const [path, body] = post.mock.calls[0]
      expect(path).toBe(`/api/v1/admin/${resource}/42/artwork`)
      expect(body).toBeInstanceOf(FormData)
      expect((body as FormData).get('file')).toBeInstanceOf(File)
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      post.mockRestore()
    },
  )

  it('uploads replacement artwork after updating a record', async () => {
    const user = userEvent.setup()
    const post = vi.spyOn(api, 'post').mockResolvedValue({ artwork_url: '/api/v1/artwork/updated' })
    useRestMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false } as never)

    renderEditor()
    await user.click(screen.getByRole('button', { name: /edit/i }))
    await user.upload(
      screen.getByLabelText('Upload artwork'),
      new File(['replacement'], 'new.webp', { type: 'image/webp' }),
    )
    await act(async () => {
      useRestMutationMock.mock.calls
        .filter(([config]) => config.method === 'PATCH')
        .at(-1)?.[1]
        ?.onSuccess?.({ record: { id: 7 } } as never, { record: {} }, undefined, {} as never)
    })
    expect(post).toHaveBeenCalledWith('/api/v1/admin/origins/7/artwork', expect.any(FormData))
    post.mockRestore()
  })

  it('keeps a newly created record editable when artwork upload fails', async () => {
    const user = userEvent.setup()
    const post = vi.spyOn(api, 'post').mockRejectedValue(new ApiError('Image too large', 422, {}))
    useRestMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false } as never)

    renderEditor()
    await user.click(screen.getByRole('button', { name: /add origin/i }))
    await user.upload(
      screen.getByLabelText('Upload artwork'),
      new File(['image'], 'art.png', { type: 'image/png' }),
    )
    await act(async () => {
      useRestMutationMock.mock.calls
        .filter(([config]) => config.method === 'POST')
        .at(-1)?.[1]
        ?.onSuccess?.(
          { record: { id: 7, name: 'Elf' } } as never,
          { record: {} },
          undefined,
          {} as never,
        )
    })
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Image too large'))
    expect(screen.getByRole('dialog', { name: 'Edit Origin' })).toBeInTheDocument()
    post.mockRestore()
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
      record: {
        artwork_url: null,
        name: 'Elf',
        slug: null,
        description: 'A graceful origin.',
        hidden: false,
      },
    })
  })
})
