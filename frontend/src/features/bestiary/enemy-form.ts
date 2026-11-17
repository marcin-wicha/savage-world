import { z } from 'zod'

import { abilityKeys, attributeKeys, type EnemyTemplate, type EnemyWeapon } from './enemy-types'

const dieSchema = z
  .string()
  .trim()
  .regex(/^d(4|6|8|10|12)([+-]\d{1,2})?$/, 'Use a die such as d6 or d12+2.')

const damagePattern = /^[+-]?(str|\d*d\d+|\d+)([+-](str|\d*d\d+|\d+))*$/i

const weaponSchema = z.object({
  name: z.string().trim().min(1, 'Weapon name is required.'),
  damage: z
    .string()
    .trim()
    .refine(
      (value) => damagePattern.test(value.replaceAll(' ', '')),
      'Use damage such as Str+d6 or 2d6.',
    ),
  ap: z.number().int().min(0).max(50),
  range: z
    .string()
    .trim()
    .regex(/^(\d+\/\d+\/\d+)?$/, 'Use a range such as 12/24/48.'),
  rof: z.number().int().min(1).max(6),
  reach: z.number().int().min(0).max(10),
})

const statSchema = (min: number, max: number) =>
  z
    .number({ message: 'Enter a number.' })
    .int('Enter a whole number.')
    .min(min, `Use a value from ${min} to ${max}.`)
    .max(max, `Use a value from ${min} to ${max}.`)

export const enemyFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required.')
      .max(100, 'Name must be 100 characters or fewer.'),
    description: z.string().trim().max(5000, 'Description must be 5000 characters or fewer.'),
    wild_card: z.boolean(),
    attribute_dice: z.object(
      Object.fromEntries(attributeKeys.map((key) => [key, dieSchema])) as Record<
        (typeof attributeKeys)[number],
        typeof dieSchema
      >,
    ),
    skills: z.array(
      z.object({
        slug: z
          .string()
          .trim()
          .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use a skill slug such as fighting.'),
        die: dieSchema,
      }),
    ),
    pace: statSchema(0, 48),
    parry: statSchema(1, 40),
    toughness: statSchema(1, 40),
    armor: statSchema(0, 30),
    size: statSchema(-4, 20),
    weapons: z.array(weaponSchema).max(6, 'Use at most 6 weapons.'),
    edges: z.string(),
    abilities: z.array(z.enum(abilityKeys)),
  })
  .refine((values) => values.armor < values.toughness, {
    message: 'Armor must be lower than Toughness.',
    path: ['armor'],
  })

export type EnemyFormValues = z.infer<typeof enemyFormSchema>

export const emptyWeapon: EnemyFormValues['weapons'][number] = {
  name: '',
  damage: '',
  ap: 0,
  range: '',
  rof: 1,
  reach: 0,
}

export const enemyFormDefaults: EnemyFormValues = {
  name: '',
  description: '',
  wild_card: false,
  attribute_dice: { agility: 'd6', smarts: 'd6', spirit: 'd6', strength: 'd6', vigor: 'd6' },
  skills: [
    { slug: 'fighting', die: 'd6' },
    { slug: 'notice', die: 'd6' },
  ],
  pace: 6,
  parry: 5,
  toughness: 5,
  armor: 0,
  size: 0,
  weapons: [{ ...emptyWeapon, name: 'Short Sword', damage: 'Str+d6' }],
  edges: '',
  abilities: [],
}

export function formValuesFromTemplate(template: EnemyTemplate): EnemyFormValues {
  return {
    name: template.name,
    description: template.description ?? '',
    wild_card: template.wild_card,
    attribute_dice: template.attribute_dice,
    skills: Object.entries(template.skills).map(([slug, die]) => ({ slug, die })),
    pace: template.pace,
    parry: template.parry,
    toughness: template.toughness,
    armor: template.armor,
    size: template.size,
    weapons: template.weapons.map((weapon) => ({
      name: weapon.name,
      damage: weapon.damage,
      ap: weapon.ap ?? 0,
      range: weapon.range ?? '',
      rof: weapon.rof ?? 1,
      reach: weapon.reach ?? 0,
    })),
    edges: template.edge_slugs.join(', '),
    abilities: template.abilities.filter((ability): ability is (typeof abilityKeys)[number] =>
      (abilityKeys as readonly string[]).includes(ability),
    ),
  }
}

export function templatePayload(values: EnemyFormValues) {
  return {
    name: values.name,
    description: values.description,
    wild_card: values.wild_card,
    attribute_dice: values.attribute_dice,
    skills: Object.fromEntries(values.skills.map((skill) => [skill.slug, skill.die])),
    pace: values.pace,
    parry: values.parry,
    toughness: values.toughness,
    armor: values.armor,
    size: values.size,
    weapons: values.weapons.map((weapon) => {
      const payload: EnemyWeapon = { name: weapon.name, damage: weapon.damage.replaceAll(' ', '') }
      if (weapon.ap) payload.ap = weapon.ap
      if (weapon.range) payload.range = weapon.range
      if (weapon.rof > 1) payload.rof = weapon.rof
      if (weapon.reach) payload.reach = weapon.reach
      return payload
    }),
    edge_slugs: values.edges
      .split(',')
      .map((slug) => slug.trim())
      .filter(Boolean),
    abilities: values.abilities,
  }
}
