export const attributeKeys = ['agility', 'smarts', 'spirit', 'strength', 'vigor'] as const

export type AttributeKey = (typeof attributeKeys)[number]

export const attributeLabels: Record<AttributeKey, string> = {
  agility: 'Agility',
  smarts: 'Smarts',
  spirit: 'Spirit',
  strength: 'Strength',
  vigor: 'Vigor',
}

export const abilityKeys = [
  'fearless',
  'hardy',
  'undead',
  'construct',
  'elemental',
  'resilient',
  'very_resilient',
] as const

export type AbilityKey = (typeof abilityKeys)[number]

export const abilityLabels: Record<AbilityKey, string> = {
  fearless: 'Fearless',
  hardy: 'Hardy',
  undead: 'Undead',
  construct: 'Construct',
  elemental: 'Elemental',
  resilient: 'Resilient',
  very_resilient: 'Very Resilient',
}

export type EnemyWeapon = {
  name: string
  damage: string
  ap?: number
  range?: string
  rof?: number
  reach?: number
}

export type EnemyTemplate = {
  id: number
  read_only: boolean
  name: string
  description: string | null
  wild_card: boolean
  attribute_dice: Record<AttributeKey, string>
  skills: Record<string, string>
  pace: number
  parry: number
  toughness: number
  armor: number
  size: number
  bennies: number
  weapons: EnemyWeapon[]
  edge_slugs: string[]
  abilities: string[]
}

export type EnemyTemplatesResponse = { enemy_templates: EnemyTemplate[] }

export type EnemyTemplateResponse = { enemy_template: EnemyTemplate }

export const enemyTemplatesQueryKey = ['enemy-templates'] as const

export function toughnessLabel(toughness: number, armor: number) {
  return armor > 0 ? `${toughness} (${armor})` : String(toughness)
}

export function skillLabel(slug: string) {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
