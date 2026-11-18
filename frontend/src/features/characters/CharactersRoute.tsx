import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { CharacterAvatar } from '@/components/character-avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRestMutation, useRestQuery } from '@/lib/queries'
import { useLanguage } from '@/lib/i18n-context'

import type { CharacterStatus } from './character-draft'

const rankLabels: Record<string, string> = {
  novice: 'Novice',
  seasoned: 'Seasoned',
  veteran: 'Veteran',
  heroic: 'Heroic',
  legendary: 'Legendary',
}

type Character = {
  id: number
  name: string | null
  status: CharacterStatus
  updated_at: string
  avatar_url: string | null
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
  const allCharacters = data?.characters ?? []
  const characters = allCharacters.filter((character) => character.status !== 'draft')
  const drafts = allCharacters.filter((character) => character.status === 'draft')
  const [discardError, setDiscardError] = useState(false)
  const rosterLoaded = !isPending && !isError
  const showEmptyState = rosterLoaded && characters.length === 0 && drafts.length === 0
  const dateFormat = new Intl.DateTimeFormat(language === 'pl' ? 'pl-PL' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const discardMutation = useRestMutation<void, { id: number }>(
    { path: ({ id }) => `/api/v1/characters/${id}`, method: 'DELETE' },
    {
      onSuccess: () => {
        setDiscardError(false)
        void queryClient.invalidateQueries({ queryKey: ['characters'] })
      },
      onError: () => setDiscardError(true),
    },
  )
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
      !window.confirm(
        language === 'pl' ? `Usunąć ${character.name ?? ''}?` : `Delete ${character.name ?? ''}?`,
      )
    )
      return

    setDeleteError(false)
    deleteMutation.mutate({ id: character.id })
  }

  const discardDraft = (draft: Character) => {
    if (!window.confirm(t('Discard the unfinished character?'))) return

    setDiscardError(false)
    discardMutation.mutate({ id: draft.id })
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
        {!showEmptyState ? (
          <Button asChild>
            <Link to="/characters/new">{t('Create a character')}</Link>
          </Button>
        ) : null}
      </div>

      {drafts.length > 0 ? (
        <section aria-labelledby="character-drafts-heading" className="mt-6">
          <h2 id="character-drafts-heading" className="text-foreground text-xl font-medium">
            {t('Unfinished characters')}
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.map((draft) => (
              <Card key={draft.id}>
                <CardHeader>
                  <CardTitle className="min-w-0 break-words">
                    {draft.name || t('Unnamed character')}
                  </CardTitle>
                  <CardDescription>
                    {t('Last saved')} {dateFormat.format(new Date(draft.updated_at))}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link
                      to={`/characters/${draft.id}/edit`}
                      aria-label={`${t('Continue draft')}: ${draft.name || t('Unnamed character')}`}
                    >
                      {t('Continue draft')}
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => discardDraft(draft)}
                    disabled={discardMutation.isPending}
                    aria-label={`${t('Discard draft')}: ${draft.name || t('Unnamed character')}`}
                  >
                    {t('Discard draft')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {discardError ? (
            <p className="text-danger mt-3 text-sm" role="alert">
              {t('Could not discard the draft. Try again.')}
            </p>
          ) : null}
        </section>
      ) : null}

      {isPending ? (
        <p className="text-muted-foreground mt-6 text-sm">{t('Loading characters…')}</p>
      ) : null}

      {isError ? (
        <p className="text-danger mt-6 text-sm" role="alert">
          {t('Could not load characters. Try again.')}
        </p>
      ) : null}

      {showEmptyState ? (
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

      {rosterLoaded && characters.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <Card key={character.id}>
              <CardHeader className="flex flex-row items-center gap-4">
                <CharacterAvatar name={character.name ?? ''} src={character.avatar_url} />
                <div className="grid min-w-0 gap-1">
                  <CardTitle className="min-w-0 break-words">{character.name}</CardTitle>
                  {character.status === 'dead' ? (
                    <p className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
                      {t('Dead')}
                    </p>
                  ) : null}
                </div>
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
                    <Link to={`/characters/${character.id}/sheet`}>{t('Sheet')}</Link>
                  </Button>
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
