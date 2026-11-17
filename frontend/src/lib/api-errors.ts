import { ApiError } from './api-client'

export function apiErrorMessages(error: unknown): string[] {
  if (!(error instanceof ApiError)) return []

  const payload = error.payload
  if (!payload || typeof payload !== 'object' || !('details' in payload)) return []

  const details = payload.details
  if (!details || typeof details !== 'object') return []

  return Object.entries(details).flatMap(([field, value]) =>
    Array.isArray(value)
      ? value
          .filter((message): message is string => typeof message === 'string')
          .map((message) => `${field.replaceAll('_', ' ')} ${message}`)
      : [],
  )
}
