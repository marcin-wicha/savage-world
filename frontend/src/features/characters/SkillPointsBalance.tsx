const defaultSkillPoints = 12

type SkillPointsBalanceProps = {
  spentPoints: number
}

export function SkillPointsBalance({ spentPoints }: SkillPointsBalanceProps) {
  const defaultPointsSpent = Math.min(spentPoints, defaultSkillPoints)
  const availablePoints = Math.max(defaultSkillPoints - defaultPointsSpent, 0)
  const pointsProgress = (availablePoints / defaultSkillPoints) * 100

  return (
    <div
      data-slot="skill-points-balance"
      role="status"
      aria-live="polite"
      className="border-border bg-muted/20 grid max-w-xl gap-3 rounded-lg border p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-foreground text-sm font-medium">Skill points</p>
          <p className="text-muted-foreground text-xs leading-5">
            Spend these twelve points before using Hindrance points for additional skills.
          </p>
        </div>
        <p data-slot="skill-points" className="text-foreground shrink-0 text-lg font-semibold">
          {availablePoints} / {defaultSkillPoints}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Skill points available"
        aria-valuemin={0}
        aria-valuemax={defaultSkillPoints}
        aria-valuenow={availablePoints}
        aria-valuetext={`${availablePoints} of ${defaultSkillPoints} skill points available`}
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
