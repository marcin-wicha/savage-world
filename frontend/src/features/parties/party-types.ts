export type MembershipStatus = 'pending' | 'accepted'

export type PartyCharacter = {
  id: number
  name: string
  avatar_url: string | null
}

export type PartySummary = {
  id: number
  name: string
  description: string | null
  led_by_me: boolean
  member_count: number
  member_characters: PartyCharacter[]
  my_status: MembershipStatus | null
}

export type PartyMember = {
  membership_id: number
  status: MembershipStatus
  owned_by_me: boolean
  owner_id: number
  character: PartyCharacter & {
    rank: string
    origin_name: string | null
  }
}

export type PartyDetail = PartySummary & {
  invite_code?: string
  members: PartyMember[]
}

export type PartiesResponse = { parties: PartySummary[] }

export type PartyResponse = { party: PartyDetail }

export const partiesQueryKey = ['parties'] as const

export const partyQueryKey = (id: number | string) => ['parties', String(id)] as const

export const rankLabels: Record<string, string> = {
  novice: 'Novice',
  seasoned: 'Seasoned',
  veteran: 'Veteran',
  heroic: 'Heroic',
  legendary: 'Legendary',
}

export function inviteUrl(code: string) {
  return `${window.location.origin}/parties/join/${code}`
}
