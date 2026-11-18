import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { ServerDerivedStatistics } from './DerivedStatistics'
import { api } from '@/lib/api-client'

import {
  type CharacterFormValues,
  characterFormDefaults,
  characterFormSchema,
} from './character-form'

export type CharacterStatus = 'draft' | 'alive' | 'dead'

type DieType = CharacterFormValues['attributes']['agility']

export type CharacterResponse = {
  character: {
    id: number
    name: string | null
    status: CharacterStatus
    updated_at: string
    concept: string | null
    creation_step: number
    avatar_url?: string | null
    rank: CharacterFormValues['rank']
    origin_id: number | null
    origin_name: string | null
    edge_ids: number[]
    edges?: { id: number; name: string; slug?: string }[]
    hindrance_ids: number[]
    hindrances?: { id: number; name: string; slug?: string }[]
    hindrance_severities?: Record<string, 'minor' | 'major'>
    skill_ids: number[]
    skills?: { id: number; name: string; slug?: string }[]
    attributes: CharacterFormValues['attributes']
    skill_dice: Record<string, DieType>
    gear?: { gear_id: number; name: string; quantity: number; equipped: boolean }[]
    derived?: ServerDerivedStatistics
    creation_points?: {
      earned: number
      spent: { attributes: number; skills: number; edges: number }
    }
  }
}

export type CharacterSaveFields = {
  name: string
  concept: string
  rank: CharacterFormValues['rank']
  origin_id: number | null
  edge_ids: number[]
  hindrance_ids: number[]
  skill_ids: number[]
  attributes: CharacterFormValues['attributes']
  skill_dice: Record<string, DieType>
  hindrance_severities: Record<string, 'minor' | 'major'>
  gear: Record<string, number>
  equipped_gear_ids: number[]
  creation_step?: number
}

export type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const ids = (values: string[]) => values.map(Number)
const byId = <T extends { id: number }>(items: T[] | undefined, pick: (item: T) => unknown) =>
  Object.fromEntries(
    (items ?? []).flatMap((item) => {
      const value = pick(item)
      return typeof value === 'string' && value ? [[String(item.id), value]] : []
    }),
  )

export function toCharacterSaveFields(
  values: CharacterFormValues,
  step?: number,
): CharacterSaveFields {
  const selectedHindrances = new Set(values.hindrances)

  return {
    name: values.concept.name,
    concept: values.concept.description,
    rank: values.rank,
    origin_id: values.origin ? Number(values.origin) : null,
    edge_ids: ids(values.edges),
    hindrance_ids: ids(values.hindrances),
    skill_ids: ids(values.skills),
    attributes: values.attributes,
    skill_dice: values.skill_dice,
    hindrance_severities: Object.fromEntries(
      Object.entries(values.hindrance_severities).filter(([id]) => selectedHindrances.has(id)),
    ),
    gear: values.gear,
    equipped_gear_ids: ids(values.equipped_gear.filter((gearId) => gearId in values.gear)),
    ...(step === undefined ? {} : { creation_step: step }),
  }
}

export function characterToFormValues(
  character: CharacterResponse['character'],
): CharacterFormValues {
  const points = character.creation_points
  const spent = points?.spent ?? { attributes: 0, skills: 0, edges: 0 }
  const values: CharacterFormValues = {
    ...characterFormDefaults,
    concept: { name: character.name ?? '', description: character.concept ?? '' },
    avatar_url: character.avatar_url ?? '',
    rank: character.rank,
    origin: character.origin_id === null ? '' : String(character.origin_id),
    origin_name: character.origin_name ?? '',
    edges: character.edge_ids.map(String),
    edge_slugs: byId(character.edges, (edge) => edge.slug),
    edge_names: byId(character.edges, (edge) => edge.name),
    hindrances: character.hindrance_ids.map(String),
    hindrance_slugs: byId(character.hindrances, (hindrance) => hindrance.slug),
    hindrance_names: byId(character.hindrances, (hindrance) => hindrance.name),
    hindrance_severities: Object.fromEntries(
      character.hindrance_ids.map((hindranceId) => [
        String(hindranceId),
        character.hindrance_severities?.[String(hindranceId)] ?? 'minor',
      ]),
    ),
    skills: character.skill_ids.map(String),
    skill_slugs: byId(character.skills, (skill) => skill.slug),
    skill_names: byId(character.skills, (skill) => skill.name),
    attributes: character.attributes,
    skill_dice: Object.fromEntries(
      Object.entries(character.skill_dice).map(([skillId, die]) => [String(skillId), die]),
    ),
    gear: Object.fromEntries(
      (character.gear ?? []).map((item) => [String(item.gear_id), item.quantity]),
    ),
    gear_names: Object.fromEntries(
      (character.gear ?? []).map((item) => [String(item.gear_id), item.name]),
    ),
    equipped_gear: (character.gear ?? [])
      .filter((item) => item.equipped)
      .map((item) => String(item.gear_id)),
    hindrance_points_earned: Math.min(points?.earned ?? 0, 4),
    attribute_hindrance_points_spent: Math.min(spent.attributes, 4),
    skill_hindrance_points_spent: Math.min(spent.skills, 4),
    edge_hindrance_points_spent: Math.min(spent.edges, 4),
    hindrance_points_spent: Math.min(spent.attributes + spent.skills + spent.edges, 4),
  }
  const parsedConcept = characterFormSchema.shape.concept.safeParse(values.concept)

  return parsedConcept.success ? values : { ...values, concept: { name: '', description: '' } }
}

const blankFields = JSON.stringify(toCharacterSaveFields(characterFormDefaults))

export function hasDraftContent(values: CharacterFormValues) {
  return (
    JSON.stringify(toCharacterSaveFields(values)) !== blankFields || values.avatar_file !== null
  )
}

const characterPath = (id: number) => `/api/v1/characters/${id}`

type AutosaveState = {
  characterId: number | null
  queued: CharacterSaveFields | null
  pending: CharacterSaveFields | null
  timer: ReturnType<typeof setTimeout> | null
  running: Promise<void> | null
  generation: number
  stopped: boolean
}

export function useCharacterDraftAutosave({
  initialCharacterId,
  enabled,
  onCreated,
  delayMs = 800,
}: {
  initialCharacterId: number | null
  enabled: boolean
  onCreated: (id: number) => void
  delayMs?: number
}) {
  const queryClient = useQueryClient()
  const [characterId, setCharacterId] = useState(initialCharacterId)
  const [status, setStatus] = useState<DraftSaveStatus>('idle')
  const state = useRef<AutosaveState>({
    characterId: initialCharacterId,
    queued: null,
    pending: null,
    timer: null,
    running: null,
    generation: 0,
    stopped: !enabled,
  })
  const onCreatedRef = useRef(onCreated)
  useEffect(() => {
    onCreatedRef.current = onCreated
  }, [onCreated])

  const drain = useCallback(async () => {
    const current = state.current

    while (current.queued && !current.stopped) {
      const fields = current.queued
      const generation = current.generation
      current.queued = null
      setStatus('saving')

      try {
        if (current.characterId === null) {
          const response = await api.post<CharacterResponse>('/api/v1/characters', {
            character: fields,
          })
          const createdId = response.character.id

          if (generation !== current.generation) {
            await api.delete<void>(characterPath(createdId)).catch(() => undefined)
            continue
          }
          current.characterId = createdId
          setCharacterId(createdId)
          onCreatedRef.current(createdId)
          void queryClient.invalidateQueries({ queryKey: ['characters'] })
        } else {
          await api.put<CharacterResponse>(characterPath(current.characterId), {
            character: fields,
          })
        }
        if (generation === current.generation) setStatus('saved')
      } catch {
        if (generation === current.generation) setStatus('error')
      }
    }
  }, [queryClient])

  const save = useCallback(
    (fields: CharacterSaveFields) => {
      const current = state.current
      current.queued = fields
      if (current.running) return current.running

      current.running = drain().finally(() => {
        current.running = null
      })
      return current.running
    },
    [drain],
  )

  const schedule = useCallback(
    (fields: CharacterSaveFields) => {
      const current = state.current
      if (current.stopped) return

      current.pending = fields
      if (current.timer) clearTimeout(current.timer)
      current.timer = setTimeout(() => {
        current.timer = null
        const next = current.pending
        current.pending = null
        if (next) void save(next)
      }, delayMs)
    },
    [delayMs, save],
  )

  const cancelPending = () => {
    const current = state.current
    if (current.timer) clearTimeout(current.timer)
    current.timer = null
    current.pending = null
    current.queued = null
  }

  const flush = async () => {
    const current = state.current
    if (current.timer) clearTimeout(current.timer)
    current.timer = null
    const next = current.pending
    current.pending = null
    if (next && !current.stopped) await save(next)
    await current.running
    return current.characterId
  }

  const stop = async () => {
    cancelPending()
    state.current.stopped = true
    await state.current.running
  }

  const discard = async () => {
    const current = state.current
    cancelPending()
    current.generation += 1
    await current.running
    const id = current.characterId
    current.characterId = null
    setCharacterId(null)
    setStatus('idle')
    if (id !== null) await api.delete<void>(characterPath(id)).catch(() => undefined)
    void queryClient.invalidateQueries({ queryKey: ['characters'] })
  }

  useEffect(() => {
    const current = state.current

    return () => {
      if (!current.timer) return

      clearTimeout(current.timer)
      current.timer = null
      const next = current.pending
      current.pending = null
      if (next) void save(next)
    }
  }, [save])

  return { characterId, status, schedule, flush, stop, discard }
}
