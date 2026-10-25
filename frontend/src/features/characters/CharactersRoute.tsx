import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRestQuery } from '@/lib/queries'

const rankLabels: Record<string, string> = {
  novice: 'Novice',
  seasoned: 'Seasoned',
  veteran: 'Veteran',
  heroic: 'Heroic',
  legendary: 'Legendary',
}

type Character = {
  id: number
  name: string
  rank: string
  origin_name: string | null
}

type CharactersResponse = {
  characters: Character[]
}

export function CharactersRoute() {
  const { data, isPending, isError } = useRestQuery<CharactersResponse>(
    ['characters'],
    '/api/v1/characters',
  )
  const characters = data?.characters ?? []

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-foreground text-4xl">Characters</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Manage the characters you have created.
          </p>
        </div>
        <Button asChild>
          <Link to="/characters/new">Create a character</Link>
        </Button>
      </div>

      {isPending ? <p className="text-muted-foreground mt-6 text-sm">Loading characters…</p> : null}

      {isError ? (
        <p className="text-danger mt-6 text-sm" role="alert">
          Could not load characters. Try again.
        </p>
      ) : null}

      {!isPending && !isError && characters.length === 0 ? (
        <Card className="mt-6 max-w-2xl">
          <CardHeader>
            <CardTitle>No characters yet</CardTitle>
            <CardDescription>Create your first character to add it to your roster.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/characters/new">Create a character</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!isPending && !isError && characters.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <Card key={character.id}>
              <CardHeader>
                <CardTitle>{character.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Rank</dt>
                    <dd className="text-foreground font-medium">
                      {rankLabels[character.rank] ?? character.rank}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Origin</dt>
                    <dd className="text-foreground font-medium">
                      {character.origin_name ?? 'No origin selected'}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  )
}
