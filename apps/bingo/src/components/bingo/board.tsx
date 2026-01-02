import { GoalCell } from "./goal-cell";
import { checkBingo, BINGO_LETTERS } from "@/lib/types";
import type { Goal } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BoardProps {
  goals: Goal[];
  size: number;
  onUpdateGoal: (goalId: string, text: string) => void;
  onToggleGoal: (goalId: string) => void;
  title?: string;
  description?: string;
  readOnly?: boolean;
}

export function Board({
  goals,
  size,
  onUpdateGoal,
  onToggleGoal,
  title,
  description,
  readOnly = false,
}: BoardProps) {
  const sortedGoals = [...goals].sort((a, b) => a.position - b.position);
  const hasBingo = checkBingo(goals, size);
  const completedCount = goals.filter((g) => g.isCompleted).length;
  const nonFreeSpaceCount = goals.filter((g) => !g.isFreeSpace).length;
  const nonFreeSpaceCompleted = goals.filter((g) => g.isCompleted && !g.isFreeSpace).length;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {(title || description) && (
        <div className="text-center mb-6">
          {title && <h2 className="text-2xl font-bold">{title}</h2>}
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-4 mb-4">
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
        className={cn("grid gap-1")}
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {BINGO_LETTERS.map((letter) => (
          <div
            key={letter}
            className="flex items-center justify-center text-xl sm:text-2xl font-bold text-primary py-1"
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Board Grid */}
      <div
        className={cn("grid gap-1")}
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {sortedGoals.map((goal) => (
          <GoalCell
            key={goal.id}
            goal={goal}
            onUpdate={readOnly ? () => {} : (text) => onUpdateGoal(goal.id, text)}
            onToggle={readOnly ? () => {} : () => onToggleGoal(goal.id)}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}
