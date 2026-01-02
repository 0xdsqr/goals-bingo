import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Word lists for random username generation
const adjectives = [
  "cosmic",
  "stellar",
  "bright",
  "swift",
  "bold",
  "epic",
  "zen",
  "wild",
  "calm",
  "brave",
  "clever",
  "daring",
  "eager",
  "fierce",
  "gentle",
  "happy",
  "keen",
  "lively",
  "merry",
  "noble",
  "proud",
  "quick",
  "radiant",
  "serene",
  "vivid",
]

const nouns = [
  "quest",
  "spark",
  "dream",
  "flame",
  "star",
  "wave",
  "peak",
  "path",
  "goal",
  "rise",
  "bloom",
  "dash",
  "flash",
  "glow",
  "jump",
  "leap",
  "pulse",
  "rush",
  "shine",
  "soar",
  "surge",
  "thrive",
  "vault",
  "voyage",
  "zenith",
]

function generateRandomUsername(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 100)
  // Capitalize first letter of each word
  return `${adj.charAt(0).toUpperCase()}${adj.slice(1)}${noun.charAt(0).toUpperCase()}${noun.slice(1)}${num}`
}

// Get current user's profile (creates one with random username if missing)
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const user = await ctx.db.get(userId)
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    // Get avatar URL if exists
    let avatarUrl: string | null = null
    if (profile?.avatarId) {
      avatarUrl = await ctx.storage.getUrl(profile.avatarId)
    }

    // If no profile exists, indicate we need one (will be created via mutation)
    const needsProfile = !profile

    return {
      userId,
      email: user?.email,
      username: profile?.username,
      avatarUrl,
      bio: profile?.bio,
      needsProfile,
    }
  },
})

// Get any user's public profile
export const getProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) return null

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    let avatarUrl: string | null = null
    if (profile?.avatarId) {
      avatarUrl = await ctx.storage.getUrl(profile.avatarId)
    }

    return {
      userId: args.userId,
      username: profile?.username || user?.name || user?.email?.split("@")[0],
      avatarUrl,
    }
  },
})

// Update username
export const updateUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const username = args.username.trim()
    if (!username) throw new Error("Username cannot be empty")
    if (username.length > 30) throw new Error("Username too long")
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      throw new Error("Username can only contain letters, numbers, _ and -")
    }

    // Check if username is taken (case insensitive)
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_username", (q) => q.eq("username", username.toLowerCase()))
      .first()

    if (existing && existing.userId !== userId) {
      throw new Error("Username already taken")
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    if (profile) {
      await ctx.db.patch(profile._id, {
        username: username.toLowerCase(),
        updatedAt: Date.now(),
      })
    } else {
      await ctx.db.insert("userProfiles", {
        userId,
        username: username.toLowerCase(),
        updatedAt: Date.now(),
      })
    }

    return { success: true }
  },
})

// Generate upload URL for avatar
export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")
    return await ctx.storage.generateUploadUrl()
  },
})

// Update avatar
export const updateAvatar = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    // Delete old avatar if exists
    if (profile?.avatarId) {
      await ctx.storage.delete(profile.avatarId)
    }

    if (profile) {
      await ctx.db.patch(profile._id, {
        avatarId: args.storageId,
        updatedAt: Date.now(),
      })
    } else {
      await ctx.db.insert("userProfiles", {
        userId,
        avatarId: args.storageId,
        updatedAt: Date.now(),
      })
    }

    return { success: true }
  },
})

// Remove avatar
export const removeAvatar = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    if (profile?.avatarId) {
      await ctx.storage.delete(profile.avatarId)
      await ctx.db.patch(profile._id, {
        avatarId: undefined,
        updatedAt: Date.now(),
      })
    }

    return { success: true }
  },
})

// Ensure user has a profile with random username (called on first activity)
export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    if (existingProfile) {
      return { username: existingProfile.username }
    }

    // Generate unique username
    let username = generateRandomUsername()
    let attempts = 0
    while (attempts < 10) {
      const taken = await ctx.db
        .query("userProfiles")
        .withIndex("by_username", (q) => q.eq("username", username.toLowerCase()))
        .first()
      if (!taken) break
      username = generateRandomUsername()
      attempts++
    }

    await ctx.db.insert("userProfiles", {
      userId,
      username: username.toLowerCase(),
      updatedAt: Date.now(),
    })

    return { username: username.toLowerCase() }
  },
})
