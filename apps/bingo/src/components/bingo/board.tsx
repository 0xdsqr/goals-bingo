import type { Goal } from "@/lib/types"
import { BINGO_LETTERS, checkBingo } from "@/lib/types"
import { GoalCell } from "./goal-cell"

interface BoardProps {
  goals: Goal[]
  size: number
  onUpdateGoal: (goalId: string, text: string) => void
  onUpdateStreak?: (
    goalId: string,
    isStreakGoal: boolean,
    streakTargetDays?: number,
    streakStartDate?: number,
  ) => void
  onUpdateProgress?: (
    goalId: string,
    isProgressGoal: boolean,
    progressTarget?: number,
    progressCurrent?: number,
  ) => void
  onIncrementProgress?: (goalId: string, delta: number) => void
  onToggleGoal: (goalId: string) => void
  onResetStreak?: (goalId: string) => void
  title?: string
  description?: string
  readOnly?: boolean
}

export function Board({
  goals,
  size,
  onUpdateGoal,
  onUpdateStreak,
  onUpdateProgress,
  onIncrementProgress,
  onToggleGoal,
  onResetStreak,
  title,
  description,
  readOnly = false,
}: BoardProps) {
  const sortedGoals = [...goals].sort((a, b) => a.position - b.position)
  const hasBingo = checkBingo(goals, size)
  const nonFreeSpaceCount = goals.filter((g) => !g.isFreeSpace).length
  const nonFreeSpaceCompleted = goals.filter(
    (g) => g.isCompleted && !g.isFreeSpace,
  ).length

  return (
    <div className="w-full max-w-md mx-auto">
      {(title || description) && (
        <div className="text-center mb-6">
          {title && <h2 className="text-2xl font-bold">{title}</h2>}
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-4 mb-3">
        <span className="text-sm text-muted-foreground">
          {nonFreeSpaceCompleted}/{nonFreeSpaceCount} completed
        </span>
        {hasBingo && (
          <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-semibold animate-pulse">
            BINGO!
          </span>
        )}
      </div>

      {/* BINGO Header */}
      <div
        className="grid gap-1 mb-1"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {BINGO_LETTERS.map((letter) => (
          <div
            key={letter}
            className="flex items-center justify-center text-lg sm:text-xl font-bold text-primary"
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Board Grid - use aspect-ratio on each cell */}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {sortedGoals.map((goal) => (
          <div key={goal.id} className="aspect-square">
            <GoalCell
              goal={goal}
              onUpdate={
                readOnly ? () => {} : (text) => onUpdateGoal(goal.id, text)
              }
              onUpdateStreak={
                readOnly || !onUpdateStreak
                  ? undefined
                  : (isStreak, targetDays, startDate) =>
                      onUpdateStreak(goal.id, isStreak, targetDays, startDate)
              }
              onUpdateProgress={
                readOnly || !onUpdateProgress
                  ? undefined
                  : (isProgress, target, current) =>
                      onUpdateProgress(goal.id, isProgress, target, current)
              }
              onIncrementProgress={
                readOnly || !onIncrementProgress
                  ? undefined
                  : (delta) => onIncrementProgress(goal.id, delta)
              }
              onToggle={readOnly ? () => {} : () => onToggleGoal(goal.id)}
              onResetStreak={
                readOnly || !onResetStreak
                  ? undefined
                  : () => onResetStreak(goal.id)
              }
              readOnly={readOnly}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
