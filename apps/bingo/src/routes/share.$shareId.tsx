import { createFileRoute, Link } from "@tanstack/react-router"
import {
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react"
import { useState } from "react"
import { SignInDialog } from "@/components/auth/sign-in-dialog"
import { Board } from "@/components/bingo/board"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Goal } from "@/lib/types"
import { api } from "../../convex/_generated/api"

export const Route = createFileRoute("/share/$shareId")({
  component: SharedBoardPage,
})

function SharedBoardPage() {
  const { shareId } = Route.useParams()
  const board = useQuery(api.boards.getSharedBoard, { shareId })
  const isWatching = useQuery(
    api.watched.isWatching,
    board?._id ? { boardId: board._id } : "skip",
  )
  const watchBoard = useMutation(api.watched.watchBoard)
  const unwatchBoard = useMutation(api.watched.unwatchBoard)
  const [showSignIn, setShowSignIn] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  const handleToggleWatch = async () => {
    if (!board) return
    setIsToggling(true)
    try {
      if (isWatching) {
        await unwatchBoard({ boardId: board._id })
      } else {
        await watchBoard({ boardId: board._id })
      }
    } catch (e) {
      console.error("Failed to toggle watch:", e)
    } finally {
      setIsToggling(false)
    }
  }

  if (board === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (board === null) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">Board not found</h2>
            <p className="text-muted-foreground mb-4">
              This board may have been deleted or the link is invalid.
            </p>
            <Link to="/">
              <Button>Go to Home</Button>
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
    isStreakGoal: g.isStreakGoal,
    streakTargetDays: g.streakTargetDays,
    streakStartDate: g.streakStartDate,
    isProgressGoal: g.isProgressGoal,
    progressTarget: g.progressTarget,
    progressCurrent: g.progressCurrent,
  }))

  const completedGoals = goals.filter((g) => g.isCompleted).length
  const totalGoals = goals.length
  const progress = Math.round((completedGoals / totalGoals) * 100)

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <header className="flex items-center justify-between mb-6">
        <Link to="/">
          <h1 className="text-2xl font-bold text-foreground border-b-2 border-dotted border-primary pb-1 hover:text-primary transition-colors cursor-pointer">
            Goals Bingo
          </h1>
        </Link>
        <div className="flex items-center gap-2">
          {!board.isOwner && (
            <>
              <Authenticated>
                <Button
                  variant={isWatching ? "default" : "ghost"}
                  size="sm"
                  onClick={handleToggleWatch}
                  disabled={isToggling}
                  title={isWatching ? "Stop watching" : "Watch this board"}
                  className="px-2"
                >
                  {isToggling ? (
                    <span className="w-5 h-5 flex items-center justify-center">...</span>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill={isWatching ? "currentColor" : "none"}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <title>{isWatching ? "Watching" : "Watch"}</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                  )}
                </Button>
              </Authenticated>
              <Unauthenticated>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSignIn(true)}
                  title="Watch this board"
                  className="px-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <title>Watch</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </Button>
              </Unauthenticated>
            </>
          )}
          <Link to="/">
            <Button variant="outline" size="sm">
              Create Your Own
            </Button>
          </Link>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <span className="font-bold">{board.name}</span>
              <span className="text-sm text-muted-foreground font-normal">
                by {board.ownerName}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {progress}% complete
            </span>
          </CardTitle>
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <span>{board.year}</span>
            <span>·</span>
            <span>
              Created {new Date(board.createdAt).toLocaleDateString()}
            </span>
            {board.difficulty && (
              <>
                <span>·</span>
                <span>{board.difficulty}</span>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <Board
            goals={goals}
            size={board.size}
            onUpdateGoal={() => {}}
            onToggleGoal={() => {}}
            readOnly
          />
          <p className="text-xs text-muted-foreground mt-4 text-center">
            This is a read-only view of someone's goals board.
          </p>
        </CardContent>
      </Card>

      <SignInDialog open={showSignIn} onOpenChange={setShowSignIn} />
    </div>
  )
}
