import { createFileRoute, Link } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { SignInDialog } from "@/components/auth/sign-in-dialog"
import { Header } from "@/components/layout/header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"

export const Route = createFileRoute("/group/$communityId")({
  component: CommunityPage,
})

type EventFeedItem = {
  _id: string
  userId: string
  eventType: string
  boardId?: string
  boardName: string
  goalText?: string
  metadata?: string
  createdAt: number
  userName?: string
  avatarUrl?: string | null
  shareId?: string
  upCount: number
  downCount: number
  userReaction?: "up" | "down"
  commentCount: number
}

function CommunityPage() {
  const { communityId } = Route.useParams()
  const community = useQuery(api.social.getCommunity, {
    communityId: communityId as Id<"communities">,
  })
  const feed = useQuery(api.social.getCommunityFeed, {
    communityId: communityId as Id<"communities">,
  })
  const leaveCommunity = useMutation(api.social.leaveCommunity)
  const deleteCommunity = useMutation(api.social.deleteCommunity)
  const regenerateInvite = useMutation(api.social.regenerateInviteCode)

  const [showInvite, setShowInvite] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [copied, setCopied] = useState(false)

  if (community === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (community === null) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">Community not found</h2>
            <p className="text-muted-foreground mb-4">
              You may not be a member of this community, or it may have been
              deleted.
            </p>
            <Link to="/">
              <Button>Go to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleShareInvite = async () => {
    const inviteUrl = `${window.location.origin}/join/${community.inviteCode}`

    // Use native share on mobile if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${community.name}`,
          text: `Join my community "${community.name}" on Goals Bingo!`,
          url: inviteUrl,
        })
        return
      } catch (e) {
        // User cancelled or share failed, fall through to clipboard
        if ((e as Error).name === "AbortError") return
      }
    }

    // Fallback to clipboard
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerateInvite = async () => {
    await regenerateInvite({ communityId: communityId as Id<"communities"> })
  }

  const handleLeave = async () => {
    if (confirm("Leave this community?")) {
      await leaveCommunity({ communityId: communityId as Id<"communities"> })
      window.location.href = "/"
    }
  }

  const handleDelete = async () => {
    if (
      confirm(
        "Delete this community? This cannot be undone and will remove all members.",
      )
    ) {
      await deleteCommunity({ communityId: communityId as Id<"communities"> })
      window.location.href = "/"
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <Header onSignInClick={() => setShowSignIn(true)} />

      {/* Community sub-header */}
      <div className="flex items-center justify-between mb-4 -mt-2">
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Button>
          </Link>
          <h2 className="text-lg font-bold text-foreground">
            {community.name}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleShareInvite}>
            {copied ? "Copied!" : "Invite"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMembers(true)}
          >
            {community.memberCount}
            <svg
              className="w-4 h-4 ml-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </Button>
        </div>
      </div>

      {/* Feed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base border-b-2 border-dotted border-primary pb-1 inline-block">
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-3">
            {feed && feed.length > 0 ? (
              feed.map((event) => (
                <EventCard key={event._id} event={event as EventFeedItem} />
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  No activity yet. Members' progress will show here!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite to {community.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Share this link with friends to invite them:
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/join/${community.inviteCode}`}
                  className="font-mono text-sm"
                />
                <Button onClick={handleShareInvite}>
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateInvite}
              className="w-full"
            >
              Generate New Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {community.members.map((member) => (
              <div
                key={member._id}
                className="flex items-center gap-3 p-2 rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                  {member.userName.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-sm">{member.userName}</span>
                {member.userId === community.ownerId && (
                  <span className="text-xs text-muted-foreground">Owner</span>
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {community.isOwner ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="w-full"
              >
                Delete Community
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLeave}
                className="w-full"
              >
                Leave Community
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignInDialog open={showSignIn} onOpenChange={setShowSignIn} />
    </div>
  )
}

// Simplified event card for community feed
function EventCard({ event }: { event: EventFeedItem }) {
  const toggleReaction = useMutation(api.social.toggleReaction)

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return "now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  }

  const BoardLink = ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => {
    if (event.shareId) {
      return (
        <Link
          to="/share/$shareId"
          params={{ shareId: event.shareId }}
          className={cn(className, "hover:underline cursor-pointer")}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </Link>
      )
    }
    return <span className={className}>{children}</span>
  }

  const getEventMessage = () => {
    const metadata = event.metadata ? JSON.parse(event.metadata) : {}
    switch (event.eventType) {
      case "board_created":
        return (
          <>
            created{" "}
            <BoardLink className="border-b-2 border-dotted border-blue-500 text-blue-500 font-medium">
              {event.boardName}
            </BoardLink>
          </>
        )
      case "goal_completed":
        return (
          <>
            completed{" "}
            <BoardLink className="border-b-2 border-dotted border-green-500 text-green-500 font-medium">
              {event.goalText || "a goal"}
            </BoardLink>
          </>
        )
      case "board_completed":
        return (
          <>
            finished{" "}
            <BoardLink className="border-b-2 border-dotted border-yellow-500 text-yellow-500 font-medium">
              {event.boardName}
            </BoardLink>
            !
          </>
        )
      case "streak_started":
        return (
          <>
            started a{" "}
            <BoardLink className="border-b-2 border-dotted border-orange-500 text-orange-500 font-medium">
              {metadata.targetDays}-day streak
            </BoardLink>
          </>
        )
      case "streak_reset":
        return (
          <>
            reset streak after{" "}
            <span className="border-b-2 border-dotted border-red-400 text-red-400 font-medium">
              {metadata.previousDays} days
            </span>
          </>
        )
      case "streak_milestone":
        return (
          <>
            hit{" "}
            <span className="border-b-2 border-dotted border-green-500 text-green-500 font-medium">
              {metadata.days} days
            </span>
            !
          </>
        )
      case "bingo":
        return (
          <>
            got{" "}
            <BoardLink className="border-b-2 border-dotted border-purple-500 text-purple-500 font-bold">
              BINGO!
            </BoardLink>{" "}
            on {event.boardName}
          </>
        )
      case "user_joined":
        return (
          <>
            <span className="border-b-2 border-dotted border-primary text-primary font-medium">
              joined
            </span>{" "}
            the community! 👋
          </>
        )
      default:
        return <>did something</>
    }
  }

  const getEventColor = () => {
    switch (event.eventType) {
      case "board_created":
        return "bg-blue-500/20 text-blue-500"
      case "goal_completed":
        return "bg-green-500/20 text-green-500"
      case "board_completed":
        return "bg-yellow-500/20 text-yellow-500"
      case "streak_started":
      case "streak_milestone":
        return "bg-orange-500/20 text-orange-500"
      case "streak_reset":
        return "bg-red-500/20 text-red-500"
      case "bingo":
        return "bg-purple-500/20 text-purple-500"
      default:
        return "bg-primary/20 text-primary"
    }
  }

  const handleReaction = async (type: "up" | "down") => {
    await toggleReaction({ eventId: event._id as Id<"eventFeed">, type })
  }

  return (
    <div className="p-3 rounded-lg border border-border bg-card shadow-sm space-y-2">
      <div className="flex items-start gap-3">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${getEventColor()}`}
        >
          <svg
            className="w-3 h-3"
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
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed">
            <span className="font-semibold">{event.userName || "Someone"}</span>{" "}
            <span className="text-muted-foreground">{getEventMessage()}</span>
          </p>
          <span className="text-xs text-muted-foreground">
            {getTimeAgo(event.createdAt)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 pl-10">
        <button
          type="button"
          onClick={() => handleReaction("up")}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            event.userReaction === "up"
              ? "bg-green-500/20 text-green-600"
              : "text-muted-foreground hover:bg-muted hover:text-green-600"
          }`}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
            />
          </svg>
          {event.upCount > 0 && <span>{event.upCount}</span>}
        </button>
        <button
          type="button"
          onClick={() => handleReaction("down")}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            event.userReaction === "down"
              ? "bg-red-500/20 text-red-600"
              : "text-muted-foreground hover:bg-muted hover:text-red-600"
          }`}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
            />
          </svg>
          {event.downCount > 0 && <span>{event.downCount}</span>}
        </button>
      </div>
    </div>
  )
}
