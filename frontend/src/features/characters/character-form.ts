import type { FieldPath } from 'react-hook-form'
import { z } from 'zod'

const selectedHindranceSeveritySchema = z.enum(['minor', 'major'])
const attributeDieSchema = z.enum(['d4', 'd6', 'd8', 'd10', 'd12'])

export const characterFormSchema = z.object({
  concept: z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Give your character a name.')
      .max(60, 'Use 60 characters or fewer.'),
    description: z.string().trim().max(500, 'Use 500 characters or fewer.'),
  }),
  hindrances: z.array(z.string()),
  hindrance_severities: z.record(z.string(), selectedHindranceSeveritySchema),
  attributes: z.object({
    agility: attributeDieSchema,
    smarts: attributeDieSchema,
    spirit: attributeDieSchema,
    strength: attributeDieSchema,
    vigor: attributeDieSchema,
  }),
  attribute_hindrance_points_spent: z.number().int().min(0).max(4),
  hindrance_points_earned: z.number().int().min(0).max(4),
  hindrance_points_spent: z.number().int().min(0).max(4),
})

export type CharacterFormValues = z.infer<typeof characterFormSchema>

export const characterFormDefaults: CharacterFormValues = {
  concept: {
    name: '',
    description: '',
  },
  hindrances: [],
  hindrance_severities: {},
  attributes: {
    agility: 'd4',
    smarts: 'd4',
    spirit: 'd4',
    strength: 'd4',
    vigor: 'd4',
  },
  attribute_hindrance_points_spent: 0,
  hindrance_points_earned: 0,
  hindrance_points_spent: 0,
}

export type CharacterStepId =
  'concept' | 'origin' | 'hindrances' | 'attributes' | 'skills' | 'gear' | 'summary'

export const characterStepFields: Record<CharacterStepId, FieldPath<CharacterFormValues>[]> = {
  concept: ['concept.name', 'concept.description'],
  origin: [],
  hindrances: ['hindrances'],
  attributes: ['attributes'],
  skills: [],
  gear: [],
  summary: [],
}
