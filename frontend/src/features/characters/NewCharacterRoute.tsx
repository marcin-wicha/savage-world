import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { MultiStepFlow, type MultiStepFlowStep } from '@/components/multi-step-flow'
import { Card, CardContent } from '@/components/ui/card'

import { AttributesStep } from './AttributesStep'
import { DerivedStatistics } from './DerivedStatistics'
import { ConceptStep } from './ConceptStep'
import { EdgesStep } from './EdgesStep'
import { HindrancePointsBalance } from './HindrancePointsBalance'
import { HindrancesStep } from './HindrancesStep'
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

function PlaceholderStep({
  heading,
  description,
  showHindrancePoints = false,
}: Pick<StepDefinition, 'heading' | 'description'> & { showHindrancePoints?: boolean }) {
  return (
    <div className="grid gap-6">
      {showHindrancePoints ? <HindrancePointsBalance /> : null}
      <div className="grid max-w-xl gap-2">
        <h2 className="text-foreground text-xl font-medium">{heading}</h2>
        <p className="text-muted-foreground text-sm leading-6">{description}</p>
      </div>
    </div>
  )
}

export function NewCharacterRoute() {
  const navigate = useNavigate()
  const form = useForm<CharacterFormValues>({
    resolver: zodResolver(characterFormSchema),
    defaultValues: characterFormDefaults,
    mode: 'onTouched',
  })
  const vigor = useWatch({ control: form.control, name: 'attributes.vigor' })

  const steps: MultiStepFlowStep[] = stepDefinitions.map((step, index) => {
    const content =
      step.id === 'concept' ? (
        <ConceptStep />
      ) : step.id === 'hindrances' ? (
        <HindrancesStep />
      ) : step.id === 'attributes' ? (
        <AttributesStep />
      ) : step.id === 'skills' ? (
        <SkillsStep />
      ) : step.id === 'edges' ? (
        <EdgesStep />
      ) : (
        <PlaceholderStep
          heading={step.heading}
          description={step.description}
          showHindrancePoints={step.id === 'gear' || step.id === 'summary'}
        />
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

  const handleComplete = form.handleSubmit(() => {
    navigate('/characters')
  })

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
              completeLabel="Save character"
              onBack={() => navigate('/characters')}
              onBeforeNext={(_step, index) => validateStep(index)}
              onComplete={handleComplete}
            />
          </FormProvider>
        </CardContent>
      </Card>
    </section>
  )
}
