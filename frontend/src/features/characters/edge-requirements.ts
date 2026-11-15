import type { EdgesQuery } from '@/graphql/generated/graphql'

export type EdgeRequirementClause = NonNullable<
  NonNullable<EdgesQuery['edges']['nodes']>[number]
>['requirements'][number]

type RequirementClauseData = {
  kind: string
  attribute?: string | null
  die?: number | null
  skill?: string | null
  slug?: string | null
  name?: string | null
  detail?: string | null
  text?: string | null
  value?: string | null
  clauses?: readonly RequirementClauseData[] | null
}

export type EdgeRequirementCharacter = {
  attributes: {
    agility: number
    smarts: number
    spirit: number
    strength: number
    vigor: number
  }
  skillDiceBySlug: Record<string, number>
  edgeSlugs: ReadonlySet<string>
  hindranceSlugs: ReadonlySet<string>
}

type AttributeName = keyof EdgeRequirementCharacter['attributes']

const arcaneBackgroundSlug = 'arcane-background'

function meetsClause(
  requirement: RequirementClauseData,
  character: EdgeRequirementCharacter,
): boolean {
  switch (requirement.kind) {
    case 'any':
      return (requirement.clauses ?? []).some((clause) => meetsClause(clause, character))
    case 'attribute': {
      const attribute = requirement.attribute

      if (!attribute) return false
      if (!(attribute in character.attributes)) return false

      return (
        character.attributes[attribute as AttributeName] >=
        (requirement.die ?? Number.MAX_SAFE_INTEGER)
      )
    }
    case 'skill':
      if (!requirement.skill) return false

      return (
        (character.skillDiceBySlug[requirement.skill] ?? 0) >=
        (requirement.die ?? Number.MAX_SAFE_INTEGER)
      )
    case 'edge':
      return character.edgeSlugs.has(requirement.slug ?? '')
    case 'hindrance':
      return character.hindranceSlugs.has(requirement.slug ?? '')
    case 'arcane_background':
      return character.edgeSlugs.has(arcaneBackgroundSlug)
    case 'wild_card':
      return true
    case 'special':
      return false
    default:
      return false
  }
}

function titleize(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function withDetail(text: string, detail: string | null | undefined, wrap: boolean): string {
  const trimmed = detail?.trim()

  if (!trimmed) return text

  return wrap ? `${text} (${trimmed})` : `${text} ${trimmed}`
}

export function describeRequirement(requirement: RequirementClauseData): string {
  switch (requirement.kind) {
    case 'any':
      return (requirement.clauses ?? []).map(describeRequirement).filter(Boolean).join(' or ')
    case 'attribute':
      return `${titleize(requirement.attribute ?? '')} d${requirement.die ?? ''}+`
    case 'skill':
      return `${titleize(requirement.skill ?? '')} d${requirement.die ?? ''}+`
    case 'edge':
      return withDetail(
        requirement.name || titleize(requirement.slug ?? ''),
        requirement.detail,
        false,
      )
    case 'hindrance':
      return withDetail(titleize(requirement.slug ?? ''), requirement.detail, true)
    case 'arcane_background':
      return `Arcane Background (${titleize(requirement.value || 'any')})`
    case 'wild_card':
      return 'Wild Card'
    case 'special':
      return requirement.text ?? ''
    default:
      return ''
  }
}

export function missingEdgeRequirements(
  requirements: readonly EdgeRequirementClause[],
  character: EdgeRequirementCharacter,
): string[] {
  return requirements
    .filter((requirement) => !meetsClause(requirement, character))
    .map(describeRequirement)
    .filter(Boolean)
}

export function meetsEdgeRequirements(
  requirements: readonly EdgeRequirementClause[],
  character: EdgeRequirementCharacter,
): boolean {
  return requirements.every((requirement) => meetsClause(requirement, character))
}
