import { Swords } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/lib/i18n-context'
import { useRestQuery } from '@/lib/queries'

import { battlesQueryKey, formatPercent, type BattlesResponse } from './battle-types'

export function PartyBattles({ partyId, canSimulate }: { partyId: number; canSimulate: boolean }) {
  const { t, language } = useLanguage()
  const { data, isPending, isError } = useRestQuery<BattlesResponse>(
    battlesQueryKey(partyId),
    `/api/v1/parties/${partyId}/battles`,
  )
  const battles = data?.battles ?? []
  const dateFormat = new Intl.DateTimeFormat(language === 'pl' ? 'pl-PL' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{t('Battles')}</CardTitle>
            <CardDescription>
              {t('Simulate fights against enemies from your bestiary.')}
            </CardDescription>
          </div>
          {canSimulate ? (
            <Button asChild size="sm">
              <Link to={`/parties/${partyId}/battles/new`}>
                <Swords aria-hidden="true" />
                {t('Simulate battle')}
              </Link>
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <p className="text-muted-foreground text-sm">{t('Loading battles…')}</p>
        ) : null}
        {isError ? (
          <p className="text-danger text-sm" role="alert">
            {t('Could not load battles. Try again.')}
          </p>
        ) : null}
        {!isPending && !isError && battles.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('No battles yet.')}</p>
        ) : null}
        {battles.length > 0 ? (
          <ul className="divide-border divide-y">
            {battles.map((battle) => {
              const enemies = battle.roster.filter((entry) => entry.side === 'enemies').length

              return (
                <li
                  key={battle.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="text-sm">
                    <p className="text-foreground font-medium">
                      {t('Party win rate')} {formatPercent(battle.summary.party_win_rate)}
                    </p>
                    <p className="text-muted-foreground">
                      {dateFormat.format(new Date(battle.created_at))} · {enemies}{' '}
                      {t(enemies === 1 ? 'enemy' : 'enemies')} · {battle.runs}{' '}
                      {t(battle.runs === 1 ? 'simulation' : 'simulations')}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link
                      to={`/battles/${battle.id}`}
                      aria-label={`${t('View battle')} ${battle.id}`}
                    >
                      {t('View')}
                    </Link>
                  </Button>
                </li>
              )
            })}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  )
}
