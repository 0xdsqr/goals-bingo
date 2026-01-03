import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "../../convex/_generated/api"

export const Route = createFileRoute("/user/$username")({
  component: UserProfilePage,
})

function UserProfilePage() {
  const { username } = Route.useParams()
  const profile = useQuery(api.profile.getProfileByUsername, { username })

  if (profile === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (profile === null) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <header className="flex items-center justify-between mb-6">
          <Link to="/">
            <h1 className="text-2xl font-bold text-foreground border-b-2 border-dotted border-primary pb-1 hover:text-primary transition-colors cursor-pointer">
              Goals Bingo
            </h1>
          </Link>
        </header>
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">User not found</h2>
            <p className="text-muted-foreground mb-4">
              This user doesn't exist or hasn't set up their profile yet.
            </p>
            <Link to="/">
              <Button>Go to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <header className="flex items-center justify-between mb-6">
        <Link to="/">
          <h1 className="text-2xl font-bold text-foreground border-b-2 border-dotted border-primary pb-1 hover:text-primary transition-colors cursor-pointer">
            Goals Bingo
          </h1>
        </Link>
        <Link to="/">
          <Button variant="outline" size="sm">
            Create Your Own
          </Button>
        </Link>
      </header>

      {/* Profile Header */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={profile.avatarUrl || undefined} />
              <AvatarFallback className="text-xl">
                {(profile.username || "A").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{profile.username || "Anonymous"}</h2>
              {profile.bio && (
                <p className="text-sm text-muted-foreground">{profile.bio}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {profile.boards.length} public board{profile.boards.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Boards */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base border-b-2 border-dotted border-primary pb-1 inline-block">
            Boards
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {profile.boards.length > 0 ? (
            <div className="space-y-2">
              {profile.boards.map((board) => (
                <Link
                  key={board._id}
                  to="/share/$shareId"
                  params={{ shareId: board.shareId! }}
                >
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                        {board.completionPercent}%
                      </div>
                      <div>
                        <p className="font-medium">{board.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {board.year} · {board.completedGoals}/{board.totalGoals} goals
                        </p>
                      </div>
                    </div>
                    <svg
                      className="w-4 h-4 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <title>View board</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                No public boards yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
