import { useEffect, useState } from "react"
import type { Goal } from "@/lib/types"
import { cn } from "@/lib/utils"

interface GoalCellProps {
  goal: Goal
  onUpdate: (text: string) => void
  onToggle: () => void
  readOnly?: boolean
}

export function GoalCell({
  goal,
  onUpdate,
  onToggle,
  readOnly = false,
}: GoalCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(goal.text)

  // Sync text state when goal.text changes externally
  useEffect(() => {
    setText(goal.text)
  }, [goal.text])

  const handleSave = () => {
    if (text !== goal.text) {
      onUpdate(text)
    }
    setIsEditing(false)
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
            setIsEditing(true)
          }}
          className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] p-0.5 hover:bg-accent rounded"
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
