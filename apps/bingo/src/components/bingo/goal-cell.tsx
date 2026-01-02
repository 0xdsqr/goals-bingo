import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  const currentDays = Math.max(0, Math.floor(elapsed / (1000 * 60 * 60 * 24)))
  const targetDays = goal.streakTargetDays
  const percent = Math.min(
    100,
    Math.max(0, Math.round((currentDays / targetDays) * 100)),
  )
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
    if (onUpdateStreak) {
      const startDate = customStartDate
        ? new Date(customStartDate).getTime()
        : undefined
      onUpdateStreak(isStreakGoal, streakTargetDays, startDate)
    }
    setShowEditDialog(false)
    setCustomStartDate("")
  }

  const handleCancel = () => {
    setText(goal.text)
    setIsStreakGoal(goal.isStreakGoal ?? false)
    setStreakTargetDays(goal.streakTargetDays ?? 30)
    setCustomStartDate("")
    setShowEditDialog(false)
  }

  const isEmpty = !goal.text

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

  // Streak goal - special rendering with progress ring
  if (goal.isStreakGoal && streakProgress) {
    const { currentDays, targetDays, percent, isComplete } = streakProgress
    return (
      <>
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
            <svg
              className="w-full h-full -rotate-90"
              viewBox="0 0 36 36"
              role="img"
              aria-labelledby={`streak-progress-${goal.id}`}
            >
              <title id={`streak-progress-${goal.id}`}>
                Streak progress: {currentDays} of {targetDays} days
              </title>
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
              role="dialog"
              aria-label="Streak options"
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

          {/* Edit button */}
          {!readOnly && (
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

          {isComplete && (
            <span className="absolute bottom-0.5 right-0.5 text-green-500 font-bold text-[8px]">
              done
            </span>
          )}
        </div>

        {/* Edit Dialog */}
        <GoalEditDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          text={text}
          setText={setText}
          isStreakGoal={isStreakGoal}
          setIsStreakGoal={setIsStreakGoal}
          streakTargetDays={streakTargetDays}
          setStreakTargetDays={setStreakTargetDays}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          onSave={handleSave}
          onCancel={handleCancel}
          showStreakOptions={!!onUpdateStreak}
        />
      </>
    )
  }

  // Regular goal cell
  return (
    <>
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
            setShowEditDialog(true)
          } else {
            onToggle()
          }
        }}
        onKeyDown={(e) => {
          if (readOnly) return
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            if (isEmpty) {
              setShowEditDialog(true)
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

      {/* Edit Dialog */}
      <GoalEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        text={text}
        setText={setText}
        isStreakGoal={isStreakGoal}
        setIsStreakGoal={setIsStreakGoal}
        streakTargetDays={streakTargetDays}
        setStreakTargetDays={setStreakTargetDays}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        onSave={handleSave}
        onCancel={handleCancel}
        showStreakOptions={!!onUpdateStreak}
      />
    </>
  )
}

// Separate component for the edit dialog
function GoalEditDialog({
  open,
  onOpenChange,
  text,
  setText,
  isStreakGoal,
  setIsStreakGoal,
  streakTargetDays,
  setStreakTargetDays,
  customStartDate,
  setCustomStartDate,
  onSave,
  onCancel,
  showStreakOptions,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  text: string
  setText: (text: string) => void
  isStreakGoal: boolean
  setIsStreakGoal: (isStreak: boolean) => void
  streakTargetDays: number
  setStreakTargetDays: (days: number) => void
  customStartDate: string
  setCustomStartDate: (date: string) => void
  onSave: () => void
  onCancel: () => void
  showStreakOptions: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{text ? "Edit Goal" : "New Goal"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Goal text */}
          <div className="space-y-2">
            <Label htmlFor="goal-text">What's your goal?</Label>
            <Input
              id="goal-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g., Read 12 books, Run a marathon..."
              autoFocus
            />
          </div>

          {/* Goal type selection */}
          {showStreakOptions && (
            <div className="space-y-3">
              <Label>Goal type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={!isStreakGoal ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setIsStreakGoal(false)}
                >
                  One-time
                </Button>
                <Button
                  type="button"
                  variant={isStreakGoal ? "default" : "outline"}
                  className={cn(
                    "flex-1",
                    isStreakGoal && "bg-orange-500 hover:bg-orange-600",
                  )}
                  onClick={() => setIsStreakGoal(true)}
                >
                  Streak
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isStreakGoal
                  ? "Track consecutive days (e.g., 30 days sober)"
                  : "Complete once to mark as done"}
              </p>

              {/* Streak options */}
              {isStreakGoal && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="space-y-2">
                    <Label>Target days</Label>
                    <div className="flex gap-2">
                      {[30, 60, 90].map((days) => (
                        <Button
                          key={days}
                          type="button"
                          variant={
                            streakTargetDays === days ? "default" : "outline"
                          }
                          size="sm"
                          className={cn(
                            streakTargetDays === days &&
                              "bg-orange-500 hover:bg-orange-600",
                          )}
                          onClick={() => setStreakTargetDays(days)}
                        >
                          {days}
                        </Button>
                      ))}
                      <Input
                        type="number"
                        value={streakTargetDays}
                        onChange={(e) =>
                          setStreakTargetDays(Number(e.target.value) || 30)
                        }
                        className="w-20"
                        min={1}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start-date">
                      Start date{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to start today. Set a past date if your streak
                      already started.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
