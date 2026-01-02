import { useAuthActions } from "@convex-dev/auth/react"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  Authenticated,
  Unauthenticated,
  useAction,
  useMutation,
  useQuery,
} from "convex/react"
import { useRef, useState } from "react"
import { SignInDialog } from "@/components/auth/sign-in-dialog"
import { Board } from "@/components/bingo/board"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useLocalBoard } from "@/lib/use-local-board"
import { api } from "../../convex/_generated/api"

type EventFeedItem = {
  _id: string
  userId: string
  eventType: "board_created" | "goal_completed" | "board_completed"
  boardId?: string
  boardName: string
  createdAt: number
  userName?: string
  shareId?: string
}

export const Route = createFileRoute("/")({
  component: HomePage,
})

function HomePage() {
  const { signOut } = useAuthActions()
  const createBoard = useMutation(api.boards.create)
  const toggleEventFeedOptIn = useMutation(api.boards.toggleEventFeedOptIn)
  const rankDifficultyAction = useAction(api.boards.rankDifficulty)
  const generateUploadUrl = useMutation(api.boards.generateUploadUrl)
  const extractGoalsFromImage = useAction(api.boards.extractGoalsFromImage)
  const eventFeedStatus = useQuery(api.boards.getEventFeedStatus)
  const eventFeed = useQuery(api.boards.getEventFeed)

  const {
    board: localBoard,
    isLoaded,
    updateBoardName,
    regenerateName,
    updateGoal,
    toggleGoal,
    clear,
    getExportData,
  } = useLocalBoard()

  const [showSignIn, setShowSignIn] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [isRanking, setIsRanking] = useState(false)
  const [difficultyRank, setDifficultyRank] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportFromPhoto = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file || !localBoard) return

    setIsImporting(true)
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl()

      // Upload the file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      const { storageId } = await result.json()

      // Extract goals from image
      const extraction = await extractGoalsFromImage({ storageId })

      if (extraction.success && extraction.goals.length > 0) {
        // Fill in the board with extracted goals
        const nonFreeSpaceGoals = localBoard.goals.filter((g) => !g.isFreeSpace)
        extraction.goals.forEach((goalText, index) => {
          const goal = nonFreeSpaceGoals[index]
          if (goal) {
            updateGoal(goal.id, { text: goalText })
          }
        })
      } else {
        alert(extraction.error || "No goals found in image")
      }
    } catch (error) {
      console.error("Import error:", error)
      alert("Failed to import goals from image")
    } finally {
      setIsImporting(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleSave = async () => {
    if (!localBoard?.name.trim() || !localBoard) return
    setIsSaving(true)
    try {
      const goals = getExportData()
      await createBoard({
        name: localBoard.name.trim(),
        size: localBoard.size,
        year: new Date().getFullYear(),
        goals: goals ?? undefined,
      })
      clear()
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleOptIn = async () => {
    await toggleEventFeedOptIn()
  }

  const handleRankDifficulty = async () => {
    if (!localBoard) return
    const goalsWithText = localBoard.goals.filter(
      (g) => g.text && !g.isFreeSpace,
    )
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

  if (!isLoaded || !localBoard) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground border-b-2 border-dotted border-primary pb-1">
          Goals Bingo
        </h1>
        <div className="flex items-center gap-2">
          <Authenticated>
            <Link to="/boards">
              <Button variant="outline" size="sm">
                My Boards
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Sign Out
            </Button>
          </Authenticated>
          <Unauthenticated>
            <Button size="sm" onClick={() => setShowSignIn(true)}>
              Sign In
            </Button>
          </Unauthenticated>
        </div>
      </header>

      {/* Board Section */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-muted-foreground shrink-0 text-sm">
                Board:
              </span>
              {isEditingName ? (
                <Input
                  value={localBoard.name}
                  onChange={(e) => updateBoardName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setIsEditingName(false)
                    if (e.key === "Escape") setIsEditingName(false)
                  }}
                  autoFocus
                  className="flex-1 font-bold h-8"
                />
              ) : (
                <span
                  className="font-bold cursor-pointer hover:text-primary transition-colors truncate"
                  onClick={() => setIsEditingName(true)}
                >
                  {localBoard.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={regenerateName}
                title="Generate new name"
                className="h-7 px-2 text-xs"
              >
                shuffle
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingName(true)}
                title="Edit name"
                className="h-7 px-2 text-xs"
              >
                edit
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <p className="text-xs text-muted-foreground mb-3">
            Click cell to add goal. Click goal to complete. Center = free space.
          </p>
          {localBoard && (
            <Board
              goals={localBoard.goals}
              size={localBoard.size}
              onUpdateGoal={(id, text) => updateGoal(id, { text })}
              onToggleGoal={toggleGoal}
            />
          )}

          {/* Save and AI Rank Section */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
              <div className="flex gap-2">
                <Authenticated>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!localBoard.name.trim() || isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Board"}
                  </Button>
                </Authenticated>
                <Unauthenticated>
                  <Button size="sm" onClick={() => setShowSignIn(true)}>
                    Sign in to Save
                  </Button>
                </Unauthenticated>
                <Button variant="outline" size="sm" onClick={clear}>
                  Clear
                </Button>
              </div>
              <div className="flex gap-2">
                <Authenticated>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImportFromPhoto}
                    className="hidden"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                  >
                    {isImporting ? "Importing..." : "Import Photo"}
                  </Button>
                </Authenticated>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRankDifficulty}
                  disabled={isRanking}
                >
                  {isRanking ? "Analyzing..." : "AI Difficulty"}
                </Button>
              </div>
            </div>
            {difficultyRank && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium mb-1">AI Analysis:</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {difficultyRank}
                </p>
              </div>
            )}
            <Unauthenticated>
              <p className="text-xs text-muted-foreground mt-2">
                Board saved locally. Sign in to sync.
              </p>
            </Unauthenticated>
          </div>
        </CardContent>
      </Card>

      {/* Gamified Event Feed Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Community Activity</span>
            <Authenticated>
              <Button
                variant={eventFeedStatus?.isOptedIn ? "secondary" : "default"}
                size="sm"
                className="h-7 text-xs"
                onClick={handleToggleOptIn}
              >
                {eventFeedStatus?.isOptedIn ? "Leave" : "Join"}
              </Button>
            </Authenticated>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <Unauthenticated>
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">
                Sign in to join the community and share your progress!
              </p>
              <Button size="sm" onClick={() => setShowSignIn(true)}>
                Sign in to Join
              </Button>
            </div>
          </Unauthenticated>
          <Authenticated>
            {!eventFeedStatus?.isOptedIn ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Join to see community goals and share your progress!
                </p>
                <Button size="sm" onClick={handleToggleOptIn}>
                  Join Community
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {eventFeed && eventFeed.length > 0 ? (
                  eventFeed
                    .filter(
                      (event): event is NonNullable<typeof event> =>
                        event !== null,
                    )
                    .map((event) => (
                      <EventFeedItemComponent
                        key={event._id}
                        event={event as EventFeedItem}
                      />
                    ))
                ) : (
                  <p className="text-center text-muted-foreground py-3 text-sm">
                    No activity yet. Create a board to get started!
                  </p>
                )}
              </div>
            )}
          </Authenticated>
        </CardContent>
      </Card>

      <SignInDialog open={showSignIn} onOpenChange={setShowSignIn} />
    </div>
  )
}

function EventFeedItemComponent({ event }: { event: EventFeedItem }) {
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

  const getBoardNameElement = () => {
    if (event.shareId) {
      return (
        <Link
          to="/share/$shareId"
          params={{ shareId: event.shareId }}
          className="text-primary hover:underline"
        >
          {event.boardName}
        </Link>
      )
    }
    return <span>"{event.boardName}"</span>
  }

  const getEventMessage = () => {
    switch (event.eventType) {
      case "board_created":
        return <>created {getBoardNameElement()}</>
      case "goal_completed":
        return <>completed a goal</>
      case "board_completed":
        return <>finished {getBoardNameElement()}!</>
      default:
        return <>did something</>
    }
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
        {event.userName?.charAt(0).toUpperCase() || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate">
          <span className="font-medium">{event.userName || "Someone"}</span>{" "}
          {getEventMessage()}
        </p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {getTimeAgo(event.createdAt)}
      </span>
    </div>
  )
}
