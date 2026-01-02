import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Authenticated, Unauthenticated, useQuery } from "convex/react"
import { useState } from "react"
import { SignInDialog } from "@/components/auth/sign-in-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "../../convex/_generated/api"

function BoardsPage() {
  const navigate = useNavigate()
  const boards = useQuery(api.boards.list) ?? []
  const [showSignIn, setShowSignIn] = useState(false)

  // Group boards by year
  const boardsByYear = boards.reduce(
    (acc, board) => {
      const year = board.year ?? new Date(board.createdAt).getFullYear()
      if (!acc[year]) acc[year] = []
      acc[year].push(board)
      return acc
    },
    {} as Record<number, typeof boards>,
  )

  const years = Object.keys(boardsByYear)
    .map(Number)
    .sort((a, b) => b - a)

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <header className="flex items-center justify-between mb-6">
        <Link to="/">
          <h1 className="text-2xl font-bold text-foreground border-b-2 border-dotted border-primary pb-1">
            Goals Bingo
          </h1>
        </Link>
        <Authenticated>
          <Link to="/">
            <Button variant="outline" size="sm">
              + New Board
            </Button>
          </Link>
        </Authenticated>
      </header>

      <Unauthenticated>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">
              Sign in to view your saved boards
            </p>
            <Button onClick={() => setShowSignIn(true)}>Sign In</Button>
          </CardContent>
        </Card>
        <SignInDialog open={showSignIn} onOpenChange={setShowSignIn} />
      </Unauthenticated>

      <Authenticated>
        <h2 className="text-lg font-semibold mb-4">Your Boards</h2>

        {boards.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">
                You don't have any boards yet.
              </p>
              <Link to="/">
                <Button>Create Your First Board</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {years.map((year) => (
              <div key={year}>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  {year}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(boardsByYear[year] ?? []).map((board) => (
                    <Card
                      key={board._id}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() =>
                        navigate({
                          to: "/board/$boardId",
                          params: { boardId: board._id },
                        })
                      }
                    >
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="flex items-center justify-between text-sm">
                          <span className="truncate">{board.name}</span>
                          <span className="text-xs font-normal text-muted-foreground shrink-0 ml-2">
                            {board.size}x{board.size}
                          </span>
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Authenticated>
    </div>
  )
}

export const Route = createFileRoute("/boards")({
  component: BoardsPage,
})
