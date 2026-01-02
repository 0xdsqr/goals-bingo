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
  onUpdateProgress?: (
    isProgressGoal: boolean,
    progressTarget?: number,
    progressCurrent?: number,
  ) => void
  onIncrementProgress?: (delta: number) => void
  onToggle: () => void
  onResetStreak?: () => void
  readOnly?: boolean
}

// Format elapsed time as compact string
function formatElapsedTime(ms: number): string {
  if (ms < 0) return "0s"
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    const h = hours % 24
    return `${days}d ${h}h`
  }
  if (hours > 0) {
    const m = minutes % 60
    return `${hours}h ${m}m`
  }
  if (minutes > 0) {
    const s = seconds % 60
    return `${minutes}m ${s}s`
  }
  return `${seconds}s`
}

// Calculate streak progress
function getStreakProgress(goal: Goal): {
  currentDays: number
  targetDays: number
  percent: number
  isComplete: boolean
  elapsedMs: number
} | null {
  if (!goal.isStreakGoal || !goal.streakStartDate || !goal.streakTargetDays) {
    return null
  }
  const now = Date.now()
  const elapsed = Math.max(0, now - goal.streakStartDate)
  const currentDays = Math.floor(elapsed / (1000 * 60 * 60 * 24))
  const targetDays = goal.streakTargetDays
  const targetMs = targetDays * 24 * 60 * 60 * 1000
  const percent = Math.min(
    100,
    Math.max(0, Math.round((elapsed / targetMs) * 100)),
  )
  const isComplete = elapsed >= targetMs
  return { currentDays, targetDays, percent, isComplete, elapsedMs: elapsed }
}

// Calculate progress goal status
function getProgressStatus(goal: Goal): {
  current: number
  target: number
  percent: number
  isComplete: boolean
} | null {
  if (!goal.isProgressGoal || !goal.progressTarget) {
    return null
  }
  const current = goal.progressCurrent ?? 0
  const target = goal.progressTarget
  const percent = Math.min(100, Math.round((current / target) * 100))
  const isComplete = current >= target
  return { current, target, percent, isComplete }
}

export function GoalCell({
  goal,
  onUpdate,
  onUpdateStreak,
  onUpdateProgress,
  onIncrementProgress,
  onToggle,
  onResetStreak,
  readOnly = false,
}: GoalCellProps) {
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [text, setText] = useState(goal.text)
  const [showStreakMenu, setShowStreakMenu] = useState(false)
  const [showProgressMenu, setShowProgressMenu] = useState(false)
  const [isStreakGoal, setIsStreakGoal] = useState(goal.isStreakGoal ?? false)
  const [isProgressGoal, setIsProgressGoal] = useState(
    goal.isProgressGoal ?? false,
  )
  const [streakTargetDays, setStreakTargetDays] = useState(
    goal.streakTargetDays ?? 30,
  )
  const [progressTarget, setProgressTarget] = useState(
    goal.progressTarget ?? 5,
  )
  const [customStartDate, setCustomStartDate] = useState("")
  const [liveTime, setLiveTime] = useState("")
  const streakProgress = getStreakProgress(goal)
  const progressStatus = getProgressStatus(goal)

  // Live timer for streak goals
  useEffect(() => {
    if (!goal.isStreakGoal || !goal.streakStartDate) return

    const updateTime = () => {
      const elapsed = Math.max(0, Date.now() - goal.streakStartDate!)
      setLiveTime(formatElapsedTime(elapsed))
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [goal.isStreakGoal, goal.streakStartDate])

  // Sync state when goal changes externally
  useEffect(() => {
    setText(goal.text)
    setIsStreakGoal(goal.isStreakGoal ?? false)
    setIsProgressGoal(goal.isProgressGoal ?? false)
    setStreakTargetDays(goal.streakTargetDays ?? 30)
    setProgressTarget(goal.progressTarget ?? 5)
  }, [
    goal.text,
    goal.isStreakGoal,
    goal.isProgressGoal,
    goal.streakTargetDays,
    goal.progressTarget,
  ])

  const handleSave = () => {
    if (text !== goal.text) {
      onUpdate(text)
    }
    if (onUpdateStreak && isStreakGoal) {
      const startDate = customStartDate
        ? new Date(customStartDate).getTime()
        : undefined
      onUpdateStreak(true, streakTargetDays, startDate)
    } else if (onUpdateProgress && isProgressGoal) {
      onUpdateProgress(true, progressTarget, 0)
    } else if (onUpdateStreak) {
      // Reset to one-time goal
      onUpdateStreak(false)
    }
    setShowEditDialog(false)
    setCustomStartDate("")
  }

  const handleCancel = () => {
    setText(goal.text)
    setIsStreakGoal(goal.isStreakGoal ?? false)
    setIsProgressGoal(goal.isProgressGoal ?? false)
    setStreakTargetDays(goal.streakTargetDays ?? 30)
    setProgressTarget(goal.progressTarget ?? 5)
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
          <div className="relative w-7 h-7 sm:w-9 sm:h-9 shrink-0">
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
            <span className="absolute inset-0 flex items-center justify-center text-[5px] sm:text-[7px] font-bold font-mono">
              {liveTime}
            </span>
          </div>

          <span className="text-[7px] sm:text-[9px] text-center break-words line-clamp-2 leading-tight flex-1 min-h-0">
            {goal.text}
          </span>

          <span className="text-[6px] sm:text-[7px] text-muted-foreground shrink-0">
            {currentDays}/{targetDays}d
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
          isProgressGoal={isProgressGoal}
          setIsProgressGoal={setIsProgressGoal}
          streakTargetDays={streakTargetDays}
          setStreakTargetDays={setStreakTargetDays}
          progressTarget={progressTarget}
          setProgressTarget={setProgressTarget}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          onSave={handleSave}
          onCancel={handleCancel}
          showGoalTypeOptions={!!onUpdateStreak || !!onUpdateProgress}
        />
      </>
    )
  }

  // Progress goal - special rendering with progress bar and increment buttons
  if (goal.isProgressGoal && progressStatus) {
    const { current, target, percent, isComplete } = progressStatus
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
            !isComplete && "bg-blue-500/10 border-blue-500/50",
          )}
          onClick={() => {
            if (readOnly) return
            setShowProgressMenu(!showProgressMenu)
          }}
          onKeyDown={(e) => {
            if (readOnly) return
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setShowProgressMenu(!showProgressMenu)
            }
          }}
        >
          {/* Progress bar */}
          <div className="w-full px-1 mb-1">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  isComplete ? "bg-green-500" : "bg-blue-500",
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <span className="text-[7px] sm:text-[9px] text-center break-words line-clamp-2 leading-tight flex-1 min-h-0">
            {goal.text}
          </span>

          <span
            className={cn(
              "text-[8px] sm:text-[10px] font-semibold shrink-0",
              isComplete ? "text-green-500" : "text-blue-500",
            )}
          >
            {current}/{target}
          </span>

          {/* Progress menu overlay */}
          {showProgressMenu && !readOnly && (
            <div
              role="dialog"
              aria-label="Progress options"
              className="absolute inset-0 bg-background/95 rounded-lg flex flex-col items-center justify-center gap-1 p-1 z-10"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <span className="text-[9px] font-medium mb-1">
                {isComplete ? "Complete!" : `${current} of ${target}`}
              </span>
              {!isComplete && onIncrementProgress && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (current > 0) onIncrementProgress(-1)
                    }}
                    disabled={current <= 0}
                    className="w-6 h-6 flex items-center justify-center bg-muted rounded hover:bg-muted/80 disabled:opacity-30"
                  >
                    <span className="text-sm font-bold">-</span>
                  </button>
                  <span className="text-sm font-bold min-w-[2rem] text-center">
                    {current}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onIncrementProgress(1)
                    }}
                    className="w-6 h-6 flex items-center justify-center bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    <span className="text-sm font-bold">+</span>
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowProgressMenu(false)
                }}
                className="text-[8px] px-2 py-1 bg-muted rounded hover:bg-muted/80 mt-1"
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
          isProgressGoal={isProgressGoal}
          setIsProgressGoal={setIsProgressGoal}
          streakTargetDays={streakTargetDays}
          setStreakTargetDays={setStreakTargetDays}
          progressTarget={progressTarget}
          setProgressTarget={setProgressTarget}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          onSave={handleSave}
          onCancel={handleCancel}
          showGoalTypeOptions={!!onUpdateStreak || !!onUpdateProgress}
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
        isProgressGoal={isProgressGoal}
        setIsProgressGoal={setIsProgressGoal}
        streakTargetDays={streakTargetDays}
        setStreakTargetDays={setStreakTargetDays}
        progressTarget={progressTarget}
        setProgressTarget={setProgressTarget}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        onSave={handleSave}
        onCancel={handleCancel}
        showGoalTypeOptions={!!onUpdateStreak || !!onUpdateProgress}
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
  isProgressGoal,
  setIsProgressGoal,
  streakTargetDays,
  setStreakTargetDays,
  progressTarget,
  setProgressTarget,
  customStartDate,
  setCustomStartDate,
  onSave,
  onCancel,
  showGoalTypeOptions,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  text: string
  setText: (text: string) => void
  isStreakGoal: boolean
  setIsStreakGoal: (isStreak: boolean) => void
  isProgressGoal: boolean
  setIsProgressGoal: (isProgress: boolean) => void
  streakTargetDays: number
  setStreakTargetDays: (days: number) => void
  progressTarget: number
  setProgressTarget: (target: number) => void
  customStartDate: string
  setCustomStartDate: (date: string) => void
  onSave: () => void
  onCancel: () => void
  showGoalTypeOptions: boolean
}) {
  // Determine which goal type is selected
  const goalType = isStreakGoal ? "streak" : isProgressGoal ? "progress" : "one-time"

  const handleTypeChange = (type: "one-time" | "streak" | "progress") => {
    setIsStreakGoal(type === "streak")
    setIsProgressGoal(type === "progress")
  }

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
          {showGoalTypeOptions && (
            <div className="space-y-3">
              <Label>Goal type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={goalType === "one-time" ? "default" : "outline"}
                  className="flex-1"
                  size="sm"
                  onClick={() => handleTypeChange("one-time")}
                >
                  One-time
                </Button>
                <Button
                  type="button"
                  variant={goalType === "streak" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "flex-1",
                    goalType === "streak" && "bg-orange-500 hover:bg-orange-600",
                  )}
                  onClick={() => handleTypeChange("streak")}
                >
                  Streak
                </Button>
                <Button
                  type="button"
                  variant={goalType === "progress" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "flex-1",
                    goalType === "progress" && "bg-blue-500 hover:bg-blue-600",
                  )}
                  onClick={() => handleTypeChange("progress")}
                >
                  Count
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {goalType === "streak"
                  ? "Track consecutive days (e.g., 30 days sober)"
                  : goalType === "progress"
                    ? "Track progress toward a count (e.g., visit 5 restaurants)"
                    : "Complete once to mark as done"}
              </p>

              {/* Streak options */}
              {goalType === "streak" && (
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

              {/* Progress options */}
              {goalType === "progress" && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="space-y-2">
                    <Label>Target count</Label>
                    <div className="flex gap-2">
                      {[3, 5, 10, 12].map((count) => (
                        <Button
                          key={count}
                          type="button"
                          variant={
                            progressTarget === count ? "default" : "outline"
                          }
                          size="sm"
                          className={cn(
                            progressTarget === count &&
                              "bg-blue-500 hover:bg-blue-600",
                          )}
                          onClick={() => setProgressTarget(count)}
                        >
                          {count}
                        </Button>
                      ))}
                      <Input
                        type="number"
                        value={progressTarget}
                        onChange={(e) =>
                          setProgressTarget(Number(e.target.value) || 5)
                        }
                        className="w-20"
                        min={1}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      How many times to complete this goal
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
