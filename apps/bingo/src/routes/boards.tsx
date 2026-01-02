import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Authenticated, Unauthenticated, useQuery } from "convex/react"
import { useState } from "react"
import { SignInDialog } from "@/components/auth/sign-in-dialog"
import { Header } from "@/components/layout/header"
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
      <Header onSignInClick={() => setShowSignIn(true)} showMyBoards={false} />

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
                      <CardContent className="pt-0 pb-3 px-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {new Date(board.createdAt).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            {board.difficulty && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  board.difficulty === "Easy"
                                    ? "bg-green-500/20 text-green-400"
                                    : board.difficulty === "Medium"
                                      ? "bg-yellow-500/20 text-yellow-400"
                                      : board.difficulty === "Hard"
                                        ? "bg-orange-500/20 text-orange-400"
                                        : board.difficulty === "Expert"
                                          ? "bg-red-500/20 text-red-400"
                                          : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {board.difficulty}
                              </span>
                            )}
                            <span className="font-medium">
                              {board.completionPercent}%
                            </span>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${board.completionPercent}%` }}
                          />
                        </div>
                      </CardContent>
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
