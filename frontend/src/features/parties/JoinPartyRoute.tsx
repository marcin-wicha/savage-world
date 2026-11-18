import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api-client'
import { useLanguage } from '@/lib/i18n-context'
import { useRestMutation, useRestQuery } from '@/lib/queries'

import { partiesQueryKey, type MembershipStatus } from './party-types'

type InviteResponse = {
  party: {
    id: number
    name: string
    description: string | null
    member_count: number
    led_by_me: boolean
  }
  my_memberships: { character_id: number; status: MembershipStatus }[]
}

type CharactersResponse = {
  characters: { id: number; name: string | null; status: 'draft' | 'alive' | 'dead' }[]
}

type JoinResponse = { membership: { status: MembershipStatus } }

type JoinVariables = { character_id: number }

export function JoinPartyRoute() {
  const { code = '' } = useParams()
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [characterId, setCharacterId] = useState('')
  const [result, setResult] = useState<MembershipStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const invitePath = `/api/v1/party_invites/${encodeURIComponent(code)}`
  const invite = useRestQuery<InviteResponse>(['party-invite', code], invitePath)
  const characters = useRestQuery<CharactersResponse>(['characters'], '/api/v1/characters')
  const joinMutation = useRestMutation<JoinResponse, JoinVariables>(
    { path: `${invitePath}/memberships`, method: 'POST' },
    {
      onSuccess: (response) => {
        setResult(response.membership.status)
        setCharacterId('')
        void queryClient.invalidateQueries({ queryKey: partiesQueryKey })
        void queryClient.invalidateQueries({ queryKey: ['party-invite', code] })
      },
      onError: (failure) =>
        setError(
          failure instanceof ApiError && failure.status === 422
            ? 'This character is already in the party or awaiting approval.'
            : 'Could not send the request. Try again.',
        ),
    },
  )

  if (invite.isPending) {
    return <p className="text-muted-foreground text-sm">{t('Loading invitation…')}</p>
  }

  if (invite.isError || !invite.data) {
    return (
      <p className="text-danger text-sm" role="alert">
        {t('This invite link is invalid or has expired.')}
      </p>
    )
  }

  const { party, my_memberships: myMemberships } = invite.data
  const joinedIds = new Set(myMemberships.map((membership) => membership.character_id))
  const available = (characters.data?.characters ?? []).filter(
    (character) => character.status === 'alive' && !joinedIds.has(character.id),
  )

  return (
    <section className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <p className="text-muted-foreground text-[0.65rem] font-medium tracking-[0.22em] uppercase">
            {t('Party invitation')}
          </p>
          <CardTitle className="text-2xl">{party.name}</CardTitle>
          {party.description ? <CardDescription>{party.description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {t('Members')}: {party.member_count}
          </p>

          {result ? (
            <p role="status" className="text-foreground text-sm">
              {t(
                result === 'accepted'
                  ? 'Your character joined the party.'
                  : 'Request sent. The party leader will review it.',
              )}
            </p>
          ) : null}

          {characters.isPending ? (
            <p className="text-muted-foreground text-sm">{t('Loading characters…')}</p>
          ) : available.length === 0 ? (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                {t('You have no characters that can join this party.')}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/characters/new">{t('Create a character')}</Link>
              </Button>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (!characterId) return
                setError(null)
                setResult(null)
                joinMutation.mutate({ character_id: Number(characterId) })
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="join-character">{t('Character')}</Label>
                <select
                  id="join-character"
                  value={characterId}
                  onChange={(event) => setCharacterId(event.target.value)}
                  className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
                >
                  <option value="">{t('Choose a character')}</option>
                  {available.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                    </option>
                  ))}
                </select>
              </div>
              {error ? (
                <p role="alert" className="text-danger text-sm">
                  {t(error)}
                </p>
              ) : null}
              <Button type="submit" disabled={!characterId || joinMutation.isPending}>
                {t(party.led_by_me ? 'Add to party' : 'Request to join')}
              </Button>
            </form>
          )}

          <Button asChild variant="ghost" size="sm">
            <Link to="/parties">{t('Back to parties')}</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
