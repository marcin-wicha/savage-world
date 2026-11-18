import { useEffect, useRef, useState } from 'react'

import { useRestMutation } from '@/lib/queries'

import type { CharacterSaveFields } from './character-draft'
import type { ServerDerivedStatistics } from './DerivedStatistics'

type PreviewRequest = { character: CharacterSaveFields }
type PreviewResponse = { derived: ServerDerivedStatistics }

export function useDerivedPreview(
  fields: CharacterSaveFields,
  initial: ServerDerivedStatistics | undefined,
  delayMs = 300,
) {
  const [derived, setDerived] = useState(initial)
  const latestRequest = useRef(0)
  const fieldsKey = JSON.stringify(fields)
  const lastSentKey = useRef(initial ? fieldsKey : null)
  const { mutate } = useRestMutation<PreviewResponse, PreviewRequest>({
    path: '/api/v1/characters/derived_preview',
  })

  useEffect(() => {
    if (fieldsKey === lastSentKey.current) return

    const timer = setTimeout(() => {
      lastSentKey.current = fieldsKey
      const request = ++latestRequest.current
      mutate(
        { character: JSON.parse(fieldsKey) as CharacterSaveFields },
        {
          onSuccess: (response) => {
            if (request === latestRequest.current) setDerived(response.derived)
          },
        },
      )
    }, delayMs)

    return () => clearTimeout(timer)
  }, [delayMs, fieldsKey, mutate])

  return derived
}
