import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { z } from 'zod'

import { api } from '@/lib/api-client'

import {
  type CharacterFormValues,
  characterFormDefaults,
  characterFormSchema,
} from './character-form'

export const characterDraftsQueryKey = ['character-drafts'] as const

export type CharacterDraftSummary = {
  id: number
  name: string
  step: number
  updated_at: string
}

export type CharacterDraftsResponse = {
  character_drafts: CharacterDraftSummary[]
}

export type CharacterDraftResponse = {
  character_draft: CharacterDraftSummary & { data: unknown }
}

export type RestoredCharacterDraft = {
  id: number
  values: CharacterFormValues
  step: number
  updated_at: string
}

type DraftPayload = {
  data: Omit<CharacterFormValues, 'avatar_file'>
  step: number
}

export type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const draftConceptSchema = z.object({
  name: z.string().max(60),
  description: z.string().max(500),
})

const draftDataSchema = z.record(z.string(), z.unknown())

export function restoreDraftValues(raw: unknown): CharacterFormValues {
  const values: Record<string, unknown> = { ...characterFormDefaults }
  const parsedRaw = draftDataSchema.safeParse(raw)
  if (!parsedRaw.success) return characterFormDefaults

  const shape = characterFormSchema.shape
  for (const key of Object.keys(shape) as (keyof typeof shape)[]) {
    if (key === 'avatar_file' || !(key in parsedRaw.data)) continue

    const schema = key === 'concept' ? draftConceptSchema : shape[key]
    const parsed = schema.safeParse(parsedRaw.data[key])
    if (parsed.success) values[key] = parsed.data
  }

  return values as CharacterFormValues
}

export function restoreCharacterDraft(
  draft: CharacterDraftResponse['character_draft'],
): RestoredCharacterDraft {
  return {
    id: draft.id,
    values: restoreDraftValues(draft.data),
    step: draft.step,
    updated_at: draft.updated_at,
  }
}

export function toDraftData(values: CharacterFormValues): DraftPayload['data'] {
  const data: Partial<CharacterFormValues> = { ...values }
  delete data.avatar_file

  return data as DraftPayload['data']
}

export function hasDraftContent(values: CharacterFormValues) {
  return JSON.stringify(toDraftData(values)) !== JSON.stringify(toDraftData(characterFormDefaults))
}

const draftPath = (id: number) => `/api/v1/character_drafts/${id}`

export const deleteCharacterDraft = (id: number) => api.delete<void>(draftPath(id))

type AutosaveState = {
  draftId: number | null
  inFlight: boolean
  queued: DraftPayload | null
  pending: DraftPayload | null
  timer: ReturnType<typeof setTimeout> | null
  generation: number
  stopped: boolean
}

export function useCharacterDraftAutosave({
  initialDraftId,
  onCreated,
  delayMs = 800,
}: {
  initialDraftId: number | null
  onCreated: (id: number) => void
  delayMs?: number
}) {
  const queryClient = useQueryClient()
  const [draftId, setDraftId] = useState(initialDraftId)
  const [status, setStatus] = useState<DraftSaveStatus>('idle')
  const state = useRef<AutosaveState>({
    draftId: initialDraftId,
    inFlight: false,
    queued: null,
    pending: null,
    timer: null,
    generation: 0,
    stopped: false,
  })
  const onCreatedRef = useRef(onCreated)
  useEffect(() => {
    onCreatedRef.current = onCreated
  }, [onCreated])

  const save = useCallback(
    async (payload: DraftPayload) => {
      const current = state.current
      current.queued = payload
      if (current.inFlight) return

      current.inFlight = true
      while (current.queued && !current.stopped) {
        const next = current.queued
        const generation = current.generation
        current.queued = null
        setStatus('saving')

        try {
          const body = { character_draft: next }
          if (current.draftId === null) {
            const response = await api.post<CharacterDraftResponse>(
              '/api/v1/character_drafts',
              body,
            )
            const createdId = response.character_draft.id

            if (generation !== current.generation || current.stopped) {
              await deleteCharacterDraft(createdId).catch(() => undefined)
              continue
            }
            current.draftId = createdId
            setDraftId(createdId)
            onCreatedRef.current(createdId)
          } else {
            await api.patch<CharacterDraftResponse>(draftPath(current.draftId), body)
          }
          if (generation === current.generation) setStatus('saved')
          void queryClient.invalidateQueries({ queryKey: characterDraftsQueryKey })
        } catch {
          if (generation === current.generation) setStatus('error')
        }
      }
      current.inFlight = false
    },
    [queryClient],
  )

  const schedule = useCallback(
    (payload: DraftPayload) => {
      const current = state.current
      if (current.stopped) return

      current.pending = payload
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

  const removeDraft = async () => {
    const current = state.current
    const id = current.draftId
    current.generation += 1
    current.draftId = null
    setDraftId(null)
    setStatus('idle')
    if (id !== null) await deleteCharacterDraft(id).catch(() => undefined)
    void queryClient.invalidateQueries({ queryKey: characterDraftsQueryKey })
  }

  const discard = async () => {
    cancelPending()
    await removeDraft()
  }

  const finish = async () => {
    cancelPending()
    state.current.stopped = true
    await removeDraft()
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

  return { draftId, status, schedule, discard, finish }
}
