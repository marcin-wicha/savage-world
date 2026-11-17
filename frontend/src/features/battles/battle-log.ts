import type { BattleEvent } from './battle-types'

type Translate = (text: string) => string

type RollJson = {
  die?: string
  modifier?: number
  trait?: number[][]
  wild?: number[] | null
  totals?: number[]
  critical_failure?: boolean
  rolls?: { die: string; rolls: number[] }[]
  total?: number
}

export type FormattedEvent = {
  text: string
  detail?: string
  emphasis?: 'turn' | 'outcome'
}

export const modifierLabels: Record<string, string> = {
  wounds: 'Wounds',
  fatigue: 'Fatigue',
  distracted: 'Distracted',
  joker: 'Joker',
  multi_action: 'Multi-action',
  illumination: 'Illumination',
  trademark_weapon: 'Trademark Weapon',
  wild_attack: 'Wild Attack',
  gang_up: 'Gang Up',
  unarmed_defender: 'Unarmed defender',
  range: 'Range',
  cover: 'Cover',
  shield: 'Shield',
  dodge: 'Dodge',
  aim: 'Aim',
  minimum_strength: 'Minimum Strength',
  called_shot_head: 'Called shot (head)',
  vulnerable_target: 'Vulnerable target',
  scale: 'Scale',
  recoil: 'Recoil',
  sweep: 'Sweep',
}

export const injuryLabels: Record<string, string> = {
  unmentionables: 'Unmentionables',
  arm: 'Arm',
  leg: 'Leg',
  guts_broken: 'Guts (broken)',
  guts_battered: 'Guts (battered)',
  guts_busted: 'Guts (busted)',
  head_hideous_scar: 'Head (hideous scar)',
  head_blinded: 'Head (blinded)',
  head_brain_damage: 'Head (brain damage)',
}

const attackOutcomes: Record<string, string> = {
  miss: 'miss',
  hit: 'hit',
  raise: 'hit with a raise',
  critical_failure: 'critical failure',
}

const damageOutcomes: Record<string, string> = {
  no_effect: 'no effect',
  shaken: 'Shaken',
  soaked: 'soaked',
  wounded: 'wounded',
  incapacitated: 'incapacitated',
}

const testOutcomes: Record<string, string> = {
  failure: 'resisted',
  success: 'Vulnerable',
  raise: 'Vulnerable and Shaken',
  immune: 'immune',
}

export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  )
}

function text(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function isRoll(value: unknown): value is RollJson {
  return Boolean(value) && typeof value === 'object'
}

export function describeTraitRoll(roll: unknown, t: Translate) {
  if (!isRoll(roll) || !roll.trait) return ''

  const trait = roll.trait.map((rolls) => rolls.join('+')).join(', ')
  const parts = [`${roll.die}: ${trait}`]
  if (roll.wild) parts.push(`${t('Wild Die')}: ${roll.wild.join('+')}`)
  if (roll.modifier) parts.push(`${roll.modifier > 0 ? '+' : ''}${roll.modifier}`)
  parts.push(`= ${(roll.totals ?? []).join(' / ')}`)
  if (roll.critical_failure) parts.push(`(${t('critical failure')})`)

  return parts.join(' · ')
}

export function describeDamageRoll(roll: unknown) {
  if (!isRoll(roll) || !roll.rolls) return ''

  const dice = roll.rolls.map((die) => `${die.die}: ${die.rolls.join('+')}`)
  if (roll.modifier) dice.push(`${roll.modifier > 0 ? '+' : ''}${roll.modifier}`)

  return `${dice.join(' · ')} = ${roll.total ?? ''}`
}

function describeModifiers(value: unknown, t: Translate) {
  if (!Array.isArray(value)) return ''

  return value
    .flatMap((modifier: unknown) => {
      if (!modifier || typeof modifier !== 'object') return []
      const { label, value: amount } = modifier as { label?: unknown; value?: unknown }
      if (typeof label !== 'string' || typeof amount !== 'number') return []

      return [`${t(modifierLabels[label] ?? label)} ${amount > 0 ? '+' : ''}${amount}`]
    })
    .join(' · ')
}

export function formatEvent(
  event: BattleEvent,
  names: Record<string, string>,
  t: Translate,
): FormattedEvent | null {
  const formatted = describeEvent(event, names, t)
  if (!formatted || event.type === 'attack' || event.rerolled !== true) return formatted

  return {
    ...formatted,
    detail: [formatted.detail, t('Benny reroll')].filter(Boolean).join(' · '),
  }
}

function describeEvent(
  event: BattleEvent,
  names: Record<string, string>,
  t: Translate,
): FormattedEvent | null {
  const name = (key: string) => names[text(event[key])] ?? text(event[key])
  const say = (template: string, values: Record<string, string | number> = {}) =>
    fill(t(template), { actor: name('actor'), target: name('target'), ...values })

  switch (event.type) {
    case 'battle_start':
      return { text: t('The battle begins.') }
    case 'initiative': {
      const cards = Array.isArray(event.cards) ? event.cards : []
      const order = cards
        .map((entry: unknown) => {
          const { card, combatants } = entry as { card?: { label?: string }; combatants?: string[] }
          const label = card?.label === 'Joker' ? t('Joker') : (card?.label ?? '')
          return `${label} ${(combatants ?? []).map((id) => names[id] ?? id).join(' + ')}`
        })
        .join(' · ')
      return { text: `${t('Action cards')}: ${order}` }
    }
    case 'joker':
      return {
        text: say(
          event.side === 'party'
            ? '{actor} draws a Joker and every hero gains a Benny.'
            : '{actor} draws a Joker and the GM gains a Benny.',
        ),
        emphasis: 'outcome',
      }
    case 'initiative_redraw': {
      const label = (value: unknown) => {
        const card = value as { label?: string } | null
        return card?.label === 'Joker' ? t('Joker') : (card?.label ?? '')
      }
      return {
        text: say('{actor} spends a Benny to draw a new card: {from} → {to}.', {
          from: label(event.from),
          to: label(event.to),
        }),
      }
    }
    case 'quick_redraw':
      return { text: say('{actor} redraws a low card (Quick).') }
    case 'turn_start':
      return {
        text: say('{actor} acts on {card}.', {
          card: event.card === 'Joker' ? t('Joker') : text(event.card),
        }),
        emphasis: 'turn',
      }
    case 'recover': {
      const condition = event.condition === 'stunned' ? 'Stunned' : 'Shaken'
      const template = event.benny
        ? '{actor} spends a Benny to recover from {condition}.'
        : event.recovered
          ? '{actor} recovers from {condition}.'
          : '{actor} remains {condition}.'
      return {
        text: say(template, { condition: t(condition) }),
        detail: describeTraitRoll(event.roll, t),
      }
    }
    case 'bleeding_out': {
      const templates: Record<string, string> = {
        dead: '{actor} bleeds out and dies.',
        stabilized: '{actor} stabilizes.',
        bleeding: '{actor} is still bleeding out.',
        survived: '{actor} cheats death.',
      }
      return {
        text: say(templates[text(event.outcome)] ?? '{actor} is still bleeding out.'),
        detail: describeTraitRoll(event.roll, t),
        emphasis: event.outcome === 'dead' ? 'outcome' : undefined,
      }
    }
    case 'move':
      return {
        text: say(event.running ? '{actor} runs to {to}″.' : '{actor} moves to {to}″.', {
          to: text(event.to),
        }),
      }
    case 'run':
      return {
        text: say('{actor} rolls {die} to run: {roll}″.', {
          die: text(event.die),
          roll: text(event.roll),
        }),
      }
    case 'withdraw':
      return { text: say('{actor} withdraws from {target} and provokes a free attack.') }
    case 'first_strike':
      return { text: say('{actor} strikes first at {target}.') }
    case 'attack': {
      const outcome = t(attackOutcomes[text(event.outcome)] ?? text(event.outcome))
      const template = event.free
        ? '{actor} makes a free attack on {target} with {weapon}: {outcome}.'
        : event.wild_attack
          ? '{actor} makes a Wild Attack on {target} with {weapon}: {outcome}.'
          : '{actor} attacks {target} with {weapon}: {outcome}.'
      const modifiers = describeModifiers(event.modifiers, t)
      const detail = [
        describeTraitRoll(event.roll, t),
        modifiers,
        `${t('TN')} ${text(event.target_number)}`,
        event.rerolled ? t('Benny reroll') : '',
      ]
        .filter(Boolean)
        .join(' · ')
      return { text: say(template, { weapon: t(text(event.weapon)), outcome }), detail }
    }
    case 'sweep': {
      const targets = Array.isArray(event.targets)
        ? event.targets.map((id) => names[text(id)] ?? text(id)).join(' + ')
        : ''
      return {
        text: say('{actor} sweeps at {targets} with {weapon}.', {
          targets,
          weapon: t(text(event.weapon)),
        }),
        detail: describeTraitRoll(event.roll, t),
      }
    }
    case 'test':
      return {
        text: say('{actor} tests {target} with {skill}: {outcome}.', {
          skill: t(event.skill === 'taunt' ? 'Taunt' : 'Intimidation'),
          outcome: t(testOutcomes[text(event.outcome)] ?? text(event.outcome)),
        }),
        detail: describeTraitRoll(event.roll, t),
      }
    case 'damage': {
      const wounds = Number(event.wounds ?? 0)
      const outcome =
        event.outcome === 'wounded' || event.outcome === 'incapacitated'
          ? `${t(damageOutcomes[text(event.outcome)])} (${wounds} ${t(wounds === 1 ? 'wound' : 'wounds')})`
          : t(damageOutcomes[text(event.outcome)] ?? text(event.outcome))
      return {
        text: say('{target} takes {total} damage against Toughness {toughness}: {outcome}.', {
          total: isRoll(event.roll) ? text(event.roll.total) : '',
          toughness: text(event.toughness),
          outcome,
        }),
        detail: [
          describeDamageRoll(event.roll),
          event.raise_bonus ? t('raise bonus d6') : '',
          event.armor_piercing ? `AP ${text(event.armor_piercing)}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
        emphasis: event.incapacitated ? 'outcome' : undefined,
      }
    }
    case 'soak':
      return {
        text: say('{actor} spends a Benny to soak: {removed} of {wounds} removed.', {
          removed: text(event.removed),
          wounds: `${text(event.wounds)} ${t(Number(event.wounds) === 1 ? 'wound' : 'wounds')}`,
        }),
        detail: describeTraitRoll(event.roll, t),
      }
    case 'incapacitated': {
      const injury = t(injuryLabels[text(event.injury)] ?? text(event.injury))
      const templates: Record<string, string> = {
        out: '{actor} is out of the fight.',
        dead: '{actor} is killed.',
        bleeding_out: '{actor} is incapacitated and bleeding out. Injury: {injury}.',
        injured: '{actor} is incapacitated. Injury: {injury}.',
      }
      return {
        text: say(templates[text(event.outcome)] ?? templates.out, { injury }),
        detail: describeTraitRoll(event.roll, t),
        emphasis: 'outcome',
      }
    }
    case 'innocent_bystander':
      return { text: say('{actor} hits {target} by accident!') }
    case 'area_effect': {
      const targets = Array.isArray(event.targets)
        ? event.targets.map((id) => names[text(id)] ?? text(id)).join(' + ')
        : ''
      return { text: say('The blast catches {targets}.', { targets }) }
    }
    case 'defend':
      return { text: say('{actor} goes on the defensive (+4 Parry).') }
    case 'reload':
      return { text: say('{actor} reloads {weapon}.', { weapon: t(text(event.weapon)) }) }
    case 'morale': {
      const templates: Record<string, string> = {
        fled: '{actor} breaks and flees.',
        held: '{actor} holds their ground.',
        fearless: '{actor} is fearless.',
      }
      return {
        text: say(templates[text(event.outcome)] ?? templates.held),
        detail: describeTraitRoll(event.roll, t),
        emphasis: event.outcome === 'fled' ? 'outcome' : undefined,
      }
    }
    case 'battle_end': {
      const templates: Record<string, string> = {
        party: 'The party wins.',
        enemies: 'The enemies win.',
        draw: 'The battle ends in a draw.',
      }
      return { text: t(templates[text(event.winner)] ?? templates.draw), emphasis: 'outcome' }
    }
    default:
      return null
  }
}
