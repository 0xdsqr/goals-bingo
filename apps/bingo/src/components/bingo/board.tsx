import type { Goal } from "@/lib/types";
import { BINGO_LETTERS, checkBingo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GoalCell } from "./goal-cell";

interface BoardProps {
  goals: Goal[];
  size: number;
  onUpdateGoal: (goalId: string, text: string) => void;
  onUpdateStreak?: (
    goalId: string,
    isStreakGoal: boolean,
    streakTargetDays?: number,
    streakStartDate?: number,
  ) => void;
  onToggleGoal: (goalId: string) => void;
  onResetStreak?: (goalId: string) => void;
  title?: string;
  description?: string;
  readOnly?: boolean;
}

export function Board({
  goals,
  size,
  onUpdateGoal,
  onUpdateStreak,
  onToggleGoal,
  onResetStreak,
  title,
  description,
  readOnly = false,
}: BoardProps) {
  const sortedGoals = [...goals].sort((a, b) => a.position - b.position);
  const hasBingo = checkBingo(goals, size);
  const nonFreeSpaceCount = goals.filter((g) => !g.isFreeSpace).length;
  const nonFreeSpaceCompleted = goals.filter(
    (g) => g.isCompleted && !g.isFreeSpace,
  ).length;

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

      {/* Board Container - fixed aspect ratio */}
      <div className="w-full aspect-square">
        <div className="grid grid-rows-[auto_1fr] h-full gap-1">
          {/* BINGO Header */}
          <div
            className="grid gap-1"
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

          {/* Board Grid */}
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${size}, 1fr)`,
              gridTemplateRows: `repeat(${size}, 1fr)`,
            }}
          >
            {sortedGoals.map((goal) => (
              <GoalCell
                key={goal.id}
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
                onToggle={readOnly ? () => {} : () => onToggleGoal(goal.id)}
                onResetStreak={
                  readOnly || !onResetStreak
                    ? undefined
                    : () => onResetStreak(goal.id)
                }
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
