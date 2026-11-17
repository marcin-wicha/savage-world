import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { MultiStepFlow, type MultiStepFlowStep } from '@/components/multi-step-flow'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSession } from '@/features/auth/use-session'
import { ApiError, api } from '@/lib/api-client'
import { useRestMutation, useRestQuery } from '@/lib/queries'
import { useLanguage } from '@/lib/i18n-context'

import { AttributesStep } from './AttributesStep'
import { DerivedStatistics } from './DerivedStatistics'
import { ConceptStep } from './ConceptStep'
import { CharacterSummaryStep } from './CharacterSummaryStep'
import { EdgesStep } from './EdgesStep'
import { OriginStep } from './OriginStep'

import { HindrancesStep } from './HindrancesStep'
import {
  clearCharacterDraft,
  hasDraftContent,
  loadCharacterDraft,
  saveCharacterDraft,
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

type CharacterSaveRequest = {
  character: {
    name: string
    rank: CharacterFormValues['rank']
    origin_id: number | null
    edge_ids: number[]
    hindrance_ids: number[]
    skill_ids: number[]
    attributes: CharacterFormValues['attributes']
    skill_dice: Record<string, CharacterFormValues['skill_dice'][string]>
    hindrance_severities: Record<string, 'minor' | 'major'>
    hindrance_points_earned: number
    hindrance_points_spent: number
    gear: Record<string, number>
    equipped_gear_ids: number[]
  }
}

type CharacterSaveResponse = {
  character: {
    id: number
  }
}

type CharacterResponse = {
  character: {
    id: number
    name: string
    avatar_url?: string | null
    rank: CharacterFormValues['rank']
    origin_id: number | null
    origin_name: string | null
    edge_ids: number[]
    hindrance_ids: number[]
    skill_ids: number[]
    attributes: CharacterFormValues['attributes']
    skill_dice: Record<string, CharacterFormValues['skill_dice'][string]>
    gear?: { gear_id: number; name: string; quantity: number; equipped: boolean }[]
    effective_traits: {
      attributes: Record<string, { base_die: string; die: string; modifier: number }>
      skills: Record<string, { base_die: string; die: string; modifier: number }>
    }
  }
}

const ids = (values: string[]) => values.map(Number)

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

export function NewCharacterRoute() {
  const { id } = useParams<{ id: string }>()
  const userId = useSession().data?.user?.id
  const draftUserId = id ? undefined : userId

  return <CharacterEditor key={draftUserId ?? 'none'} draftUserId={draftUserId} />
}

function CharacterEditor({ draftUserId }: { draftUserId: number | undefined }) {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const isEditing = Boolean(id)
  const location = useLocation()
  const [avatarError, setAvatarError] = useState<string | null>(() => {
    const state: unknown = location.state
    return state && typeof state === 'object' && 'avatarError' in state
      ? String(state.avatarError)
      : null
  })
  const characterQuery = useRestQuery<CharacterResponse>(
    ['character', id],
    `/api/v1/characters/${id ?? ''}`,
    { enabled: isEditing },
  )
  const [initialDraft] = useState(() =>
    draftUserId === undefined ? null : loadCharacterDraft(draftUserId),
  )
  const [step, setStep] = useState(() =>
    Math.min(initialDraft?.step ?? 0, stepDefinitions.length - 1),
  )
  const [draftRestoredAt, setDraftRestoredAt] = useState(initialDraft?.saved_at ?? null)
  const characterSaved = useRef(false)
  const form = useForm<CharacterFormValues>({
    resolver: zodResolver(characterFormSchema),
    defaultValues: initialDraft?.values ?? characterFormDefaults,
    mode: 'onTouched',
  })
  useEffect(() => {
    const character = characterQuery.data?.character
    if (!character) return

    form.reset({
      ...characterFormDefaults,
      concept: { name: character.name, description: '' },
      avatar_url: character.avatar_url ?? '',
      rank: character.rank,
      origin: character.origin_id === null ? '' : String(character.origin_id),
      origin_name: character.origin_name ?? '',
      edges: character.edge_ids.map(String),
      hindrances: character.hindrance_ids.map(String),
      skills: character.skill_ids.map(String),
      attributes: character.attributes,
      skill_dice: Object.fromEntries(
        Object.entries(character.skill_dice).map(([skillId, die]) => [String(skillId), die]),
      ),
      hindrance_severities: Object.fromEntries(
        character.hindrance_ids.map((hindranceId) => [String(hindranceId), 'minor']),
      ),
      gear: Object.fromEntries(
        (character.gear ?? []).map((item) => [String(item.gear_id), item.quantity]),
      ),
      gear_names: Object.fromEntries(
        (character.gear ?? []).map((item) => [String(item.gear_id), item.name]),
      ),
      equipped_gear: (character.gear ?? [])
        .filter((item) => item.equipped)
        .map((item) => String(item.gear_id)),
    })
  }, [characterQuery.data, form])
  const formValues = useWatch({ control: form.control })
  const validation = characterFormSchema.safeParse(formValues)
  const vigor = useWatch({ control: form.control, name: 'attributes.vigor' })
  const earnedHindrancePoints =
    useWatch({ control: form.control, name: 'hindrance_points_earned' }) ?? 0
  const spentHindrancePoints =
    useWatch({ control: form.control, name: 'hindrance_points_spent' }) ?? 0
  const hindrancePointsBalanced = earnedHindrancePoints === spentHindrancePoints
  const draftActive = draftUserId !== undefined
  useEffect(() => {
    if (draftUserId === undefined || characterSaved.current) return
    const values = form.getValues()
    if (step === 0 && draftRestoredAt === null && !hasDraftContent(values)) return

    saveCharacterDraft(draftUserId, values, step)
  }, [draftRestoredAt, draftUserId, form, formValues, step])

  const startOver = () => {
    if (draftUserId !== undefined) clearCharacterDraft(draftUserId)
    form.reset(characterFormDefaults)
    setStep(0)
    setDraftRestoredAt(null)
  }
  const saveMutation = useRestMutation<CharacterSaveResponse, CharacterSaveRequest>(
    {
      path: isEditing ? `/api/v1/characters/${id}` : '/api/v1/characters',
      method: isEditing ? 'PUT' : 'POST',
    },
    {
      onSuccess: async (response) => {
        const characterId = response.character.id
        if (draftUserId !== undefined) {
          characterSaved.current = true
          clearCharacterDraft(draftUserId)
        }
        const avatarFailure = await syncAvatar(characterId)
        void queryClient.invalidateQueries({ queryKey: ['characters'] })
        void queryClient.invalidateQueries({ queryKey: ['parties'] })
        if (avatarFailure === null) {
          navigate('/characters')
        } else if (!isEditing) {
          navigate(`/characters/${characterId}/edit`, {
            replace: true,
            state: { avatarError: avatarFailure },
          })
        }
      },
    },
  )

  async function syncAvatar(characterId: number) {
    const file = form.getValues('avatar_file')
    const removed =
      !file && !form.getValues('avatar_url') && Boolean(characterQuery.data?.character.avatar_url)

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

  if (isEditing && characterQuery.isPending) {
    return <p className="text-muted-foreground text-sm">{t('Loading character…')}</p>
  }

  if (isEditing && characterQuery.isError) {
    return (
      <p className="text-danger text-sm" role="alert">
        {t('Could not load character. Try again.')}
      </p>
    )
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

  const validateStep = (index: number) =>
    form.trigger(characterStepFields[stepDefinitions[index].id])

  const handleComplete = () => {
    if (saveMutation.isPending || !hindrancePointsBalanced) return

    void form.handleSubmit((values) => {
      if (values.hindrance_points_earned !== values.hindrance_points_spent) return

      saveMutation.mutate({
        character: {
          name: values.concept.name,
          rank: values.rank,
          origin_id: Number(values.origin),
          edge_ids: ids(values.edges),
          hindrance_ids: ids(values.hindrances),
          skill_ids: ids(values.skills),
          attributes: values.attributes,
          skill_dice: values.skill_dice,
          hindrance_severities: values.hindrance_severities,
          hindrance_points_earned: values.hindrance_points_earned,
          hindrance_points_spent: values.hindrance_points_spent,
          gear: values.gear,
          equipped_gear_ids: ids(values.equipped_gear.filter((gearId) => gearId in values.gear)),
        },
      })
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

      {draftActive ? (
        <div className="border-border mt-4 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <p className="text-muted-foreground text-sm" role="status">
            {draftRestoredAt
              ? `${t('Draft restored from')} ${new Intl.DateTimeFormat(
                  language === 'pl' ? 'pl-PL' : 'en-US',
                  { dateStyle: 'medium', timeStyle: 'short' },
                ).format(new Date(draftRestoredAt))}.`
              : t('Your progress is saved as a draft on this device.')}
          </p>
          {draftRestoredAt ? (
            <Button type="button" size="sm" variant="outline" onClick={startOver}>
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
              footerClassName="sticky bottom-0 z-10 bg-card/95 py-4 backdrop-blur"
              completeLabel={
                saveMutation.isPending
                  ? t('Saving…')
                  : isEditing
                    ? t('Save changes')
                    : t('Save character')
              }
              onBack={() => navigate('/characters')}
              onBeforeNext={(_step, index) => validateStep(index)}
              canAdvance={(_step, index) => {
                if (saveMutation.isPending) return false
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
            {saveMutation.error ? (
              <p className="text-danger mt-4 text-sm" role="alert">
                {t('Could not save character:')} {t(saveErrorMessage(saveMutation.error) ?? '')}
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
