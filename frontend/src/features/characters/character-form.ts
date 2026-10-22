import type { FieldPath } from 'react-hook-form'
import { z } from 'zod'

export const characterFormSchema = z.object({
  concept: z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Give your character a name.')
      .max(60, 'Use 60 characters or fewer.'),
    description: z.string().trim().max(500, 'Use 500 characters or fewer.'),
  }),
})

export type CharacterFormValues = z.infer<typeof characterFormSchema>

export const characterFormDefaults: CharacterFormValues = {
  concept: {
    name: '',
    description: '',
  },
}

export type CharacterStepId =
  'concept' | 'origin' | 'hindrances' | 'attributes' | 'skills' | 'gear' | 'summary'

export const characterStepFields: Record<CharacterStepId, FieldPath<CharacterFormValues>[]> = {
  concept: ['concept.name', 'concept.description'],
  origin: [],
  hindrances: [],
  attributes: [],
  skills: [],
  gear: [],
  summary: [],
}
