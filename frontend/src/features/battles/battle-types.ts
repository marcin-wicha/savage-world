import type { DamageExpression } from '@/features/characters/gear-format'

export type Side = 'party' | 'enemies'

export type BattleSettings = {
  starting_distance: number
  illumination: 'bright' | 'dim' | 'dark' | 'pitch_dark'
  cover: 'none' | 'light' | 'medium' | 'heavy'
  max_rounds: number
  morale: boolean
}

export type RosterWeapon = {
  name: string
  damage: DamageExpression | null
  ap: number
  range: number[] | null
  rof: number
}

export type RosterEntry = {
  id: string
  name: string
  side: Side
  wild_card: boolean
  attributes: Record<string, string>
  skills: Record<string, string>
  pace: number
  parry: number
  toughness: number
  armor: number
  size: number
  bennies: number
  edges: string[]
  abilities: string[]
  weapons: RosterWeapon[]
}

export type CombatantStatistics = {
  id: string
  name: string
  side: Side
  incapacitated_rate: number
  death_rate: number
  fled_rate: number
  average_wounds: number
  average_bennies_spent: number
}

export type BattleSummary = {
  runs: number
  wins: Record<Side, number>
  draws: number
  party_win_rate: number
  average_rounds: number
  median_rounds: number
  first_run: { winner: Side | 'draw'; rounds: number }
  combatants: CombatantStatistics[]
}

export type BattleEvent = { type: string; round: number } & Record<string, unknown>

export type BattleListItem = {
  id: number
  party_id: number
  created_at: string
  created_by_me: boolean
  runs: number
  seed: number
  settings: BattleSettings
  roster: RosterEntry[]
  summary: BattleSummary
}

export type RunResult = { index: number; winner: Side | 'draw'; rounds: number }

export type RunResponse = { run: RunResult & { log: BattleEvent[] } }

export type BattleDetail = BattleListItem & {
  can_delete: boolean
  run_results?: RunResult[]
  log: BattleEvent[]
  final_state: Record<string, unknown>[]
}

export type BattleResponse = { battle: BattleDetail }

export type BattlesResponse = { battles: BattleListItem[] }

export const battlesQueryKey = (partyId: number | string) =>
  ['parties', String(partyId), 'battles'] as const

export const battleQueryKey = (id: number | string) => ['battles', String(id)] as const

export function formatPercent(rate: number) {
  return `${Math.round(rate * 100)}%`
}
