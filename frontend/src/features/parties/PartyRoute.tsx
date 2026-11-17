import { useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { CharacterAvatar } from '@/components/character-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/lib/i18n-context'
import { useRestMutation, useRestQuery } from '@/lib/queries'
import { PartyBattles } from '@/features/battles/PartyBattles'

import { PartyForm } from './PartyForm'
import type { PartyFormValues } from './party-form'
import {
  inviteUrl,
  partiesQueryKey,
  partyQueryKey,
  rankLabels,
  type PartyDetail,
  type PartyMember,
  type PartyResponse,
} from './party-types'

type UpdatePartyVariables = { party: Partial<PartyFormValues> & { leader_id?: number } }
type MembershipVariables = { membershipId: number }

export function PartyRoute() {
  const { id = '' } = useParams()
  const { t } = useLanguage()
  const { data, isPending, isError } = useRestQuery<PartyResponse>(
    partyQueryKey(id),
    `/api/v1/parties/${id}`,
  )

  if (isPending) return <p className="text-muted-foreground text-sm">{t('Loading party…')}</p>

  if (isError || !data) {
    return (
      <section>
        <p className="text-danger text-sm" role="alert">
          {t('Could not load the party. It may not exist or you are not a member.')}
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/parties">{t('Back to parties')}</Link>
        </Button>
      </section>
    )
  }

  return <PartyView party={data.party} />
}

function PartyView({ party }: { party: PartyDetail }) {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [newLeaderId, setNewLeaderId] = useState('')
  const basePath = `/api/v1/parties/${party.id}`
  const accepted = party.members.filter((member) => member.status === 'accepted')
  const pending = party.members.filter((member) => member.status === 'pending')

  const refresh = () => {
    setError(null)
    void queryClient.invalidateQueries({ queryKey: partiesQueryKey })
  }
  const failWith = (message: string) => () => setError(message)

  const updateMutation = useRestMutation<PartyResponse, UpdatePartyVariables>(
    { path: basePath, method: 'PATCH' },
    { onSuccess: refresh, onError: failWith('Could not update the party. Try again.') },
  )
  const deleteMutation = useRestMutation<void, void>(
    { path: basePath, method: 'DELETE' },
    {
      onSuccess: () => {
        refresh()
        navigate('/parties')
      },
      onError: failWith('Could not delete the party. Try again.'),
    },
  )
  const regenerateMutation = useRestMutation<PartyResponse, void>(
    { path: `${basePath}/invite_code`, method: 'POST' },
    { onSuccess: refresh, onError: failWith('Could not create a new invite link. Try again.') },
  )
  const acceptMutation = useRestMutation<unknown, MembershipVariables>(
    {
      path: ({ membershipId }) => `${basePath}/memberships/${membershipId}/accept`,
      method: 'PATCH',
    },
    { onSuccess: refresh, onError: failWith('Could not accept the request. Try again.') },
  )
  const removeMutation = useRestMutation<void, MembershipVariables & { leaving: boolean }>(
    { path: ({ membershipId }) => `${basePath}/memberships/${membershipId}`, method: 'DELETE' },
    {
      onSuccess: (_data, { membershipId, leaving }) => {
        refresh()
        const stillMember = accepted.some(
          (member) => member.owned_by_me && member.membership_id !== membershipId,
        )
        if (leaving && !party.led_by_me && !stillMember) navigate('/parties')
      },
      onError: failWith('Could not remove the character. Try again.'),
    },
  )

  const transferTargets = Array.from(
    new Map(
      accepted.filter((member) => !member.owned_by_me).map((member) => [member.owner_id, member]),
    ).values(),
  )

  const confirm = (en: string, pl: string) => window.confirm(language === 'pl' ? pl : en)

  const removeMember = (member: PartyMember) => {
    const leaving = member.owned_by_me
    const name = member.character.name
    const confirmed = confirm(
      `Remove ${name} from ${party.name}?`,
      `Usunąć ${name} z drużyny ${party.name}?`,
    )
    if (confirmed) removeMutation.mutate({ membershipId: member.membership_id, leaving })
  }

  const copyInvite = async (code: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(code))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-foreground text-4xl">{party.name}</h1>
          {party.description ? (
            <p className="text-muted-foreground mt-2 text-sm whitespace-pre-line">
              {party.description}
            </p>
          ) : null}
        </div>
        <Badge variant={party.led_by_me ? 'default' : 'outline'}>
          {t(party.led_by_me ? 'Leader' : 'Member')}
        </Badge>
      </div>

      {error ? (
        <p className="text-danger text-sm" role="alert">
          {t(error)}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('Members')}</CardTitle>
        </CardHeader>
        <CardContent>
          {accepted.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('No characters in this party yet.')}</p>
          ) : (
            <ul className="divide-border divide-y">
              {accepted.map((member) => (
                <MemberRow key={member.membership_id} member={member}>
                  {party.led_by_me || member.owned_by_me ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={removeMutation.isPending}
                      onClick={() => removeMember(member)}
                      aria-label={`${t(member.owned_by_me ? 'Leave' : 'Remove member')} ${member.character.name}`}
                    >
                      {t(member.owned_by_me ? 'Leave' : 'Remove member')}
                    </Button>
                  ) : null}
                </MemberRow>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <PartyBattles partyId={party.id} canSimulate={accepted.length > 0} />

      {party.led_by_me ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t('Join requests')}</CardTitle>
            </CardHeader>
            <CardContent>
              {pending.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('No pending requests.')}</p>
              ) : (
                <ul className="divide-border divide-y">
                  {pending.map((member) => (
                    <MemberRow key={member.membership_id} member={member}>
                      <Button
                        type="button"
                        size="sm"
                        disabled={acceptMutation.isPending}
                        onClick={() =>
                          acceptMutation.mutate({ membershipId: member.membership_id })
                        }
                        aria-label={`${t('Accept')} ${member.character.name}`}
                      >
                        {t('Accept')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={removeMutation.isPending}
                        onClick={() =>
                          removeMutation.mutate({
                            membershipId: member.membership_id,
                            leaving: false,
                          })
                        }
                        aria-label={`${t('Reject')} ${member.character.name}`}
                      >
                        {t('Reject')}
                      </Button>
                    </MemberRow>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {party.invite_code ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('Invite link')}</CardTitle>
                <CardDescription>
                  {t('Share this link. Players choose a character and you approve the request.')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label htmlFor="invite-link" className="sr-only">
                  {t('Invite link')}
                </Label>
                <Input id="invite-link" readOnly value={inviteUrl(party.invite_code)} />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void copyInvite(party.invite_code ?? '')}
                  >
                    {t(copied ? 'Copied' : 'Copy link')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={regenerateMutation.isPending}
                    onClick={() => {
                      setCopied(false)
                      regenerateMutation.mutate()
                    }}
                  >
                    {t('Create new link')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{t('Party details')}</CardTitle>
            </CardHeader>
            <CardContent>
              <PartyForm
                key={`${party.name}-${party.description ?? ''}`}
                idPrefix="edit-party"
                defaultValues={{ name: party.name, description: party.description ?? '' }}
                submitLabel={t('Save changes')}
                pending={updateMutation.isPending}
                error={null}
                onSubmit={(values) => updateMutation.mutate({ party: values })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Party leadership')}</CardTitle>
              <CardDescription>
                {t('Hand leadership to the player of a member character.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {transferTargets.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t('No other players can lead this party yet.')}
                </p>
              ) : (
                <form
                  className="flex flex-wrap items-end gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (!newLeaderId) return
                    if (
                      confirm(
                        'Transfer leadership? You will no longer be able to edit this party.',
                        'Przekazać przywództwo? Nie będziesz już mógł edytować tej drużyny.',
                      )
                    ) {
                      updateMutation.mutate({ party: { leader_id: Number(newLeaderId) } })
                    }
                  }}
                >
                  <div className="min-w-48 flex-1 space-y-2">
                    <Label htmlFor="new-leader">{t('New leader')}</Label>
                    <select
                      id="new-leader"
                      value={newLeaderId}
                      onChange={(event) => setNewLeaderId(event.target.value)}
                      className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
                    >
                      <option value="">{t('Choose a player')}</option>
                      {transferTargets.map((member) => (
                        <option key={member.owner_id} value={member.owner_id}>
                          {`${t('Player of')} ${member.character.name}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newLeaderId || updateMutation.isPending}
                  >
                    {t('Transfer leadership')}
                  </Button>
                </form>
              )}
              <Button
                type="button"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (
                    confirm(
                      `Disband ${party.name}? This cannot be undone.`,
                      `Rozwiązać drużynę ${party.name}? Tej operacji nie można cofnąć.`,
                    )
                  ) {
                    deleteMutation.mutate()
                  }
                }}
              >
                {t('Disband party')}
              </Button>
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  )
}

function MemberRow({ member, children }: { member: PartyMember; children: ReactNode }) {
  const { t } = useLanguage()

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <CharacterAvatar name={member.character.name} src={member.character.avatar_url} />
        <div className="min-w-0">
          <p className="text-foreground font-medium">
            {member.character.name}
            {member.owned_by_me ? (
              <span className="text-muted-foreground ml-2 text-xs">({t('yours')})</span>
            ) : null}
          </p>
          <p className="text-muted-foreground text-sm">
            {t(rankLabels[member.character.rank] ?? member.character.rank)} ·{' '}
            {member.character.origin_name
              ? t(member.character.origin_name)
              : t('No origin selected')}
          </p>
        </div>
      </div>
      <div className="flex gap-2">{children}</div>
    </li>
  )
}
