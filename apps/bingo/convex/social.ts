import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Toggle reaction (up/down) on an event
export const toggleReaction = mutation({
  args: {
    eventId: v.id("eventFeed"),
    type: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    // Check if user already reacted
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", userId).eq("eventId", args.eventId),
      )
      .first()

    if (existing) {
      if (existing.type === args.type) {
        // Same reaction - remove it (toggle off)
        await ctx.db.delete(existing._id)
        return { action: "removed" }
      } else {
        // Different reaction - update it
        await ctx.db.patch(existing._id, { type: args.type })
        return { action: "changed" }
      }
    } else {
      // No existing reaction - create new
      await ctx.db.insert("reactions", {
        eventId: args.eventId,
        userId,
        type: args.type,
        createdAt: Date.now(),
      })
      return { action: "added" }
    }
  },
})

// Get reactions for an event
export const getReactions = query({
  args: { eventId: v.id("eventFeed") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)

    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect()

    const upCount = reactions.filter((r) => r.type === "up").length
    const downCount = reactions.filter((r) => r.type === "down").length
    const userReaction = userId
      ? reactions.find((r) => r.userId === userId)?.type
      : undefined

    return { upCount, downCount, userReaction }
  },
})

// Add comment to an event
export const addComment = mutation({
  args: {
    eventId: v.id("eventFeed"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const text = args.text.trim()
    if (!text) throw new Error("Comment cannot be empty")
    if (text.length > 500) throw new Error("Comment too long")

    return await ctx.db.insert("comments", {
      eventId: args.eventId,
      userId,
      text,
      createdAt: Date.now(),
    })
  },
})

// Delete own comment
export const deleteComment = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const comment = await ctx.db.get(args.commentId)
    if (!comment) throw new Error("Comment not found")
    if (comment.userId !== userId) throw new Error("Not your comment")

    await ctx.db.delete(args.commentId)
  },
})

// Get comments for an event
export const getComments = query({
  args: { eventId: v.id("eventFeed") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect()

    // Enrich with user names
    const enriched = await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId)
        return {
          ...comment,
          userName: user?.name || user?.email || "Anonymous",
        }
      }),
    )

    return enriched.sort((a, b) => a.createdAt - b.createdAt)
  },
})
