import { useEffect, useState } from "react"
import type { Goal } from "@/lib/types"
import { cn } from "@/lib/utils"

interface GoalCellProps {
  goal: Goal
  onUpdate: (text: string) => void
  onUpdateStreak?: (
    isStreakGoal: boolean,
    streakTargetDays?: number,
    streakStartDate?: number,
  ) => void
  onToggle: () => void
  onResetStreak?: () => void
  readOnly?: boolean
}

// Calculate streak progress
function getStreakProgress(goal: Goal): {
  currentDays: number
  targetDays: number
  percent: number
  isComplete: boolean
} | null {
  if (!goal.isStreakGoal || !goal.streakStartDate || !goal.streakTargetDays) {
    return null
  }
  const now = Date.now()
  const elapsed = now - goal.streakStartDate
  const currentDays = Math.floor(elapsed / (1000 * 60 * 60 * 24))
  const targetDays = goal.streakTargetDays
  const percent = Math.min(100, Math.round((currentDays / targetDays) * 100))
  const isComplete = currentDays >= targetDays
  return { currentDays, targetDays, percent, isComplete }
}

export function GoalCell({
  goal,
  onUpdate,
  onUpdateStreak,
  onToggle,
  onResetStreak,
  readOnly = false,
}: GoalCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [text, setText] = useState(goal.text)
  const [showStreakMenu, setShowStreakMenu] = useState(false)
  const [isStreakGoal, setIsStreakGoal] = useState(goal.isStreakGoal ?? false)
  const [streakTargetDays, setStreakTargetDays] = useState(
    goal.streakTargetDays ?? 30,
  )
  const [customStartDate, setCustomStartDate] = useState("")
  const streakProgress = getStreakProgress(goal)

  // Sync state when goal changes externally
  useEffect(() => {
    setText(goal.text)
    setIsStreakGoal(goal.isStreakGoal ?? false)
    setStreakTargetDays(goal.streakTargetDays ?? 30)
  }, [goal.text, goal.isStreakGoal, goal.streakTargetDays])

  const handleSave = () => {
    if (text !== goal.text) {
      onUpdate(text)
    }
    setIsEditing(false)
  }

  const handleSaveWithStreak = () => {
    if (text !== goal.text) {
      onUpdate(text)
    }
    if (onUpdateStreak) {
      const startDate = customStartDate
        ? new Date(customStartDate).getTime()
        : undefined
      onUpdateStreak(isStreakGoal, streakTargetDays, startDate)
    }
    setShowEditDialog(false)
    setCustomStartDate("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      setText(goal.text)
      setIsEditing(false)
    }
  }

  // Free space - special styling, not editable
  if (goal.isFreeSpace) {
    return (
      <div
        className={cn(
          "w-full h-full rounded-lg p-1 flex flex-col items-center justify-center relative overflow-hidden",
          "border-2 border-primary bg-primary/20",
        )}
      >
        <span className="text-xs font-bold text-primary">FREE</span>
      </div>
    )
  }

  // Full edit dialog (for non-empty goals)
  if (showEditDialog) {
    return (
      <div className="w-full h-full bg-card border-2 border-primary rounded-lg p-1.5 flex flex-col overflow-hidden z-20">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          ref={(el) => el?.focus()}
          className="flex-1 bg-transparent text-[10px] resize-none focus:outline-none mb-1"
          placeholder="Goal text..."
        />

        {onUpdateStreak && (
          <div className="space-y-1 border-t border-border pt-1">
            <label className="flex items-center gap-1 text-[8px]">
              <input
                type="checkbox"
                checked={isStreakGoal}
                onChange={(e) => setIsStreakGoal(e.target.checked)}
                className="w-3 h-3"
              />
              Streak goal
            </label>

            {isStreakGoal && (
              <>
                <div className="flex gap-1">
                  {[30, 60, 90].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setStreakTargetDays(days)}
                      className={cn(
                        "text-[7px] px-1 py-0.5 rounded",
                        streakTargetDays === days
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted",
                      )}
                    >
                      {days}d
                    </button>
                  ))}
                  <input
                    type="number"
                    value={streakTargetDays}
                    onChange={(e) =>
                      setStreakTargetDays(Number(e.target.value) || 30)
                    }
                    className="w-8 text-[7px] px-1 bg-muted rounded text-center"
                    min={1}
                  />
                </div>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full text-[7px] px-1 py-0.5 bg-muted rounded"
                  placeholder="Start date (optional)"
                />
              </>
            )}
          </div>
        )}

        <div className="flex gap-1 mt-1">
          <button
            type="button"
            onClick={handleSaveWithStreak}
            className="flex-1 text-[8px] py-0.5 bg-primary text-primary-foreground rounded"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setText(goal.text)
              setIsStreakGoal(goal.isStreakGoal ?? false)
              setStreakTargetDays(goal.streakTargetDays ?? 30)
              setShowEditDialog(false)
            }}
            className="flex-1 text-[8px] py-0.5 bg-muted rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="w-full h-full bg-card border-2 border-primary rounded-lg p-1 flex items-center justify-center overflow-hidden">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          ref={(el) => el?.focus()}
          className="w-full h-full bg-transparent text-center text-xs resize-none focus:outline-none"
          placeholder="Enter goal..."
        />
      </div>
    )
  }

  const isEmpty = !goal.text

  // Streak goal - special rendering
  if (goal.isStreakGoal && streakProgress) {
    const { currentDays, targetDays, percent, isComplete } = streakProgress
    return (
      <div
        role="button"
        tabIndex={readOnly ? -1 : 0}
        className={cn(
          "w-full h-full rounded-lg p-1 flex flex-col items-center justify-center transition-all relative group overflow-hidden",
          "border-2",
          !readOnly && "cursor-pointer hover:border-primary/50",
          isComplete && "bg-green-500/20 border-green-500",
          !isComplete && "bg-orange-500/10 border-orange-500/50",
        )}
        onClick={() => {
          if (readOnly) return
          setShowStreakMenu(!showStreakMenu)
        }}
        onKeyDown={(e) => {
          if (readOnly) return
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setShowStreakMenu(!showStreakMenu)
          }
        }}
      >
        {/* Circular progress indicator */}
        <div className="relative w-8 h-8 sm:w-10 sm:h-10 mb-0.5">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-muted stroke-current"
              strokeWidth="3"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={cn(
                "stroke-current transition-all duration-500",
                isComplete ? "text-green-500" : "text-orange-500",
              )}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${percent}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[8px] sm:text-[10px] font-bold">
            {currentDays}
          </span>
        </div>

        <span className="text-[8px] sm:text-[10px] text-center break-words line-clamp-2 leading-tight">
          {goal.text}
        </span>

        <span className="text-[7px] sm:text-[8px] text-muted-foreground">
          {currentDays}/{targetDays} days
        </span>

        {/* Streak menu overlay */}
        {showStreakMenu && !readOnly && (
          <div
            className="absolute inset-0 bg-background/95 rounded-lg flex flex-col items-center justify-center gap-1 p-1 z-10"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <span className="text-[9px] font-medium mb-1">
              {isComplete
                ? "Streak Complete!"
                : `Day ${currentDays} of ${targetDays}`}
            </span>
            {!isComplete && onResetStreak && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm("Reset streak to day 0?")) {
                    onResetStreak()
                  }
                  setShowStreakMenu(false)
                }}
                className="text-[8px] px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
              >
                Reset Streak
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowStreakMenu(false)
              }}
              className="text-[8px] px-2 py-1 bg-muted rounded hover:bg-muted/80"
            >
              Close
            </button>
          </div>
        )}

        {isComplete && (
          <span className="absolute bottom-0.5 right-0.5 text-green-500 font-bold text-[8px]">
            done
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={readOnly ? -1 : 0}
      className={cn(
        "w-full h-full rounded-lg p-1 flex flex-col items-center justify-center transition-all relative group overflow-hidden",
        "border-2",
        !readOnly && "cursor-pointer hover:border-primary/50",
        goal.isCompleted && "bg-green-500/20 border-green-500",
        !goal.isCompleted && !isEmpty && "bg-card border-border",
        isEmpty && "bg-muted/50 border-dashed border-muted-foreground/30",
      )}
      onClick={() => {
        if (readOnly) return
        if (isEmpty) {
          setIsEditing(true)
        } else {
          onToggle()
        }
      }}
      onKeyDown={(e) => {
        if (readOnly) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          if (isEmpty) {
            setIsEditing(true)
          } else {
            onToggle()
          }
        }
      }}
    >
      <span
        className={cn(
          "text-[10px] sm:text-xs text-center break-words line-clamp-3 leading-tight",
          isEmpty && "text-muted-foreground italic",
        )}
      >
        {readOnly && isEmpty ? "" : goal.text || "+"}
      </span>

      {!isEmpty && !readOnly && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setShowEditDialog(true)
          }}
          className="absolute top-0.5 right-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-[8px] p-0.5 hover:bg-accent rounded"
        >
          edit
        </button>
      )}

      {goal.isCompleted && (
        <span className="absolute bottom-0.5 right-0.5 text-green-500 font-bold text-[8px]">
          done
        </span>
      )}
    </div>
  )
}
