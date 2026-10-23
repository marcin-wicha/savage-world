const traitCardSizes = {
  sm: { width: 160, height: 224 },
  md: { width: 224, height: 314 },
  lg: { width: 288, height: 403 },
} as const

type TraitCardSize = keyof typeof traitCardSizes

export { traitCardSizes, type TraitCardSize }
