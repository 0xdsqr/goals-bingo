import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { useCallback, useState } from "react"
import { SignInDialog } from "@/components/auth/sign-in-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { checkBingo } from "@/lib/types"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"

export const Route = createFileRoute("/board/$boardId")({
  component: BoardDetailPage,
})

function BoardDetailPage() {
  const { boardId } = Route.useParams()
  const navigate = useNavigate()
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth()

  const board = useQuery(api.boards.getWithGoals, {
    id: boardId as Id<"boards">,
  })
  const updateGoal = useMutation(api.goals.update)
  const toggleGoal = useMutation(api.goals.toggleComplete)
  const removeBoard = useMutation(api.boards.remove)
  const generateShareLink = useMutation(api.boards.generateShareLink)
  const removeShareLink = useMutation(api.boards.removeShareLink)

  const [showSignIn, setShowSignIn] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [isSharing, setIsSharing] = useState(false)
  const [showCopied, setShowCopied] = useState(false)

  const handleShare = useCallback(async () => {
    if (!board) return
    setIsSharing(true)
    try {
      const { shareId } = await generateShareLink({ id: board._id })
      const shareUrl = `${window.location.origin}/share/${shareId}`
      await navigator.clipboard.writeText(shareUrl)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } finally {
      setIsSharing(false)
    }
  }, [board, generateShareLink])

  const handleRemoveShare = useCallback(async () => {
    if (!board) return
    await removeShareLink({ id: board._id })
  }, [board, removeShareLink])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">
              Sign in to view this board
            </p>
            <Button onClick={() => setShowSignIn(true)}>Sign In</Button>
          </CardContent>
        </Card>
        <SignInDialog open={showSignIn} onOpenChange={setShowSignIn} />
      </div>
    )
  }

  if (board === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading board...</p>
      </div>
    )
  }

  if (board === null) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Board not found</p>
            <Link to="/boards">
              <Button>Back to Boards</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const sortedGoals = [...board.goals].sort((a, b) => a.position - b.position)
  const hasBingo = checkBingo(
    sortedGoals.map((g) => ({
      id: g._id,
      text: g.text,
      position: g.position,
      isCompleted: g.isCompleted,
    })),
    board.size,
  )
  const completedCount = sortedGoals.filter((g) => g.isCompleted).length

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this board?")) {
      await removeBoard({ id: board._id })
      navigate({ to: "/boards" })
    }
  }

  const handleStartEdit = (goalId: string, currentText: string) => {
    setEditingGoalId(goalId)
    setEditText(currentText)
  }

  const handleSaveEdit = async (goalId: Id<"goals">) => {
    await updateGoal({ id: goalId, text: editText })
    setEditingGoalId(null)
    setEditText("")
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="flex items-center justify-between mb-8">
        <Link to="/boards">
          <Button variant="ghost">&larr; Back</Button>
        </Link>
        <div className="flex items-center gap-2">
          {board.shareId ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                disabled={isSharing}
              >
                {showCopied ? "Copied!" : "Copy Link"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRemoveShare}>
                Unshare
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={isSharing}
            >
              {isSharing ? "..." : showCopied ? "Copied!" : "Share"}
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-center">{board.name}</CardTitle>
          {board.description && (
            <p className="text-center text-muted-foreground">
              {board.description}
            </p>
          )}
          <div className="flex items-center justify-center gap-4 pt-2">
            <span className="text-sm text-muted-foreground">
              {completedCount}/{sortedGoals.length} completed
            </span>
            {hasBingo && (
              <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-semibold animate-pulse">
                BINGO!
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${board.size}, 1fr)` }}
          >
            {sortedGoals.map((goal) => {
              const isEditing = editingGoalId === goal._id
              const isEmpty = !goal.text

              return (
                <div
                  key={goal._id}
                  className={`aspect-square rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer transition-all relative group border-2 hover:border-primary/50 ${
                    goal.isCompleted
                      ? "bg-green-500/20 border-green-500"
                      : isEmpty
                        ? "bg-muted/50 border-dashed border-muted-foreground/30"
                        : "bg-card border-border"
                  }`}
                  onClick={() => {
                    if (!isEditing) {
                      if (isEmpty) {
                        handleStartEdit(goal._id, "")
                      } else {
                        toggleGoal({ id: goal._id })
                      }
                    }
                  }}
                >
                  {isEditing ? (
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => handleSaveEdit(goal._id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSaveEdit(goal._id)
                        }
                        if (e.key === "Escape") {
                          setEditingGoalId(null)
                        }
                      }}
                      autoFocus
                      className="w-full h-full bg-transparent text-center text-sm resize-none focus:outline-none"
                      placeholder="Enter goal..."
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span
                        className={`text-xs sm:text-sm text-center break-words line-clamp-4 ${
                          isEmpty ? "text-muted-foreground italic" : ""
                        }`}
                      >
                        {goal.text || "Click to add"}
                      </span>
                      {!isEmpty && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartEdit(goal._id, goal.text)
                          }}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs p-1 hover:bg-accent rounded"
                        >
                          Edit
                        </button>
                      )}
                      {goal.isCompleted && (
                        <span className="absolute bottom-1 right-1 text-green-500 font-bold">
                          ✓
                        </span>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
