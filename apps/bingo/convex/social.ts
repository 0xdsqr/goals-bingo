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

    return enriched.sort((a, b) => b.createdAt - a.createdAt)
  },
})

// ============================================
// Private Communities
// ============================================

// Create a new private community
export const createCommunity = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const name = args.name.trim()
    if (!name) throw new Error("Name cannot be empty")
    if (name.length > 50) throw new Error("Name too long")

    // Generate invite code
    const inviteCode = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((b) => b.toString(36))
      .join("")
      .slice(0, 8)
      .toUpperCase()

    const now = Date.now()
    const communityId = await ctx.db.insert("communities", {
      name,
      ownerId: userId,
      inviteCode,
      createdAt: now,
    })

    // Add owner as first member
    await ctx.db.insert("communityMembers", {
      communityId,
      userId,
      joinedAt: now,
    })

    return { communityId, inviteCode }
  },
})

// Get communities the user is a member of
export const getMyCommunities = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    // Get all memberships
    const memberships = await ctx.db
      .query("communityMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()

    // Get community details with member counts
    const communities = await Promise.all(
      memberships.map(async (membership) => {
        const community = await ctx.db.get(membership.communityId)
        if (!community) return null

        const members = await ctx.db
          .query("communityMembers")
          .withIndex("by_community", (q) =>
            q.eq("communityId", membership.communityId),
          )
          .collect()

        return {
          ...community,
          memberCount: members.length,
          isOwner: community.ownerId === userId,
        }
      }),
    )

    return communities.filter((c) => c !== null)
  },
})

// Get community details (for members only)
export const getCommunity = query({
  args: { communityId: v.id("communities") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    // Check membership
    const membership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community", (q) => q.eq("communityId", args.communityId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first()

    if (!membership) return null

    const community = await ctx.db.get(args.communityId)
    if (!community) return null

    const members = await ctx.db
      .query("communityMembers")
      .withIndex("by_community", (q) => q.eq("communityId", args.communityId))
      .collect()

    // Get member details
    const memberDetails = await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId)
        return {
          ...m,
          userName: user?.name || user?.email || "Anonymous",
        }
      }),
    )

    return {
      ...community,
      members: memberDetails,
      memberCount: members.length,
      isOwner: community.ownerId === userId,
    }
  },
})

// Join community via invite code
export const joinCommunity = mutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const code = args.inviteCode.trim().toUpperCase()

    const community = await ctx.db
      .query("communities")
      .withIndex("by_invite", (q) => q.eq("inviteCode", code))
      .first()

    if (!community) throw new Error("Invalid invite code")

    // Check if already a member
    const existing = await ctx.db
      .query("communityMembers")
      .withIndex("by_community", (q) => q.eq("communityId", community._id))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first()

    if (existing) {
      return { communityId: community._id, alreadyMember: true }
    }

    await ctx.db.insert("communityMembers", {
      communityId: community._id,
      userId,
      joinedAt: Date.now(),
    })

    return { communityId: community._id, alreadyMember: false }
  },
})

// Leave community
export const leaveCommunity = mutation({
  args: { communityId: v.id("communities") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const community = await ctx.db.get(args.communityId)
    if (!community) throw new Error("Community not found")

    // Owner cannot leave (must delete)
    if (community.ownerId === userId) {
      throw new Error("Owner cannot leave. Delete the community instead.")
    }

    const membership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community", (q) => q.eq("communityId", args.communityId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first()

    if (membership) {
      await ctx.db.delete(membership._id)
    }
  },
})

// Delete community (owner only)
export const deleteCommunity = mutation({
  args: { communityId: v.id("communities") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const community = await ctx.db.get(args.communityId)
    if (!community) throw new Error("Community not found")

    if (community.ownerId !== userId) {
      throw new Error("Only the owner can delete the community")
    }

    // Delete all memberships
    const memberships = await ctx.db
      .query("communityMembers")
      .withIndex("by_community", (q) => q.eq("communityId", args.communityId))
      .collect()

    for (const m of memberships) {
      await ctx.db.delete(m._id)
    }

    // Delete community
    await ctx.db.delete(args.communityId)
  },
})

// Get community event feed
export const getCommunityFeed = query({
  args: { communityId: v.id("communities") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    // Check membership
    const membership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community", (q) => q.eq("communityId", args.communityId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first()

    if (!membership) return []

    // Get all member user IDs
    const members = await ctx.db
      .query("communityMembers")
      .withIndex("by_community", (q) => q.eq("communityId", args.communityId))
      .collect()
    const memberUserIds = new Set(members.map((m) => m.userId))

    // Get recent events from members
    const events = await ctx.db
      .query("eventFeed")
      .withIndex("by_created")
      .order("desc")
      .take(100)

    // Filter to members only and enrich
    const enrichedEvents = await Promise.all(
      events
        .filter((e) => memberUserIds.has(e.userId) && !e.voidedAt)
        .slice(0, 30)
        .map(async (event) => {
          const user = await ctx.db.get(event.userId)

          let shareId: string | undefined
          if (event.boardId) {
            const board = await ctx.db.get(event.boardId)
            shareId = board?.shareId
          }

          const reactions = await ctx.db
            .query("reactions")
            .withIndex("by_event", (q) => q.eq("eventId", event._id))
            .collect()
          const upCount = reactions.filter((r) => r.type === "up").length
          const downCount = reactions.filter((r) => r.type === "down").length
          const userReaction = reactions.find((r) => r.userId === userId)?.type

          const comments = await ctx.db
            .query("comments")
            .withIndex("by_event", (q) => q.eq("eventId", event._id))
            .collect()

          return {
            ...event,
            userName: user?.name || user?.email || "Anonymous",
            shareId,
            upCount,
            downCount,
            userReaction,
            commentCount: comments.length,
          }
        }),
    )

    return enrichedEvents
  },
})

// Generate new invite code (owner or any member for now)
export const regenerateInviteCode = mutation({
  args: { communityId: v.id("communities") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    // Check membership
    const membership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community", (q) => q.eq("communityId", args.communityId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first()

    if (!membership) throw new Error("Not a member")

    const newCode = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((b) => b.toString(36))
      .join("")
      .slice(0, 8)
      .toUpperCase()

    await ctx.db.patch(args.communityId, { inviteCode: newCode })

    return { inviteCode: newCode }
  },
})
