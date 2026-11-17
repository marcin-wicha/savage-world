import { z } from 'zod'

import {
  type CharacterFormValues,
  characterFormDefaults,
  characterFormSchema,
} from './character-form'

export type CharacterDraft = {
  values: CharacterFormValues
  step: number
  saved_at: string
}

const draftEnvelopeSchema = z.object({
  values: z.record(z.string(), z.unknown()),
  step: z.number().int().min(0),
  saved_at: z.string(),
})

const draftConceptSchema = z.object({
  name: z.string().max(60),
  description: z.string().max(500),
})

const storageKeyFor = (userId: number) => `savage-worlds-character-draft:${userId}`

function restoreValues(raw: Record<string, unknown>): CharacterFormValues {
  const values: Record<string, unknown> = { ...characterFormDefaults }
  const shape = characterFormSchema.shape

  for (const key of Object.keys(shape) as (keyof typeof shape)[]) {
    if (key === 'avatar_file' || !(key in raw)) continue

    const schema = key === 'concept' ? draftConceptSchema : shape[key]
    const parsed = schema.safeParse(raw[key])
    if (parsed.success) values[key] = parsed.data
  }

  return values as CharacterFormValues
}

const storableValues = (values: CharacterFormValues) => ({ ...values, avatar_file: null })

export function hasDraftContent(values: CharacterFormValues) {
  return JSON.stringify(storableValues(values)) !== JSON.stringify(characterFormDefaults)
}

export function loadCharacterDraft(userId: number): CharacterDraft | null {
  try {
    const stored = window.localStorage.getItem(storageKeyFor(userId))
    if (!stored) return null

    const envelope = draftEnvelopeSchema.safeParse(JSON.parse(stored))
    if (!envelope.success) return null

    return {
      values: restoreValues(envelope.data.values),
      step: envelope.data.step,
      saved_at: envelope.data.saved_at,
    }
  } catch {
    return null
  }
}

export function saveCharacterDraft(userId: number, values: CharacterFormValues, step: number) {
  const draft = {
    values: storableValues(values),
    step,
    saved_at: new Date().toISOString(),
  }

  try {
    window.localStorage.setItem(storageKeyFor(userId), JSON.stringify(draft))
  } catch {
    // Storage can be unavailable (private mode or quota); drafts are best-effort.
  }
}

export function clearCharacterDraft(userId: number) {
  try {
    window.localStorage.removeItem(storageKeyFor(userId))
  } catch {
    // Storage can be unavailable; nothing to clear.
  }
}
