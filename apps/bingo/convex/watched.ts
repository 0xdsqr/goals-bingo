import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { mutation, type QueryCtx, query } from "./_generated/server"

// Helper to get display name for a user
async function getDisplayName(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<string> {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first()
  if (profile?.username) return profile.username

  const user = await ctx.db.get(userId)
  return user?.name || "Anonymous"
}

// Watch a board
export const watchBoard = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    // Check if board exists
    const board = await ctx.db.get(args.boardId)
    if (!board) throw new Error("Board not found")

    // Can't watch your own board
    if (board.userId === userId) {
      throw new Error("You can't watch your own board")
    }

    // Check if already watching
    const existing = await ctx.db
      .query("watchedBoards")
      .withIndex("by_user_board", (q) =>
        q.eq("userId", userId).eq("boardId", args.boardId),
      )
      .first()

    if (existing) {
      return { alreadyWatching: true }
    }

    await ctx.db.insert("watchedBoards", {
      userId,
      boardId: args.boardId,
      createdAt: Date.now(),
    })

    return { success: true }
  },
})

// Unwatch a board
export const unwatchBoard = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db
      .query("watchedBoards")
      .withIndex("by_user_board", (q) =>
        q.eq("userId", userId).eq("boardId", args.boardId),
      )
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)
    }

    return { success: true }
  },
})

// Check if user is watching a specific board
export const isWatching = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return false

    const existing = await ctx.db
      .query("watchedBoards")
      .withIndex("by_user_board", (q) =>
        q.eq("userId", userId).eq("boardId", args.boardId),
      )
      .first()

    return !!existing
  },
})

// Get all watched boards with their details
export const getWatchedBoards = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const watched = await ctx.db
      .query("watchedBoards")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()

    // Enrich with board details
    const enrichedBoards = await Promise.all(
      watched.map(async (w) => {
        const board = await ctx.db.get(w.boardId)
        if (!board) return null // Board was deleted

        // Get owner name
        const ownerName = await getDisplayName(ctx, board.userId)

        // Get goals for completion stats
        const goals = await ctx.db
          .query("goals")
          .withIndex("by_board", (q) => q.eq("boardId", board._id))
          .collect()

        const nonFreeSpaceGoals = goals.filter((g) => !g.isFreeSpace)
        const completedGoals = nonFreeSpaceGoals.filter(
          (g) => g.isCompleted,
        ).length
        const totalGoals = nonFreeSpaceGoals.length
        const completionPercent =
          totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0

        return {
          ...board,
          watchedAt: w.createdAt,
          ownerName,
          completedGoals,
          totalGoals,
          completionPercent,
        }
      }),
    )

    return enrichedBoards.filter((b) => b !== null)
  },
})

// Get activity feed for watched boards only
export const getWatchedFeed = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    // Get watched board IDs
    const watched = await ctx.db
      .query("watchedBoards")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()

    if (watched.length === 0) return []

    const watchedBoardIds = new Set(watched.map((w) => w.boardId.toString()))

    // Get recent events
    const events = await ctx.db
      .query("eventFeed")
      .withIndex("by_created")
      .order("desc")
      .take(100)

    // Filter to only events from watched boards
    const watchedEvents = events.filter(
      (e) => e.boardId && watchedBoardIds.has(e.boardId.toString()),
    )

    // Enrich with user info
    const enrichedEvents = await Promise.all(
      watchedEvents.slice(0, 20).map(async (event) => {
        // Get user profile
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", event.userId))
          .first()

        let avatarUrl: string | null = null
        if (profile?.avatarId) {
          avatarUrl = await ctx.storage.getUrl(profile.avatarId)
        }

        const user = await ctx.db.get(event.userId)
        const userName = profile?.username || user?.name || "Anonymous"

        // Get board shareId
        let shareId: string | undefined
        if (event.boardId) {
          const board = await ctx.db.get(event.boardId)
          shareId = board?.shareId
        }

        // Get reaction counts
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect()
        const upCount = reactions.filter((r) => r.type === "up").length
        const downCount = reactions.filter((r) => r.type === "down").length
        const userReaction = reactions.find((r) => r.userId === userId)?.type

        // Get comment count
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect()

        return {
          ...event,
          userName,
          avatarUrl,
          shareId,
          upCount,
          downCount,
          userReaction,
          commentCount: comments.length,
        }
      }),
    )

    return enrichedEvents.filter((e) => !e.voidedAt)
  },
})
