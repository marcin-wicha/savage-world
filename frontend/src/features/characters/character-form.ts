import type { FieldPath } from 'react-hook-form'
import { z } from 'zod'

const selectedHindranceSeveritySchema = z.enum(['minor', 'major'])
const attributeDieSchema = z.enum(['d4', 'd6', 'd8', 'd10', 'd12'])
const edgeEffectSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('trait_modifier'),
    target: z.enum(['attribute', 'skill', 'damage']),
    trait: z.string(),
    modifier: z.number().int(),
  }),
  z.object({
    kind: z.literal('trait_die_step'),
    target: z.enum(['attribute', 'skill', 'damage']),
    trait: z.string(),
    steps: z.number().int(),
  }),
])

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

const avatarFileSchema = z
  .custom<File | null>((value) => value === null || value instanceof File)
  .refine((file) => file === null || AVATAR_TYPES.includes(file.type), {
    message: 'Choose a PNG, JPEG, GIF, or WebP image.',
  })
  .refine((file) => file === null || (file.size > 0 && file.size <= AVATAR_MAX_BYTES), {
    message: 'The image must be 5 MB or smaller.',
  })

export const characterFormSchema = z.object({
  concept: z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Give your character a name.')
      .max(60, 'Use 60 characters or fewer.'),
    description: z.string().trim().max(500, 'Use 500 characters or fewer.'),
  }),
  avatar_file: avatarFileSchema,
  avatar_url: z.string(),
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
  edge_effects: z.record(z.string(), z.array(edgeEffectSchema)),
  gear: z.record(z.string(), z.number().int().min(1).max(99)),
  gear_names: z.record(z.string(), z.string()),
  equipped_gear: z.array(z.string()),
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
  avatar_file: null,
  avatar_url: '',
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
  edge_effects: {},
  gear: {},
  gear_names: {},
  equipped_gear: [],
  attribute_hindrance_points_spent: 0,
  skill_hindrance_points_spent: 0,
  edge_hindrance_points_spent: 0,
  hindrance_points_earned: 0,
  hindrance_points_spent: 0,
}

export type CharacterStepId =
  'concept' | 'origin' | 'hindrances' | 'attributes' | 'skills' | 'edges' | 'gear' | 'summary'

export const characterStepFields: Record<CharacterStepId, FieldPath<CharacterFormValues>[]> = {
  concept: ['concept.name', 'concept.description', 'avatar_file'],
  origin: ['origin'],
  hindrances: ['hindrances'],
  attributes: ['attributes'],
  skills: ['skills'],
  edges: ['edges'],
  gear: [],
  summary: [],
}
