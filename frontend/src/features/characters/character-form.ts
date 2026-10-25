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
  rank: z.enum(['novice', 'seasoned', 'veteran', 'heroic', 'legendary']),
  origin: z.string().min(1, 'Choose an origin.'),
  origin_name: z.string(),
  hindrances: z.array(z.string()),
  hindrance_severities: z.record(z.string(), selectedHindranceSeveritySchema),
  hindrance_slugs: z.record(z.string(), z.string()),
  hindrance_names: z.record(z.string(), z.string()),
  hindrance_descriptions: z.record(z.string(), z.string()),
  attributes: z.object({
    agility: attributeDieSchema,
    smarts: attributeDieSchema,
    spirit: attributeDieSchema,
    strength: attributeDieSchema,
    vigor: attributeDieSchema,
  }),
  skills: z.array(z.string()),
  skill_dice: z.record(z.string(), attributeDieSchema),
  skill_slugs: z.record(z.string(), z.string()),
  skill_names: z.record(z.string(), z.string()),
  skill_descriptions: z.record(z.string(), z.string()),
  edges: z.array(z.string()),
  edge_slugs: z.record(z.string(), z.string()),
  edge_names: z.record(z.string(), z.string()),
  edge_descriptions: z.record(z.string(), z.string()),
  gear: z.record(z.string(), z.number().int().min(1).max(99)),
  gear_names: z.record(z.string(), z.string()),
  attribute_hindrance_points_spent: z.number().int().min(0).max(4),
  skill_hindrance_points_spent: z.number().int().min(0).max(4),
  edge_hindrance_points_spent: z.number().int().min(0).max(4),
  hindrance_points_earned: z.number().int().min(0).max(4),
  hindrance_points_spent: z.number().int().min(0).max(4),
})

export type CharacterFormValues = z.infer<typeof characterFormSchema>

export const characterFormDefaults: CharacterFormValues = {
  concept: {
    name: '',
    description: '',
  },
  rank: 'novice',
  origin: '',
  origin_name: '',
  hindrances: [],
  hindrance_severities: {},
  hindrance_slugs: {},
  hindrance_names: {},
  hindrance_descriptions: {},
  attributes: {
    agility: 'd4',
    smarts: 'd4',
    spirit: 'd4',
    strength: 'd4',
    vigor: 'd4',
  },
  skills: [],
  skill_dice: {},
  skill_slugs: {},
  skill_names: {},
  skill_descriptions: {},
  edges: [],
  edge_slugs: {},
  edge_names: {},
  edge_descriptions: {},
  gear: {},
  gear_names: {},
  attribute_hindrance_points_spent: 0,
  skill_hindrance_points_spent: 0,
  edge_hindrance_points_spent: 0,
  hindrance_points_earned: 0,
  hindrance_points_spent: 0,
}

export type CharacterStepId =
  'concept' | 'origin' | 'hindrances' | 'attributes' | 'skills' | 'edges' | 'gear' | 'summary'

export const characterStepFields: Record<CharacterStepId, FieldPath<CharacterFormValues>[]> = {
  concept: ['concept.name', 'concept.description'],
  origin: ['origin'],
  hindrances: ['hindrances'],
  attributes: ['attributes'],
  skills: ['skills'],
  edges: ['edges'],
  gear: [],
  summary: [],
}
