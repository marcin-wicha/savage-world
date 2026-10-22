import { useNavigate } from 'react-router-dom'

import { MultiStepFlow, type MultiStepFlowStep } from '@/components/multi-step-flow'
import { Card, CardContent } from '@/components/ui/card'

type StepDefinition = {
  id: string
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

function StepContent({ heading, description }: Pick<StepDefinition, 'heading' | 'description'>) {
  return (
    <div className="grid max-w-xl gap-2">
      <h2 className="text-foreground text-xl font-medium">{heading}</h2>
      <p className="text-muted-foreground text-sm leading-6">{description}</p>
    </div>
  )
}

export function NewCharacterRoute() {
  const navigate = useNavigate()

  const steps: MultiStepFlowStep[] = stepDefinitions.map((step) => ({
    id: step.id,
    title: step.title,
    content: <StepContent heading={step.heading} description={step.description} />,
  }))

  return (
    <section className="mx-auto max-w-5xl">
      <p className="text-muted-foreground text-[0.65rem] font-medium tracking-[0.22em] uppercase">
        Character creation
      </p>
      <h1 className="text-foreground mt-2 text-4xl">Create a character</h1>

      <Card className="mt-6">
        <CardContent>
          <MultiStepFlow
            steps={steps}
            completeLabel="Save character"
            onComplete={() => navigate('/characters')}
            onBack={() => navigate('/characters')}
          />
        </CardContent>
      </Card>
    </section>
  )
}
