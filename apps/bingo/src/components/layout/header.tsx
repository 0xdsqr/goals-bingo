import { useAuthActions } from "@convex-dev/auth/react"
import { Link } from "@tanstack/react-router"
import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react"
import { useEffect, useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "../../../convex/_generated/api"

interface HeaderProps {
  onSignInClick?: () => void
  showMyBoards?: boolean
}

export function Header({ onSignInClick, showMyBoards = true }: HeaderProps) {
  const { signOut } = useAuthActions()

  return (
    <header className="flex items-center justify-between mb-6">
      <Link to="/">
        <h1 className="text-2xl font-bold text-foreground border-b-2 border-dotted border-primary pb-1 hover:text-primary transition-colors cursor-pointer">
          Goals Bingo
        </h1>
      </Link>
      <div className="flex items-center gap-2">
        <Authenticated>
          {showMyBoards && (
            <Link to="/boards">
              <Button variant="outline" size="sm">
                My Boards
              </Button>
            </Link>
          )}
          <ProfileMenu onSignOut={() => signOut()} />
        </Authenticated>
        <Unauthenticated>
          {onSignInClick && (
            <Button size="sm" onClick={onSignInClick}>
              Sign In
            </Button>
          )}
        </Unauthenticated>
      </div>
    </header>
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
