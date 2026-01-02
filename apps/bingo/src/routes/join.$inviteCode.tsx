import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Authenticated, Unauthenticated, useMutation } from "convex/react"
import { useState } from "react"
import { SignInDialog } from "@/components/auth/sign-in-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { api } from "../../convex/_generated/api"

export const Route = createFileRoute("/join/$inviteCode")({
  component: JoinCommunityPage,
})

function JoinCommunityPage() {
  const { inviteCode } = Route.useParams()
  const navigate = useNavigate()
  const joinCommunity = useMutation(api.social.joinCommunity)

  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "idle"
  >("idle")
  const [error, setError] = useState<string | null>(null)
  const [showSignIn, setShowSignIn] = useState(false)

  const handleJoin = async () => {
    setStatus("loading")
    setError(null)
    try {
      const result = await joinCommunity({ inviteCode })
      setStatus("success")
      // Redirect after a moment
      setTimeout(() => {
        navigate({
          to: "/group/$communityId",
          params: { communityId: result.communityId },
        })
      }, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join")
      setStatus("error")
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-md min-h-screen flex items-center justify-center">
      <Card className="w-full">
        <CardContent className="py-8 text-center">
          <Unauthenticated>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Join a Private Community</h2>
            <p className="text-muted-foreground mb-6">
              Sign in to join this community and see member activity.
            </p>
            <Button onClick={() => setShowSignIn(true)}>Sign in to Join</Button>
            <SignInDialog open={showSignIn} onOpenChange={setShowSignIn} />
          </Unauthenticated>

          <Authenticated>
            {status === "idle" && (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2">Join Community</h2>
                <p className="text-muted-foreground mb-6">
                  You've been invited to join a private community.
                </p>
                <Button onClick={handleJoin}>Join Community</Button>
              </>
            )}

            {status === "loading" && (
              <>
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <svg
                    className="w-8 h-8 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-muted-foreground">Joining community...</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2 text-green-500">
                  Joined!
                </h2>
                <p className="text-muted-foreground">Redirecting to community...</p>
              </>
            )}

            {status === "error" && (
              <>
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2 text-red-500">
                  Failed to Join
                </h2>
                <p className="text-muted-foreground mb-4">{error}</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => setStatus("idle")}>
                    Try Again
                  </Button>
                  <Link to="/">
                    <Button variant="ghost">Go Home</Button>
                  </Link>
                </div>
              </>
            )}
          </Authenticated>
        </CardContent>
      </Card>
    </div>
  )
}
