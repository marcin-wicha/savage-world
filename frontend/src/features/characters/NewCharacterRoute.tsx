import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { MultiStepFlow, type MultiStepFlowStep } from '@/components/multi-step-flow'
import { Card, CardContent } from '@/components/ui/card'
import { ApiError } from '@/lib/api-client'
import { useRestMutation } from '@/lib/queries'

import { AttributesStep } from './AttributesStep'
import { DerivedStatistics } from './DerivedStatistics'
import { ConceptStep } from './ConceptStep'
import { CharacterSummaryStep } from './CharacterSummaryStep'
import { EdgesStep } from './EdgesStep'
import { OriginStep } from './OriginStep'

import { HindrancesStep } from './HindrancesStep'
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
    hindrance_severities: Record<string, 'minor' | 'major'>
    hindrance_points_earned: number
    hindrance_points_spent: number
  }
}

type CharacterSaveResponse = {
  character: {
    id: number
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
    description: 'Name your character and capture the idea that will guide the rest of creation.',
  },
  {
    id: 'origin',
    title: 'Origin',
    heading: 'Choose an origin',
    description: 'Select an ancestry and background package, or build a custom origin.',
  },
  {
    id: 'hindrances',
    title: 'Hindrances',
    heading: 'Take hindrances',
    description: 'Choose hindrances to earn points for edges, attributes, and skills.',
  },
  {
    id: 'attributes',
    title: 'Attributes',
    heading: 'Assign attributes',
    description: 'Spend points across Agility, Smarts, Spirit, Strength, and Vigor.',
  },
  {
    id: 'skills',
    title: 'Skills',
    heading: 'Choose skills',
    description: 'Spend skill points and pick the skills your character has trained.',
  },
  {
    id: 'edges',
    title: 'Edges',
    heading: 'Choose edges',
    description: 'Spend hindrance points to buy edges the current requirements allow.',
  },
  {
    id: 'gear',
    title: 'Gear',
    heading: 'Purchase gear',
    description: 'Spend starting funds on weapons, armor, and equipment.',
  },
  {
    id: 'summary',
    title: 'Summary',
    heading: 'Review your character',
    description: 'Check the finished character before saving it to your roster.',
  },
]

export function NewCharacterRoute() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm<CharacterFormValues>({
    resolver: zodResolver(characterFormSchema),
    defaultValues: characterFormDefaults,
    mode: 'onTouched',
  })
  const vigor = useWatch({ control: form.control, name: 'attributes.vigor' })
  const earnedHindrancePoints =
    useWatch({ control: form.control, name: 'hindrance_points_earned' }) ?? 0
  const spentHindrancePoints =
    useWatch({ control: form.control, name: 'hindrance_points_spent' }) ?? 0
  const hindrancePointsBalanced = earnedHindrancePoints === spentHindrancePoints
  const saveMutation = useRestMutation<CharacterSaveResponse, CharacterSaveRequest>(
    {
      path: '/api/v1/characters',
      method: 'POST',
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['characters'] })
        navigate('/characters')
      },
    },
  )

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
      title: step.title,
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
          hindrance_severities: values.hindrance_severities,
          hindrance_points_earned: values.hindrance_points_earned,
          hindrance_points_spent: values.hindrance_points_spent,
        },
      })
    })()
  }

  return (
    <section className="mx-auto max-w-7xl">
      <p className="text-muted-foreground text-[0.65rem] font-medium tracking-[0.22em] uppercase">
        Character creation
      </p>
      <h1 className="text-foreground mt-2 text-4xl">Create a character</h1>

      <Card className="mt-6">
        <CardContent>
          <FormProvider {...form}>
            <MultiStepFlow
              steps={steps}
              completeLabel={saveMutation.isPending ? 'Saving…' : 'Save character'}
              onBack={() => navigate('/characters')}
              onBeforeNext={(_step, index) => validateStep(index)}
              canAdvance={(_step, index) =>
                index === stepDefinitions.length - 1
                  ? hindrancePointsBalanced && !saveMutation.isPending
                  : !saveMutation.isPending
              }
              onComplete={handleComplete}
            />
            {saveMutation.error ? (
              <p className="text-danger mt-4 text-sm" role="alert">
                Could not save character: {saveErrorMessage(saveMutation.error)}
              </p>
            ) : null}
          </FormProvider>
        </CardContent>
      </Card>
    </section>
  )
}
