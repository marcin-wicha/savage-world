import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
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
  type RunResponse,
  type RunResult,
  type Side,
} from './battle-types'

const winnerLabels: Record<string, string> = {
  party: 'Party victory',
  enemies: 'Enemy victory',
  draw: 'Draw',
}

type RunOutcome = 'won' | 'lost' | 'draw'
type RunFilter = 'all' | RunOutcome

const runOutcome = (winner: RunResult['winner']): RunOutcome =>
  winner === 'party' ? 'won' : winner === 'enemies' ? 'lost' : 'draw'

const runFilters: { value: RunFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'draw', label: 'Draw' },
]

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
            {t('Every simulated run, round by round. Filter by outcome and pick a run.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BattleRuns battle={battle} names={names} />
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

function BattleRuns({ battle, names }: { battle: BattleDetail; names: Record<string, string> }) {
  const { t } = useLanguage()
  const [filter, setFilter] = useState<RunFilter>('all')
  const [selected, setSelected] = useState(0)
  const results = battle.run_results ?? [
    { index: 0, winner: battle.summary.first_run.winner, rounds: battle.summary.first_run.rounds },
  ]
  const counts: Record<RunFilter, number> = { all: results.length, won: 0, lost: 0, draw: 0 }
  results.forEach((result) => {
    counts[runOutcome(result.winner)] += 1
  })
  const filtered =
    filter === 'all' ? results : results.filter((result) => runOutcome(result.winner) === filter)
  const current = filtered.find((result) => result.index === selected) ?? filtered[0]
  const runQuery = useRestQuery<RunResponse>(
    [...battleQueryKey(battle.id), 'runs', current?.index ?? null],
    `/api/v1/battles/${battle.id}/runs/${current?.index ?? 0}`,
    { enabled: current !== undefined && current.index !== 0, staleTime: Infinity },
  )
  const outcomeLabel = (result: RunResult) =>
    t(runFilters.find((option) => option.value === runOutcome(result.winner))?.label ?? 'Draw')
  const roundsLabel = (rounds: number) => `${rounds} ${t(rounds === 1 ? 'round' : 'rounds')}`

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div role="group" aria-label={t('Filter runs by outcome')} className="flex flex-wrap gap-2">
          {runFilters.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant="outline"
              aria-pressed={filter === option.value}
              disabled={option.value !== 'all' && counts[option.value] === 0}
              onClick={() => setFilter(option.value)}
              className={cn(filter === option.value && 'bg-accent text-accent-foreground')}
            >
              {t(option.label)} ({counts[option.value]})
            </Button>
          ))}
        </div>
        {current ? (
          <div className="grid min-w-56 gap-1.5">
            <label htmlFor="battle-run" className="text-foreground text-sm font-medium">
              {t('Run')}
            </label>
            <select
              id="battle-run"
              value={current.index}
              onChange={(event) => setSelected(Number(event.target.value))}
              className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
            >
              {filtered.map((result) => (
                <option key={result.index} value={result.index}>
                  {t('Run')} {result.index + 1} · {outcomeLabel(result)} ·{' '}
                  {roundsLabel(result.rounds)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {current ? (
        <div className="grid gap-4">
          <p className="text-foreground text-sm font-medium" aria-live="polite">
            {t('Run')} {current.index + 1}: {outcomeLabel(current)} · {roundsLabel(current.rounds)}
          </p>
          {current.index === 0 ? (
            <BattleLog events={battle.log} names={names} />
          ) : runQuery.isPending ? (
            <p className="text-muted-foreground text-sm">{t('Loading battle log…')}</p>
          ) : runQuery.isError || !runQuery.data ? (
            <p className="text-danger text-sm" role="alert">
              {t('Could not load this run. Try again.')}
            </p>
          ) : (
            <BattleLog events={runQuery.data.run.log} names={names} />
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{t('No runs match this outcome.')}</p>
      )}
    </div>
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
