import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { skillLabel, toughnessLabel } from '@/features/bestiary/enemy-types'
import { formatDamage } from '@/features/characters/gear-format'
import { useLanguage } from '@/lib/i18n-context'
import { useRestMutation, useRestQuery } from '@/lib/queries'
import { cn } from '@/lib/utils'

import { formatEvent } from './battle-log'
import {
  battleQueryKey,
  battlesQueryKey,
  formatPercent,
  type BattleDetail,
  type BattleEvent,
  type BattleResponse,
  type CombatantStatistics,
  type RosterEntry,
  type Side,
} from './battle-types'

const winnerLabels: Record<string, string> = {
  party: 'Party victory',
  enemies: 'Enemy victory',
  draw: 'Draw',
}

const illuminationLabels: Record<string, string> = {
  bright: 'Bright light',
  dim: 'Dim light (−2)',
  dark: 'Darkness (−4)',
  pitch_dark: 'Pitch darkness (−6)',
}

const coverLabels: Record<string, string> = {
  none: 'No cover',
  light: 'Light cover (−2)',
  medium: 'Medium cover (−4)',
  heavy: 'Heavy cover (−6)',
}

export function BattleRoute() {
  const { id = '' } = useParams()
  const { t } = useLanguage()
  const { data, isPending, isError } = useRestQuery<BattleResponse>(
    battleQueryKey(id),
    `/api/v1/battles/${id}`,
  )

  if (isPending) return <p className="text-muted-foreground text-sm">{t('Loading battle…')}</p>

  if (isError || !data) {
    return (
      <section>
        <p className="text-danger text-sm" role="alert">
          {t('Could not load the battle. It may not exist or you are not in the party.')}
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/parties">{t('Back to parties')}</Link>
        </Button>
      </section>
    )
  }

  return <BattleView battle={data.battle} />
}

function BattleView({ battle }: { battle: BattleDetail }) {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const summary = battle.summary
  const names = Object.fromEntries(battle.roster.map((entry) => [entry.id, entry.name]))
  const statistics = new Map(summary.combatants.map((entry) => [entry.id, entry]))
  const deleteMutation = useRestMutation<void, void>(
    { path: `/api/v1/battles/${battle.id}`, method: 'DELETE' },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: battlesQueryKey(battle.party_id) })
        navigate(`/parties/${battle.party_id}`)
      },
    },
  )

  const remove = () => {
    const message = language === 'pl' ? 'Usunąć tę bitwę?' : 'Delete this battle?'
    if (window.confirm(message)) deleteMutation.mutate()
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-foreground text-4xl">{t('Battle simulation')}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {[
              `${summary.runs} ${t(summary.runs === 1 ? 'simulation' : 'simulations')}`,
              `${t('Seed')} ${battle.seed}`,
              `${t('Starting distance')} ${battle.settings.starting_distance}″`,
              t(illuminationLabels[battle.settings.illumination] ?? battle.settings.illumination),
              t(coverLabels[battle.settings.cover] ?? battle.settings.cover),
              battle.settings.morale ? t('Morale on') : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/parties/${battle.party_id}`}>{t('Back to party')}</Link>
          </Button>
          <Button asChild size="sm">
            <Link to={`/parties/${battle.party_id}/battles/new`}>{t('New battle')}</Link>
          </Button>
          {battle.can_delete ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={remove}
            >
              {t('Delete')}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label={t('Party win rate')} value={formatPercent(summary.party_win_rate)} />
        <SummaryTile
          label={t('Results')}
          value={`${summary.wins.party} / ${summary.wins.enemies} / ${summary.draws}`}
          hint={t('wins / losses / draws')}
        />
        <SummaryTile
          label={t('Average rounds')}
          value={String(summary.average_rounds)}
          hint={`${t('Median')} ${summary.median_rounds}`}
        />
        <SummaryTile
          label={t('First simulation')}
          value={t(winnerLabels[summary.first_run.winner] ?? 'Draw')}
          hint={`${summary.first_run.rounds} ${t(summary.first_run.rounds === 1 ? 'round' : 'rounds')}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(['party', 'enemies'] as Side[]).map((side) => (
          <Card key={side}>
            <CardHeader>
              <CardTitle>{t(side === 'party' ? 'The party' : 'Enemies')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-border divide-y">
                {battle.roster
                  .filter((entry) => entry.side === side)
                  .map((entry) => (
                    <RosterRow key={entry.id} entry={entry} statistics={statistics.get(entry.id)} />
                  ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('Battle log')}</CardTitle>
          <CardDescription>
            {t('A full account of the first simulation, round by round.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BattleLog events={battle.log} names={names} />
        </CardContent>
      </Card>
    </section>
  )
}

function SummaryTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="grid gap-1 pt-6">
        <p className="text-muted-foreground text-xs font-medium tracking-[0.16em] uppercase">
          {label}
        </p>
        <p className="text-foreground text-3xl font-semibold">{value}</p>
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

function RosterRow({
  entry,
  statistics,
}: {
  entry: RosterEntry
  statistics?: CombatantStatistics
}) {
  const { t } = useLanguage()
  const skills = Object.entries(entry.skills)

  return (
    <li className="grid gap-1 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-foreground font-medium">{entry.name}</p>
        {entry.wild_card ? <Badge variant="outline">{t('Wild Card')}</Badge> : null}
      </div>
      <p className="text-muted-foreground">
        {t('Pace')} {entry.pace} · {t('Parry')} {entry.parry} · {t('Toughness')}{' '}
        {toughnessLabel(entry.toughness, entry.armor)}
        {skills.length > 0
          ? ` · ${skills.map(([slug, die]) => `${t(skillLabel(slug))} ${die}`).join(', ')}`
          : ''}
      </p>
      {entry.weapons.length > 0 ? (
        <p className="text-muted-foreground">
          {entry.weapons
            .map((weapon) =>
              [
                t(weapon.name),
                weapon.damage ? formatDamage(weapon.damage) : null,
                weapon.ap ? `AP ${weapon.ap}` : null,
                weapon.range ? weapon.range.join('/') : null,
              ]
                .filter(Boolean)
                .join(' '),
            )
            .join(' · ')}
        </p>
      ) : null}
      {statistics ? (
        <p className="text-foreground">
          {t('Taken out')} {formatPercent(statistics.incapacitated_rate)} · {t('Killed')}{' '}
          {formatPercent(statistics.death_rate)}
          {statistics.fled_rate > 0
            ? ` · ${t('Fled')} ${formatPercent(statistics.fled_rate)}`
            : ''}{' '}
          · {t('Average wounds')} {statistics.average_wounds}
        </p>
      ) : null}
    </li>
  )
}

function BattleLog({ events, names }: { events: BattleEvent[]; names: Record<string, string> }) {
  const { t } = useLanguage()
  const rounds = new Map<number, BattleEvent[]>()
  events.forEach((event) => {
    const round = rounds.get(event.round) ?? []
    round.push(event)
    rounds.set(event.round, round)
  })

  return (
    <div className="grid gap-6">
      {Array.from(rounds.entries()).map(([round, roundEvents]) => (
        <section key={round} aria-labelledby={`round-${round}`}>
          <h3 id={`round-${round}`} className="font-display text-foreground mb-2 text-xl">
            {round === 0 ? t('Setup') : `${t('Round')} ${round}`}
          </h3>
          <ol className="border-border grid gap-1.5 border-l pl-4 text-sm">
            {roundEvents.map((event, index) => {
              const formatted = formatEvent(event, names, t)
              if (!formatted) return null

              return (
                <li
                  key={index}
                  className={cn(
                    'text-muted-foreground',
                    formatted.emphasis === 'turn' && 'text-foreground mt-2 font-medium',
                    formatted.emphasis === 'outcome' && 'text-foreground font-semibold',
                  )}
                >
                  <p>{formatted.text}</p>
                  {formatted.detail ? (
                    <p className="text-muted-foreground/80 font-mono text-xs">{formatted.detail}</p>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}
