const defaultAttributePoints = 5

type AttributePointsBalanceProps = {
  spentPoints: number
}

export function AttributePointsBalance({ spentPoints }: AttributePointsBalanceProps) {
  const defaultPointsSpent = Math.min(spentPoints, defaultAttributePoints)
  const availablePoints = Math.max(defaultAttributePoints - defaultPointsSpent, 0)
  const pointsProgress = (availablePoints / defaultAttributePoints) * 100

  return (
    <div
      data-slot="attribute-points-balance"
      role="status"
      aria-live="polite"
      className="border-border bg-muted/20 grid max-w-xl gap-3 rounded-lg border p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-foreground text-sm font-medium">Attribute points</p>
          <p className="text-muted-foreground text-xs leading-5">
            Spend these five points before using Hindrance points for increases.
          </p>
        </div>
        <p data-slot="attribute-points" className="text-foreground shrink-0 text-lg font-semibold">
          {availablePoints} / {defaultAttributePoints}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Attribute points available"
        aria-valuemin={0}
        aria-valuemax={defaultAttributePoints}
        aria-valuenow={availablePoints}
        aria-valuetext={`${availablePoints} of ${defaultAttributePoints} attribute points available`}
        className="bg-muted h-2 overflow-hidden rounded-full"
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pointsProgress}%` }}
        />
      </div>
    </div>
  )
}
