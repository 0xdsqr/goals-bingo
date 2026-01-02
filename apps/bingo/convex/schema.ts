import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  ...authTables,

  // User profiles (extends auth users table)
  userProfiles: defineTable({
    userId: v.id("users"),
    username: v.optional(v.string()), // Display name
    avatarId: v.optional(v.id("_storage")), // Convex storage ID for avatar
    bio: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_username", ["username"]),

  boards: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    size: v.number(),
    year: v.number(), // Year the board is for (e.g., 2025, 2026)
    shareId: v.optional(v.string()), // Unique ID for public sharing
    difficulty: v.optional(v.string()), // AI difficulty rating (Easy/Medium/Hard/Expert)
    difficultySummary: v.optional(v.string()), // AI difficulty analysis
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_year", ["userId", "year"])
    .index("by_share_id", ["shareId"]),

  goals: defineTable({
    boardId: v.id("boards"),
    userId: v.id("users"),
    text: v.string(),
    position: v.number(),
    isCompleted: v.boolean(),
    isFreeSpace: v.optional(v.boolean()),
    completedAt: v.optional(v.number()),
    // Streak goal fields
    isStreakGoal: v.optional(v.boolean()),
    streakTargetDays: v.optional(v.number()), // e.g., 30, 60, 90
    streakStartDate: v.optional(v.number()), // timestamp when streak started
    // Progress goal fields (e.g., "Visit 5 restaurants" - 0/5, 1/5, etc.)
    isProgressGoal: v.optional(v.boolean()),
    progressTarget: v.optional(v.number()), // target count (e.g., 5)
    progressCurrent: v.optional(v.number()), // current count (e.g., 2)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_board", ["boardId"])
    .index("by_user", ["userId"]),

  // Event feed opt-in tracking
  eventFeedOptIn: defineTable({
    userId: v.id("users"),
    optedInAt: v.number(),
  }).index("by_user", ["userId"]),

  // Event feed for gamified community activity
  eventFeed: defineTable({
    userId: v.id("users"),
    eventType: v.union(
      v.literal("board_created"),
      v.literal("goal_completed"),
      v.literal("board_completed"),
      v.literal("streak_started"),
      v.literal("streak_reset"),
      v.literal("streak_milestone"), // 7d, 30d, 60d, 90d milestones
      v.literal("bingo"), // Got a BINGO line!
      v.literal("user_joined"), // First time joining community
      v.literal("progress_updated"), // Progress goal milestone (e.g., 3/5 restaurants visited)
    ),
    boardId: v.optional(v.id("boards")),
    goalId: v.optional(v.id("goals")),
    boardName: v.string(),
    goalText: v.optional(v.string()), // For streak events, show which goal
    metadata: v.optional(v.string()), // JSON for extra data (e.g., milestone days)
    communityId: v.optional(v.id("communities")), // null = public feed
    createdAt: v.number(),
    voidedAt: v.optional(v.number()),
  })
    .index("by_created", ["createdAt"])
    .index("by_goal", ["goalId"])
    .index("by_community", ["communityId", "createdAt"]),

  // Reactions on events (thumbs up/down)
  reactions: defineTable({
    eventId: v.id("eventFeed"),
    userId: v.id("users"),
    type: v.union(v.literal("up"), v.literal("down")),
    createdAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_user_event", ["userId", "eventId"]),

  // Comments on events
  comments: defineTable({
    eventId: v.id("eventFeed"),
    userId: v.id("users"),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_event", ["eventId"]),

  // Private communities (for future use)
  communities: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    inviteCode: v.string(),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_invite", ["inviteCode"]),

  // Community membership (for future use)
  communityMembers: defineTable({
    communityId: v.id("communities"),
    userId: v.id("users"),
    joinedAt: v.number(),
  })
    .index("by_community", ["communityId"])
    .index("by_user", ["userId"]),
})
