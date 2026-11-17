import { describe, expect, it } from 'vitest'

import { ApiError } from './api-client'
import { apiErrorMessages } from './api-errors'

describe('apiErrorMessages', () => {
  it('flattens validation details into readable messages', () => {
    const error = new ApiError('Validation failed', 422, {
      error: 'Validation failed',
      details: { name: ["can't be blank"], edge_slugs: ['contains unknown edges: x'] },
    })

    expect(apiErrorMessages(error)).toEqual([
      "name can't be blank",
      'edge slugs contains unknown edges: x',
    ])
  })

  it('returns nothing for other errors', () => {
    expect(apiErrorMessages(new Error('boom'))).toEqual([])
    expect(apiErrorMessages(new ApiError('Forbidden', 403, { error: 'Forbidden' }))).toEqual([])
  })
})
