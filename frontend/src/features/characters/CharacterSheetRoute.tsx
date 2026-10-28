import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useRestQuery } from '@/lib/queries'

const rankLabels: Record<string, string> = {
  novice: 'Novice',
  seasoned: 'Seasoned',
  veteran: 'Veteran',
  heroic: 'Heroic',
  legendary: 'Legendary',
}

const attributeLabels = {
  agility: 'Agility',
  smarts: 'Smarts',
  spirit: 'Spirit',
  strength: 'Strength',
  vigor: 'Vigor',
} as const

type SheetSkill = { id: number; name: string; attribute: string; die: string }
type SheetItem = { id: number; name: string }
type CharacterSheet = {
  id: number
  name: string
  rank: string
  origin_name: string | null
  attributes: Record<keyof typeof attributeLabels, string>
  skills: SheetSkill[]
  edges: SheetItem[]
  hindrances: SheetItem[]
}
type CharacterResponse = { character: CharacterSheet }

function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="sheet-section">
      <h2 className="sheet-section-title">{title}</h2>
      {children}
    </section>
  )
}

function BlankLines({ count = 3 }: { count?: number }) {
  return (
    <div className="grid">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="sheet-blank-line" />
      ))}
    </div>
  )
}

export function CharacterSheetRoute() {
  const { id } = useParams()
  const { data, isPending, isError } = useRestQuery<CharacterResponse>(
    ['character-sheet', id],
    `/api/v1/characters/${id}`,
    { enabled: Boolean(id && /^\d+$/.test(id)) },
  )
  const character = data?.character

  if (isPending) return <p role="status">Loading character sheet…</p>
  if (isError || !character) {
    return (
      <div role="alert" className="grid gap-4">
        <p>Could not load this character sheet.</p>
        <Button asChild variant="outline">
          <Link to="/characters">Back to characters</Link>
        </Button>
      </div>
    )
  }

  const vigor = Number(character.attributes.vigor.slice(1))
  const toughness = 2 + vigor / 2
  const skills = [...character.skills].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link to="/characters">← Characters</Link>
        </Button>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/characters/${character.id}/edit`}>Edit</Link>
          </Button>
          <Button type="button" size="sm" onClick={() => window.print()}>
            Print sheet
          </Button>
        </div>
      </div>

      <article className="character-sheet bg-white p-5 text-black shadow-xl sm:p-8 print:m-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="grid grid-cols-12 gap-3 border-b-2 border-black pb-4">
          <div className="col-span-12 flex items-start justify-between gap-3 sm:col-span-8">
            <div>
              <p className="text-[0.65rem] font-bold tracking-[0.28em]">
                SAVAGE WORLDS · ADVENTURE EDITION
              </p>
              <h1 className="mt-1 text-4xl leading-none font-black tracking-tight uppercase">
                {character.name}
              </h1>
            </div>
            <div className="hidden border-2 border-black px-3 py-2 text-center sm:block">
              <p className="text-[0.55rem] font-bold tracking-widest">RANK</p>
              <p className="text-lg font-black uppercase">
                {rankLabels[character.rank] ?? character.rank}
              </p>
            </div>
          </div>
          <div className="col-span-12 grid grid-cols-2 gap-2 sm:col-span-4 sm:grid-cols-1">
            <InfoBox
              label="Rank"
              value={rankLabels[character.rank] ?? character.rank}
              className="sm:hidden"
            />
            <InfoBox label="Ancestry / Origin" value={character.origin_name ?? ''} />
            <InfoBox label="Player" value="" />
          </div>
        </header>

        <div className="mt-4 grid gap-4 md:grid-cols-[0.9fr_1.35fr_1fr]">
          <div className="grid content-start gap-4">
            <SheetSection title="Attributes">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(attributeLabels).map(([key, label]) => (
                  <div key={key} className="sheet-die-box">
                    <span>{label}</span>
                    <strong>
                      {character.attributes[key as keyof typeof attributeLabels] ?? 'd4'}
                    </strong>
                  </div>
                ))}
              </div>
            </SheetSection>
            <SheetSection title="Stats">
              <div className="grid grid-cols-3 gap-1 text-center">
                <StatBox label="Pace" value="6" />
                <StatBox label="Parry" value="2" />
                <StatBox label="Toughness" value={`${toughness}`} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                <StatBox label="Bennies" value="○ ○ ○" />
                <StatBox label="Wounds" value="○ ○ ○" />
                <StatBox label="Fatigue" value="○ ○" />
              </div>
            </SheetSection>
            <SheetSection title="Hindrances">
              <NameList items={character.hindrances} emptyLines={3} />
            </SheetSection>
          </div>

          <div className="grid content-start gap-4">
            <SheetSection title="Skills">
              {skills.length ? (
                <div className="grid grid-cols-2 gap-x-3">
                  {skills.map((skill) => (
                    <div key={skill.id} className="sheet-skill-row">
                      <span>{skill.name}</span>
                      <strong>{skill.die}</strong>
                    </div>
                  ))}
                  <BlankLines count={Math.max(0, 10 - skills.length)} />
                </div>
              ) : (
                <BlankLines count={8} />
              )}
            </SheetSection>
            <SheetSection title="Edges">
              <NameList items={character.edges} emptyLines={4} />
            </SheetSection>
            <SheetSection title="Gear & Equipment">
              <BlankLines count={4} />
            </SheetSection>
          </div>

          <div className="grid content-start gap-4">
            <SheetSection title="Weapons">
              <div className="sheet-table-head">
                <span>Name</span>
                <span>Range</span>
                <span>Damage</span>
                <span>RoF</span>
              </div>
              <BlankLines count={4} />
            </SheetSection>
            <SheetSection title="Powers">
              <BlankLines count={4} />
            </SheetSection>
            <SheetSection title="Notes">
              <BlankLines count={8} />
            </SheetSection>
          </div>
        </div>
        <footer className="mt-4 flex justify-between border-t border-black pt-2 text-[0.55rem] font-bold tracking-widest">
          <span>CHARACTER RECORD</span>
          <span>PAGE 1</span>
        </footer>
      </article>
    </div>
  )
}

function InfoBox({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={`sheet-info-box ${className}`}>
      <span>{label}</span>
      <strong>{value || '\u00a0'}</strong>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="sheet-stat-box">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function NameList({ items, emptyLines }: { items: SheetItem[]; emptyLines: number }) {
  return items.length ? (
    <ul className="grid gap-1">
      {items.map((item) => (
        <li key={item.id} className="sheet-list-row">
          {item.name}
        </li>
      ))}
    </ul>
  ) : (
    <BlankLines count={emptyLines} />
  )
}
