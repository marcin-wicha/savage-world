import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { MultiStepFlow, type MultiStepFlowStep } from '@/components/multi-step-flow'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ApiError, api } from '@/lib/api-client'
import { useRestQuery } from '@/lib/queries'
import { useLanguage } from '@/lib/i18n-context'

import { AttributesStep } from './AttributesStep'
import { DerivedStatistics } from './DerivedStatistics'
import { ConceptStep } from './ConceptStep'
import { CharacterSummaryStep } from './CharacterSummaryStep'
import { EdgesStep } from './EdgesStep'
import { OriginStep } from './OriginStep'

import { HindrancesStep } from './HindrancesStep'
import {
  type CharacterResponse,
  type DraftSaveStatus,
  characterToFormValues,
  hasDraftContent,
  toCharacterSaveFields,
  useCharacterDraftAutosave,
} from './character-draft'
import { GearStep } from './GearStep'
import { SkillsStep } from './SkillsStep'
import {
  type CharacterFormValues,
  type CharacterStepId,
  characterFormDefaults,
  characterFormSchema,
  characterStepFields,
} from './character-form'

type StepDefinition = {
  id: CharacterStepId
  title: string
  heading: string
  description: string
}

function saveErrorMessage(error: Error | null) {
  if (!(error instanceof ApiError)) return error?.message

  const payload = error.payload
  if (payload && typeof payload === 'object' && 'details' in payload) {
    const details = payload.details
    if (details && typeof details === 'object') {
      const messages = Object.values(details).flatMap((value) =>
        Array.isArray(value)
          ? value.filter((message): message is string => typeof message === 'string')
          : [],
      )

      if (messages.length > 0) return messages.join(' ')
    }
  }

  return error.message
}

const stepDefinitions: StepDefinition[] = [
  {
    id: 'concept',
    title: 'Concept',
    heading: 'Character concept',
    description:
      'Decide who your character is. Give them a name and a one-line idea: what they do, what they are like, or what drives them. This step has no rules effects, but it will help you make choices in the steps that follow.',
  },
  {
    id: 'origin',
    title: 'Origin',
    heading: 'Choose an origin',
    description:
      'Pick the people and homeland your character comes from. Your origin sets the culture they grew up in and the story behind them.',
  },
  {
    id: 'hindrances',
    title: 'Hindrances',
    heading: 'Take hindrances',
    description:
      'Hindrances are flaws, bad habits, or troubles that make your character more interesting to play, such as greed, stubbornness, or poor eyesight. Each one earns points you spend on the next steps: Attributes, Skills, and Edges. A Minor hindrance is worth 1 point and a Major one 2, up to 4 points in total. An edge costs 2 points, so keep some unspent on the Attributes and Skills steps if you want edges.',
  },
  {
    id: 'attributes',
    title: 'Attributes',
    heading: 'Assign attributes',
    description:
      "Attributes are your character's natural talents: Agility (speed and coordination), Smarts (knowledge and quick thinking), Spirit (willpower and nerve), Strength (physical power), and Vigor (health and endurance). Each is rated with a die from d4 (weak) to d12 (exceptional); a bigger die means better rolls. Every attribute starts at d4. You have 5 points, and each point raises one attribute by one die size. Unspent hindrance points can buy more.",
  },
  {
    id: 'skills',
    title: 'Skills',
    heading: 'Choose skills',
    description:
      'Skills are what your character has learned, such as fighting, shooting, sneaking, or persuading. Like attributes, they use dice from d4 to d12. Core skills everyone knows already start at d4; other skills cost a point to learn and stay untrained until you pick them. You have 12 points to spend, and unspent hindrance points can buy more.',
  },
  {
    id: 'edges',
    title: 'Edges',
    heading: 'Choose edges',
    description:
      'Edges are special talents, tricks, and advantages that set your character apart, like being unusually lucky, quick, or brave in combat. Each edge costs 2 hindrance points. Some edges need a minimum rank or a certain attribute or skill die; you can only pick those whose requirements you meet.',
  },
  {
    id: 'gear',
    title: 'Gear',
    heading: 'Purchase gear',
    description:
      'Buy the weapons, armor, and supplies your character starts the adventure with. Each item shows its price and rules; you cannot spend more than your starting funds.',
  },
  {
    id: 'summary',
    title: 'Summary',
    heading: 'Review your character',
    description:
      'Look over everything you chose. If something looks wrong, go back to that step and change it. All hindrance points must be spent before you can save the character.',
  },
]

type EditorNavigationState = { keepEditor: true }

const keepEditorState: EditorNavigationState = { keepEditor: true }

const keepsEditor = (state: unknown): state is EditorNavigationState =>
  Boolean(state && typeof state === 'object' && 'keepEditor' in state)

export function NewCharacterRoute() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const [editor, setEditor] = useState({ key: location.key, locationKey: location.key })

  if (location.key !== editor.locationKey) {
    setEditor({
      key: keepsEditor(location.state) ? editor.key : location.key,
      locationKey: location.key,
    })
  }

  return <CharacterLoader key={editor.key} routeId={id ?? null} />
}

function CharacterLoader({ routeId }: { routeId: string | null }) {
  const { t } = useLanguage()
  const [characterId] = useState(() => {
    const parsed = Number(routeId)
    return routeId !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null
  })
  const characterQuery = useRestQuery<CharacterResponse>(
    ['character', String(characterId)],
    `/api/v1/characters/${characterId ?? ''}`,
    { enabled: characterId !== null, gcTime: 0, staleTime: 0 },
  )

  if (characterId === null) return <CharacterEditor character={null} />

  if (characterQuery.isPending) {
    return <p className="text-muted-foreground text-sm">{t('Loading character…')}</p>
  }

  if (characterQuery.isError) {
    return (
      <div className="grid gap-3">
        <p className="text-danger text-sm" role="alert">
          {t('Could not load character. Try again.')}
        </p>
        <Button asChild variant="outline" className="w-fit">
          <Link to="/characters">{t('Back to characters')}</Link>
        </Button>
      </div>
    )
  }

  return <CharacterEditor character={characterQuery.data.character} />
}

const draftStatusMessages: Record<DraftSaveStatus, string> = {
  idle: 'Your progress is saved as a draft as you go.',
  saving: 'Saving draft…',
  saved: 'Draft saved.',
  error: 'Could not save the draft. Keep this page open and try again shortly.',
}

function CharacterEditor({ character }: { character: CharacterResponse['character'] | null }) {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const location = useLocation()
  const isEditing = character !== null && character.status !== 'draft'
  const isDraftFlow = !isEditing
  const [avatarError, setAvatarError] = useState<string | null>(() => {
    const state: unknown = location.state
    return state && typeof state === 'object' && 'avatarError' in state
      ? String(state.avatarError)
      : null
  })
  const [step, setStep] = useState(() =>
    character?.status === 'draft'
      ? Math.min(character.creation_step, stepDefinitions.length - 1)
      : 0,
  )
  const [furthestCompleted, setFurthestCompleted] = useState(() =>
    character ? stepDefinitions.length - 1 : -1,
  )
  const [draftRestoredAt, setDraftRestoredAt] = useState(
    character?.status === 'draft' ? character.updated_at : null,
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<Error | null>(null)
  const finished = useRef(false)
  const draft = useCharacterDraftAutosave({
    initialCharacterId: character?.status === 'draft' ? character.id : null,
    enabled: isDraftFlow,
    onCreated: (createdId) =>
      navigate(`/characters/${createdId}/edit`, { replace: true, state: keepEditorState }),
  })
  const form = useForm<CharacterFormValues>({
    resolver: zodResolver(characterFormSchema),
    defaultValues: character ? characterToFormValues(character) : characterFormDefaults,
    mode: 'onTouched',
  })
  const formValues = useWatch({ control: form.control })
  const validation = characterFormSchema.safeParse(formValues)
  const vigor = useWatch({ control: form.control, name: 'attributes.vigor' })
  const earnedHindrancePoints =
    useWatch({ control: form.control, name: 'hindrance_points_earned' }) ?? 0
  const spentHindrancePoints =
    useWatch({ control: form.control, name: 'hindrance_points_spent' }) ?? 0
  const hindrancePointsBalanced = earnedHindrancePoints === spentHindrancePoints
  const { characterId: draftId, schedule: scheduleDraftSave } = draft
  const skipRestoredSave = useRef(character?.status === 'draft')
  useEffect(() => {
    if (!isDraftFlow || finished.current) return
    if (skipRestoredSave.current) {
      skipRestoredSave.current = false
      return
    }
    const values = form.getValues()
    if (draftId === null && step === 0 && !hasDraftContent(values)) return

    scheduleDraftSave(toCharacterSaveFields(values, step))
  }, [draftId, form, formValues, isDraftFlow, scheduleDraftSave, step])

  const startOver = async () => {
    await draft.discard()
    form.reset(characterFormDefaults)
    setStep(0)
    setFurthestCompleted(-1)
    setDraftRestoredAt(null)
    navigate('/characters/new', { replace: true, state: keepEditorState })
  }

  async function persist(values: CharacterFormValues) {
    const fields = toCharacterSaveFields(values)

    if (isEditing) {
      const response = await api.put<CharacterResponse>(`/api/v1/characters/${character.id}`, {
        character: {
          ...fields,
          hindrance_points_earned: values.hindrance_points_earned,
          hindrance_points_spent: values.hindrance_points_spent,
        },
      })
      return response.character.id
    }

    let id = await draft.flush()
    if (id === null) {
      id = (await api.post<CharacterResponse>('/api/v1/characters', { character: fields }))
        .character.id
    }
    const response = await api.post<CharacterResponse>(`/api/v1/characters/${id}/finalize`, {
      character: fields,
    })
    finished.current = true
    await draft.stop()
    return response.character.id
  }

  async function syncAvatar(characterId: number) {
    const file = form.getValues('avatar_file')
    const removed = !file && !form.getValues('avatar_url') && Boolean(character?.avatar_url)

    setAvatarError(null)
    try {
      if (file) {
        const body = new FormData()
        body.append('file', file)
        const { avatar_url } = await api.post<{ avatar_url: string }>(
          `/api/v1/characters/${characterId}/avatar`,
          body,
        )
        form.setValue('avatar_file', null)
        form.setValue('avatar_url', avatar_url)
      } else if (removed) {
        await api.delete<void>(`/api/v1/characters/${characterId}/avatar`)
      }
      return null
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setAvatarError(message)
      return message
    }
  }

  const steps: MultiStepFlowStep[] = stepDefinitions.map((step, index) => {
    const content =
      step.id === 'concept' ? (
        <ConceptStep />
      ) : step.id === 'origin' ? (
        <OriginStep />
      ) : step.id === 'hindrances' ? (
        <HindrancesStep />
      ) : step.id === 'attributes' ? (
        <AttributesStep />
      ) : step.id === 'skills' ? (
        <SkillsStep />
      ) : step.id === 'edges' ? (
        <EdgesStep />
      ) : step.id === 'gear' ? (
        <GearStep />
      ) : (
        <CharacterSummaryStep />
      )

    return {
      id: step.id,
      title: t(step.title),
      content:
        index >= 1 ? (
          <div className="grid gap-6">
            <DerivedStatistics vigor={vigor} />
            {content}
          </div>
        ) : (
          content
        ),
    }
  })

  const validateStep = async (index: number) => {
    const valid = await form.trigger(characterStepFields[stepDefinitions[index].id])
    if (valid) setFurthestCompleted((furthest) => Math.max(furthest, index))
    return valid
  }

  const handleComplete = () => {
    if (saving || !hindrancePointsBalanced) return

    void form.handleSubmit(async (values) => {
      if (values.hindrance_points_earned !== values.hindrance_points_spent) return

      setSaving(true)
      setSaveError(null)
      try {
        const savedId = await persist(values)
        const avatarFailure = await syncAvatar(savedId)
        void queryClient.invalidateQueries({ queryKey: ['parties'] })
        await queryClient
          .invalidateQueries({ queryKey: ['characters'], refetchType: 'all' })
          .catch(() => undefined)
        if (avatarFailure === null) {
          navigate('/characters')
        } else if (!isEditing) {
          navigate(`/characters/${savedId}/edit`, {
            replace: true,
            state: { avatarError: avatarFailure },
          })
        }
      } catch (error) {
        setSaveError(error instanceof Error ? error : new Error(String(error)))
      } finally {
        setSaving(false)
      }
    })()
  }

  return (
    <section className="mx-auto max-w-7xl">
      <p className="text-muted-foreground text-[0.65rem] font-medium tracking-[0.22em] uppercase">
        {t(isEditing ? 'Character editing' : 'Character creation')}
      </p>
      <h1 className="text-foreground mt-2 text-4xl">
        {t(isEditing ? 'Edit character' : 'Create a character')}
      </h1>

      {isDraftFlow ? (
        <div className="border-border mt-4 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div className="grid gap-1 text-sm" role="status">
            {draftRestoredAt ? (
              <p className="text-foreground">
                {t('Draft restored from')}{' '}
                {new Intl.DateTimeFormat(language === 'pl' ? 'pl-PL' : 'en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(draftRestoredAt))}
                .
              </p>
            ) : null}
            <p className={draft.status === 'error' ? 'text-danger' : 'text-muted-foreground'}>
              {t(draftStatusMessages[draft.status])}
            </p>
          </div>
          {draftId !== null ? (
            <Button type="button" size="sm" variant="outline" onClick={() => void startOver()}>
              {t('Start over')}
            </Button>
          ) : null}
        </div>
      ) : null}

      <Card className="mt-6 overflow-visible">
        <CardContent>
          <FormProvider {...form}>
            <MultiStepFlow
              steps={steps}
              currentStep={step}
              onStepChange={setStep}
              allowStepNavigation
              completedThrough={furthestCompleted}
              footerClassName="sticky bottom-0 z-10 bg-card/95 py-4 backdrop-blur"
              completeLabel={
                saving ? t('Saving…') : isEditing ? t('Save changes') : t('Save character')
              }
              onBack={() => navigate('/characters')}
              onBeforeNext={(_step, index) => validateStep(index)}
              canAdvance={(_step, index) => {
                if (saving) return false
                if (index === stepDefinitions.length - 1) {
                  return hindrancePointsBalanced && validation.success
                }
                if (validation.success) return true

                const fields = characterStepFields[stepDefinitions[index].id]
                return !validation.error.issues.some((issue) =>
                  fields.some((field) => {
                    const path = issue.path.join('.')
                    return path === field || path.startsWith(`${field}.`)
                  }),
                )
              }}
              onComplete={handleComplete}
            />
            {saveError ? (
              <p className="text-danger mt-4 text-sm" role="alert">
                {t('Could not save character:')} {t(saveErrorMessage(saveError) ?? '')}
              </p>
            ) : null}
            {avatarError !== null ? (
              <p className="text-danger mt-4 text-sm" role="alert">
                {t('The character was saved, but the avatar could not be uploaded:')}{' '}
                {t(avatarError)}
              </p>
            ) : null}
          </FormProvider>
        </CardContent>
      </Card>
    </section>
  )
}
