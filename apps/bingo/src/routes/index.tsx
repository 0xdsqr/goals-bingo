import { useAuthActions } from "@convex-dev/auth/react"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  Authenticated,
  Unauthenticated,
  useAction,
  useMutation,
  useQuery,
} from "convex/react"
import { useEffect, useRef, useState } from "react"
import { SignInDialog } from "@/components/auth/sign-in-dialog"
import { Board } from "@/components/bingo/board"
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
import { Label } from "@/components/ui/label"
import { useLocalBoard } from "@/lib/use-local-board"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"

type EventFeedItem = {
  _id: string
  userId: string
  eventType:
    | "board_created"
    | "goal_completed"
    | "board_completed"
    | "streak_started"
    | "streak_reset"
    | "streak_milestone"
    | "bingo"
    | "user_joined"
    | "progress_updated"
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
        <Link to="/">
          <h1 className="text-2xl font-bold text-foreground border-b-2 border-dotted border-primary pb-1 hover:text-primary transition-colors cursor-pointer">
            Goals Bingo
          </h1>
        </Link>
        <div className="flex items-center gap-2">
          <Authenticated>
            <Link to="/boards">
              <Button variant="outline" size="sm">
                My Boards
              </Button>
            </Link>
            <ProfileMenu onSignOut={() => signOut()} />
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
          {localBoard && (
            <Board
              goals={localBoard.goals}
              size={localBoard.size}
              onUpdateGoal={(id, text) => updateGoal(id, { text })}
              onToggleGoal={toggleGoal}
            />
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border-2 border-dashed border-muted-foreground/30 bg-muted/50" />
              <span>Empty</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border-2 border-border bg-card" />
              <span>Goal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border-2 border-green-500 bg-green-500/20" />
              <span>Done</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border-2 border-primary bg-primary/20" />
              <span>Free</span>
            </div>
          </div>

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
                    capture="environment"
                    onChange={handleImportFromPhoto}
                    className="sr-only"
                    id="photo-upload"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    type="button"
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

      {/* Community Section with Tabs */}
      <CommunitySection
        eventFeedStatus={eventFeedStatus}
        eventFeed={eventFeed}
        onToggleOptIn={handleToggleOptIn}
        onSignIn={() => setShowSignIn(true)}
      />

      <SignInDialog open={showSignIn} onOpenChange={setShowSignIn} />
    </div>
  )
}

// Profile menu with avatar
function ProfileMenu({ onSignOut }: { onSignOut: () => void }) {
  const profile = useQuery(api.profile.getMyProfile)
  const ensureProfile = useMutation(api.profile.ensureProfile)
  const updateUsername = useMutation(api.profile.updateUsername)
  const generateUploadUrl = useMutation(api.profile.generateAvatarUploadUrl)
  const updateAvatar = useMutation(api.profile.updateAvatar)

  const [showMenu, setShowMenu] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [username, setUsername] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-create profile with random username if needed
  useEffect(() => {
    if (profile?.needsProfile) {
      ensureProfile()
    }
  }, [profile?.needsProfile, ensureProfile])

  const handleSaveUsername = async () => {
    if (!username.trim()) return
    setIsUpdating(true)
    setError(null)
    try {
      await updateUsername({ username: username.trim() })
      setShowEditProfile(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB")
      return
    }

    setIsUpdating(true)
    setError(null)
    try {
      const uploadUrl = await generateUploadUrl()
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      const { storageId } = await result.json()
      await updateAvatar({ storageId })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload")
    } finally {
      setIsUpdating(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
      >
        <Avatar size="sm">
          {profile?.avatarUrl ? (
            <AvatarImage src={profile.avatarUrl} alt={profile.username || ""} />
          ) : null}
          <AvatarFallback>
            {profile?.username?.charAt(0).toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium truncate">
                {profile?.username || "Anonymous"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setUsername(profile?.username || "")
                setShowEditProfile(true)
                setShowMenu(false)
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
            >
              Edit Profile
            </button>
            <button
              type="button"
              onClick={() => {
                onSignOut()
                setShowMenu(false)
              }}
              className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-muted transition-colors"
            >
              Sign Out
            </button>
          </div>
        </>
      )}

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <Avatar size="xl">
                {profile?.avatarUrl ? (
                  <AvatarImage
                    src={profile.avatarUrl}
                    alt={profile.username || ""}
                  />
                ) : null}
                <AvatarFallback>
                  {username?.charAt(0).toUpperCase() ||
                    profile?.username?.charAt(0).toUpperCase() ||
                    "?"}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="sr-only"
                id="avatar-upload"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUpdating}
              >
                {isUpdating ? "Uploading..." : "Change Avatar"}
              </Button>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your-username"
                maxLength={30}
              />
              <p className="text-xs text-muted-foreground">
                Letters, numbers, _ and - only
              </p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProfile(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveUsername}
              disabled={!username.trim() || isUpdating}
            >
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type CommunityTab = "public" | "communities"

function CommunitySection({
  eventFeedStatus,
  eventFeed,
  onToggleOptIn,
  onSignIn,
}: {
  eventFeedStatus: { isOptedIn: boolean } | undefined
  eventFeed: (EventFeedItem | null)[] | undefined
  onToggleOptIn: () => void
  onSignIn: () => void
}) {
  const [activeTab, setActiveTab] = useState<CommunityTab>("public")
  const [showCreateCommunity, setShowCreateCommunity] = useState(false)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="border-b-2 border-dotted border-primary pb-1">
            Community
          </span>
          <Authenticated>
            {eventFeedStatus?.isOptedIn && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowCreateCommunity(true)}
                >
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  New Community
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={onToggleOptIn}
                >
                  Leave
                </Button>
              </div>
            )}
          </Authenticated>
        </CardTitle>

        {/* Tabs */}
        <Authenticated>
          {eventFeedStatus?.isOptedIn && (
            <div className="flex gap-1 mt-2">
              <button
                type="button"
                onClick={() => setActiveTab("public")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === "public"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Public Feed
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("communities")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === "communities"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                My Communities
              </button>
            </div>
          )}
        </Authenticated>
      </CardHeader>

      <CardContent className="pt-2">
        <Unauthenticated>
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Join the community to share progress and cheer others on!
            </p>
            <Button size="sm" onClick={onSignIn}>
              Sign in to Join
            </Button>
          </div>
        </Unauthenticated>

        <Authenticated>
          {!eventFeedStatus?.isOptedIn ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Share your goals journey with others!
              </p>
              <Button size="sm" onClick={onToggleOptIn}>
                Join Community
              </Button>
            </div>
          ) : activeTab === "public" ? (
            <div className="space-y-3">
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
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">
                    No activity yet. Create a board to get started!
                  </p>
                </div>
              )}
            </div>
          ) : (
            <CommunitiesList onCreateNew={() => setShowCreateCommunity(true)} />
          )}
        </Authenticated>
      </CardContent>

      {/* Create Community Dialog */}
      <CreateCommunityDialog
        open={showCreateCommunity}
        onOpenChange={setShowCreateCommunity}
      />
    </Card>
  )
}

function CommunitiesList({ onCreateNew }: { onCreateNew: () => void }) {
  const communities = useQuery(api.social.getMyCommunities)

  if (!communities || communities.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
          <svg
            className="w-6 h-6 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          No private communities yet
        </p>
        <Button size="sm" variant="outline" onClick={onCreateNew}>
          Create a Community
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {communities.map((community) => (
        <Link
          key={community._id}
          to="/group/$communityId"
          params={{ communityId: community._id }}
          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
            {community.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{community.name}</p>
            <p className="text-xs text-muted-foreground">
              {community.memberCount} members
            </p>
          </div>
          <svg
            className="w-4 h-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      ))}
    </div>
  )
}

function CreateCommunityDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createCommunity = useMutation(api.social.createCommunity)
  const [name, setName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setIsCreating(true)
    try {
      await createCommunity({ name: name.trim() })
      setName("")
      onOpenChange(false)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Private Community</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="community-name">Community Name</Label>
            <Input
              id="community-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Fitness Friends, Book Club..."
              autoFocus
            />
          </div>
          <p className="text-xs text-muted-foreground">
            You'll get an invite link to share with friends. Anyone with the
            link can join.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
            {isCreating ? "Creating..." : "Create Community"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EventFeedItemComponent({ event }: { event: EventFeedItem }) {
  const toggleReaction = useMutation(api.social.toggleReaction)
  const [showComments, setShowComments] = useState(false)

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
    const metadata = event.metadata ? JSON.parse(event.metadata) : {}
    switch (event.eventType) {
      case "board_created":
        return <>created {getBoardNameElement()}</>
      case "goal_completed":
        return <>completed a goal</>
      case "board_completed":
        return <>finished {getBoardNameElement()}!</>
      case "streak_started":
        return (
          <>
            started a {metadata.targetDays}-day streak:{" "}
            <span className="text-orange-500">{event.goalText}</span>
          </>
        )
      case "streak_reset":
        return (
          <>
            reset their streak after {metadata.previousDays} days:{" "}
            <span className="text-red-400">{event.goalText}</span>
          </>
        )
      case "streak_milestone":
        return (
          <>
            hit {metadata.days} days on{" "}
            <span className="text-green-500">{event.goalText}</span>!
          </>
        )
      case "bingo":
        return (
          <>
            got <span className="text-primary font-bold">BINGO!</span> on{" "}
            {getBoardNameElement()}
          </>
        )
      case "user_joined":
        return (
          <>
            joined the community! <span className="text-primary">Welcome</span> <span role="img" aria-label="wave">👋</span>
          </>
        )
      default:
        return <>did something</>
    }
  }

  const handleReaction = async (type: "up" | "down") => {
    await toggleReaction({ eventId: event._id as Id<"eventFeed">, type })
  }

  // Get event type icon
  const getEventIcon = () => {
    switch (event.eventType) {
      case "board_created":
        return (
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
              d="M12 4v16m8-8H4"
            />
          </svg>
        )
      case "goal_completed":
        return (
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
        )
      case "board_completed":
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )
      case "streak_started":
      case "streak_milestone":
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 23c-1.1 0-1.99-.89-1.99-1.99h3.98c0 1.1-.89 1.99-1.99 1.99zm7-6v-6c0-3.35-2.36-6.15-5.5-6.83V3c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v1.17C7.36 4.85 5 7.65 5 11v6l-2 2v1h18v-1l-2-2z" />
          </svg>
        )
      case "streak_reset":
        return (
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )
      case "bingo":
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z" />
          </svg>
        )
      case "user_joined":
        return (
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
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
        )
      default:
        return (
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
    }
  }

  // Get event type color
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
      case "user_joined":
        return "bg-primary/20 text-primary"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="p-3 rounded-lg border border-border bg-card shadow-sm space-y-2">
      {/* Main event row */}
      <div className="flex items-start gap-3">
        {/* User avatar or event icon fallback */}
        {event.avatarUrl ? (
          <Avatar size="sm" className="shrink-0">
            <AvatarImage src={event.avatarUrl} alt={event.userName || ""} />
            <AvatarFallback>
              {event.userName?.charAt(0).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${getEventColor()}`}
          >
            {getEventIcon()}
          </div>
        )}
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

      {/* Reactions and comments row */}
      <div className="flex items-center gap-1 pl-9">
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
        <button
          type="button"
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            showComments
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-primary"
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {event.commentCount > 0 && <span>{event.commentCount}</span>}
        </button>
      </div>

      {/* Comments section */}
      {showComments && <EventComments eventId={event._id as Id<"eventFeed">} />}
    </div>
  )
}

function EventComments({ eventId }: { eventId: Id<"eventFeed"> }) {
  const comments = useQuery(api.social.getComments, { eventId })
  const addComment = useMutation(api.social.addComment)
  const deleteComment = useMutation(api.social.deleteComment)
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setIsSubmitting(true)
    try {
      await addComment({ eventId, text: newComment.trim() })
      setNewComment("")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (commentId: Id<"comments">) => {
    if (confirm("Delete this comment?")) {
      await deleteComment({ commentId })
    }
  }

  return (
    <div className="pl-10 pt-2 space-y-2 border-t border-border mt-2">
      {/* Comment list */}
      {comments?.map((comment) => (
        <div key={comment._id} className="flex items-start gap-2 text-sm group">
          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium shrink-0">
            {comment.userName?.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-medium text-xs">{comment.userName}</span>
            <p className="text-xs text-muted-foreground">{comment.text}</p>
          </div>
          <button
            type="button"
            onClick={() => handleDelete(comment._id)}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ))}

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 text-xs bg-muted/50 border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={isSubmitting || !newComment.trim()}
          className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          Post
        </button>
      </form>
    </div>
  )
}
