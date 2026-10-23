const diceTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'] as const

type DiceType = (typeof diceTypes)[number]

export { diceTypes, type DiceType }
