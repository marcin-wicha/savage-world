import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/lib/i18n-context'
import { useRestMutation, useRestQuery } from '@/lib/queries'

import { PartyForm } from './PartyForm'
import type { PartyFormValues } from './party-form'
import {
  partiesQueryKey,
  type PartiesResponse,
  type PartyResponse,
  type PartySummary,
} from './party-types'

type CreatePartyVariables = { party: PartyFormValues }

function statusLabel(party: PartySummary) {
  if (party.led_by_me) return 'Leader'
  if (party.my_status === 'pending') return 'Awaiting approval'
  return 'Member'
}

export function PartiesRoute() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [createError, setCreateError] = useState<string | null>(null)
  const { data, isPending, isError } = useRestQuery<PartiesResponse>(
    partiesQueryKey,
    '/api/v1/parties',
  )
  const parties = data?.parties ?? []
  const createMutation = useRestMutation<PartyResponse, CreatePartyVariables>(
    { path: '/api/v1/parties', method: 'POST' },
    {
      onSuccess: (response) => {
        void queryClient.invalidateQueries({ queryKey: partiesQueryKey })
        navigate(`/parties/${response.party.id}`)
      },
      onError: () => setCreateError('Could not create the party. Try again.'),
    },
  )

  return (
    <section>
      <h1 className="text-foreground text-4xl">{t('Parties')}</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        {t('Gather characters from other players into an adventuring party.')}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          {isPending ? (
            <p className="text-muted-foreground text-sm">{t('Loading parties…')}</p>
          ) : null}
          {isError ? (
            <p className="text-danger text-sm" role="alert">
              {t('Could not load parties. Try again.')}
            </p>
          ) : null}
          {!isPending && !isError && parties.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('You are not in any party yet.')}</p>
          ) : null}
          {parties.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {parties.map((party) => (
                <li key={party.id}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle>{party.name}</CardTitle>
                        <Badge variant={party.led_by_me ? 'default' : 'outline'}>
                          {t(statusLabel(party))}
                        </Badge>
                      </div>
                      {party.description ? (
                        <CardDescription>{party.description}</CardDescription>
                      ) : null}
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {t('Members')}: {party.member_count}
                      </span>
                      {party.led_by_me || party.my_status === 'accepted' ? (
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/parties/${party.id}`}>{t('Open')}</Link>
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('Create a party')}</CardTitle>
            <CardDescription>
              {t('You will lead the party and can invite characters with a link.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PartyForm
              idPrefix="new-party"
              submitLabel={t('Create party')}
              pending={createMutation.isPending}
              error={createError}
              onSubmit={(values) => {
                setCreateError(null)
                createMutation.mutate({ party: values })
              }}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
