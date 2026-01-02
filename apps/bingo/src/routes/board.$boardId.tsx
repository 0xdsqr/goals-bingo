import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react"
import { useCallback, useState } from "react"
import { SignInDialog } from "@/components/auth/sign-in-dialog"
import { Board } from "@/components/bingo/board"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Goal } from "@/lib/types"
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
  const updateBoard = useMutation(api.boards.update)
  const removeBoard = useMutation(api.boards.remove)
  const generateShareLink = useMutation(api.boards.generateShareLink)
  const removeShareLink = useMutation(api.boards.removeShareLink)
  const rankDifficultyAction = useAction(api.boards.rankDifficulty)

  const [showSignIn, setShowSignIn] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState("")
  const [isRanking, setIsRanking] = useState(false)
  const [difficultyRank, setDifficultyRank] = useState<string | null>(null)

  const handleShare = useCallback(async () => {
    if (!board) return
    setIsSharing(true)
    try {
      const { shareId } = await generateShareLink({ id: board._id })
      const shareUrl = `${window.location.origin}/share/${shareId}`

      // Try native share on mobile first
      if (navigator.share) {
        await navigator.share({
          title: board.name,
          url: shareUrl,
        })
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl)
        setShowCopied(true)
        setTimeout(() => setShowCopied(false), 2000)
      }
    } catch (err) {
      // If share was cancelled or clipboard failed, try fallback
      if ((err as Error).name !== "AbortError") {
        const { shareId } = board
        if (shareId) {
          const shareUrl = `${window.location.origin}/share/${shareId}`
          // Last resort fallback - prompt user
          prompt("Copy this link:", shareUrl)
        }
      }
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
      <div className="container mx-auto px-4 py-8 max-w-3xl">
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
      <div className="container mx-auto px-4 py-8 max-w-3xl">
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

  // Map Convex goals to local Goal type
  const goals: Goal[] = board.goals.map((g) => ({
    id: g._id,
    text: g.text,
    position: g.position,
    isCompleted: g.isCompleted,
    isFreeSpace: g.isFreeSpace,
  }))

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this board?")) {
      await removeBoard({ id: board._id })
      navigate({ to: "/boards" })
    }
  }

  const handleUpdateGoal = async (goalId: string, text: string) => {
    await updateGoal({ id: goalId as Id<"goals">, text })
  }

  const handleToggleGoal = async (goalId: string) => {
    await toggleGoal({ id: goalId as Id<"goals"> })
  }

  const handleStartEditName = () => {
    setEditName(board.name)
    setIsEditingName(true)
  }

  const handleSaveName = async () => {
    if (editName.trim() && editName !== board.name) {
      await updateBoard({ id: board._id, name: editName.trim() })
    }
    setIsEditingName(false)
  }

  const handleRankDifficulty = async () => {
    const goalsWithText = goals.filter((g) => g.text && !g.isFreeSpace)
    if (goalsWithText.length === 0) {
      setDifficultyRank("Add some goals first to get a difficulty ranking!")
      return
    }

    setIsRanking(true)
    setDifficultyRank(null)
    try {
      const result = await rankDifficultyAction({
        goals: goalsWithText.map((g) => g.text),
      })
      setDifficultyRank(result.ranking || "Unable to rank at this time.")
    } catch {
      setDifficultyRank("Failed to get ranking. Please try again.")
    } finally {
      setIsRanking(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <header className="flex items-center justify-between mb-6">
        <Link to="/boards">
          <Button variant="ghost" size="sm">
            &larr; Back
          </Button>
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
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-base">
            {isEditingName ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName()
                  if (e.key === "Escape") setIsEditingName(false)
                }}
                className="w-full text-center bg-transparent border-b border-primary focus:outline-none"
                ref={(el) => el?.focus()}
              />
            ) : (
              <span
                className="cursor-pointer hover:text-primary transition-colors"
                onClick={handleStartEditName}
                title="Click to edit"
              >
                {board.name}
              </span>
            )}
          </CardTitle>
          {board.description && (
            <p className="text-center text-muted-foreground text-sm">
              {board.description}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground mt-1">
            <span>{board.year}</span>
            <span>·</span>
            <span>
              Created {new Date(board.createdAt).toLocaleDateString()}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <Board
            goals={goals}
            size={board.size}
            onUpdateGoal={handleUpdateGoal}
            onToggleGoal={handleToggleGoal}
          />

          {/* AI Difficulty Section */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRankDifficulty}
                disabled={isRanking}
              >
                {isRanking ? "Analyzing..." : "AI Difficulty"}
              </Button>
            </div>
            {difficultyRank && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium mb-1">AI Analysis:</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {difficultyRank}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
