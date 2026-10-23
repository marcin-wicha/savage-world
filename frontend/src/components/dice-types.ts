const diceTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'] as const
const skillDieTypes = ['d4', 'd6', 'd8', 'd10', 'd12'] as const

type DiceType = (typeof diceTypes)[number]
type SkillDieType = (typeof skillDieTypes)[number]

export { diceTypes, skillDieTypes, type DiceType, type SkillDieType }
