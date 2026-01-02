import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  ...authTables,

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
    ),
    boardId: v.optional(v.id("boards")),
    boardName: v.string(),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),
})
