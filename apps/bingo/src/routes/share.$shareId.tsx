import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
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
  }))

  const completedGoals = goals.filter((g) => g.isCompleted).length
  const totalGoals = goals.length
  const progress = Math.round((completedGoals / totalGoals) * 100)

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground border-b-2 border-dotted border-primary pb-1">
          Goals Bingo
        </h1>
        <Link to="/">
          <Button variant="outline" size="sm">
            Create Your Own
          </Button>
        </Link>
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
    </div>
  )
}
