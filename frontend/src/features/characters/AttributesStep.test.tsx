import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form'

import { AttributesStep } from './AttributesStep'
import { characterFormDefaults, type CharacterFormValues } from './character-form'

type FormRef = { current: UseFormReturn<CharacterFormValues> | null }

function renderStep(formRef?: FormRef, overrides: Partial<CharacterFormValues> = {}) {
  function Harness() {
    const form = useForm<CharacterFormValues>({
      defaultValues: { ...characterFormDefaults, ...overrides },
    })

    if (formRef) formRef.current = form

    return (
      <FormProvider {...form}>
        <AttributesStep />
      </FormProvider>
    )
  }

  return render(<Harness />)
}

function dieButton(attribute: string, die: string) {
  return within(screen.getByRole('group', { name: `${attribute} die` })).getByRole('button', {
    name: `Toggle ${die}`,
  })
}

describe('AttributesStep', () => {
  it('renders a die selector for every attribute', () => {
    renderStep()

    for (const attribute of ['Agility', 'Smarts', 'Spirit', 'Strength', 'Vigor']) {
      expect(screen.getByRole('group', { name: `${attribute} die` })).toBeInTheDocument()
      expect(dieButton(attribute, 'd4')).toHaveAttribute('aria-pressed', 'true')
    }

    expect(screen.getByText('Nimbleness, dexterity, and coordination.')).toBeInTheDocument()
    expect(screen.getByText('Intelligence, reasoning, and general knowledge.')).toBeInTheDocument()
    expect(screen.getByText('Inner strength, willpower, and mental fortitude.')).toBeInTheDocument()
    expect(screen.getByText('Physical power and fitness.')).toBeInTheDocument()
    expect(screen.getByText('Endurance, toughness, and resistance to harm.')).toBeInTheDocument()
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
    expect(screen.getByText('0 / 4')).toBeInTheDocument()
  })

  it('uses Hindrance points after the default attribute points are spent', async () => {
    const user = userEvent.setup()
    const formRef: FormRef = { current: null }

    renderStep(formRef, { hindrance_points_earned: 2 })

    await user.click(dieButton('Agility', 'd6'))
    await user.click(dieButton('Agility', 'd8'))
    await user.click(dieButton('Agility', 'd10'))
    await user.click(dieButton('Agility', 'd12'))
    await user.click(dieButton('Smarts', 'd6'))

    expect(screen.getByText('0 / 5')).toBeInTheDocument()

    await user.click(dieButton('Spirit', 'd6'))

    expect(screen.getByText('1 / 4')).toBeInTheDocument()
    expect(formRef.current?.getValues('attribute_hindrance_points_spent')).toBe(1)
    expect(formRef.current?.getValues('hindrance_points_spent')).toBe(1)
    expect(dieButton('Vigor', 'd8')).toBeDisabled()

    await user.click(dieButton('Vigor', 'd6'))

    expect(dieButton('Vigor', 'd6')).toHaveAttribute('aria-pressed', 'true')
    expect(dieButton('Vigor', 'd6')).not.toBeDisabled()
    expect(dieButton('Vigor', 'd8')).toBeDisabled()
    expect(dieButton('Vigor', 'd4')).not.toBeDisabled()
    expect(formRef.current?.getValues('attribute_hindrance_points_spent')).toBe(2)
    expect(screen.getByText('0 / 5')).toBeInTheDocument()
    expect(screen.getByText('0 / 4')).toBeInTheDocument()

    await user.click(dieButton('Vigor', 'd4'))
    expect(dieButton('Vigor', 'd4')).toHaveAttribute('aria-pressed', 'true')

    await user.click(dieButton('Vigor', 'd6'))
    expect(dieButton('Vigor', 'd6')).toHaveAttribute('aria-pressed', 'true')
  })
})
