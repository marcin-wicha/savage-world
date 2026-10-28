import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRestMutation, useRestQuery } from '@/lib/queries'
import { useLanguage } from '@/lib/i18n-context'

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

type DeleteCharacterVariables = {
  id: number
}

export function CharactersRoute() {
  const { t, language } = useLanguage()
  const queryClient = useQueryClient()
  const [deleteError, setDeleteError] = useState(false)
  const { data, isPending, isError } = useRestQuery<CharactersResponse>(
    ['characters'],
    '/api/v1/characters',
  )
  const characters = data?.characters ?? []
  const deleteMutation = useRestMutation<void, DeleteCharacterVariables>(
    { path: ({ id }) => `/api/v1/characters/${id}`, method: 'DELETE' },
    {
      onSuccess: () => {
        setDeleteError(false)
        void queryClient.invalidateQueries({ queryKey: ['characters'] })
      },
      onError: () => setDeleteError(true),
    },
  )

  const deleteCharacter = (character: Character) => {
    if (
      !window.confirm(language === 'pl' ? `Usunąć ${character.name}?` : `Delete ${character.name}?`)
    )
      return

    setDeleteError(false)
    deleteMutation.mutate({ id: character.id })
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-foreground text-4xl">{t('Characters')}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t('Manage the characters you have created.')}
          </p>
        </div>
        <Button asChild>
          <Link to="/characters/new">{t('Create a character')}</Link>
        </Button>
      </div>

      {isPending ? (
        <p className="text-muted-foreground mt-6 text-sm">{t('Loading characters…')}</p>
      ) : null}

      {isError ? (
        <p className="text-danger mt-6 text-sm" role="alert">
          {t('Could not load characters. Try again.')}
        </p>
      ) : null}

      {!isPending && !isError && characters.length === 0 ? (
        <Card className="mt-6 max-w-2xl">
          <CardHeader>
            <CardTitle>{t('No characters yet')}</CardTitle>
            <CardDescription>
              {t('Create your first character to add it to your roster.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/characters/new">{t('Create a character')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {deleteError ? (
        <p className="text-danger mt-6 text-sm" role="alert">
          {t('Could not delete character. Try again.')}
        </p>
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
                    <dt className="text-muted-foreground">{t('Rank')}</dt>
                    <dd className="text-foreground font-medium">
                      {t(rankLabels[character.rank] ?? character.rank)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('Origin')}</dt>
                    <dd className="text-foreground font-medium">
                      {character.origin_name ? t(character.origin_name) : t('No origin selected')}
                    </dd>
                  </div>
                </dl>
                <div className="mt-6 flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/characters/${character.id}/edit`}>{t('Edit')}</Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteCharacter(character)}
                    disabled={deleteMutation.isPending}
                  >
                    {t('Delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  )
}
