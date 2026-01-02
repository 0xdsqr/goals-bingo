import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { mutation } from "./_generated/server"

export const update = mutation({
  args: {
    id: v.id("goals"),
    text: v.optional(v.string()),
    isCompleted: v.optional(v.boolean()),
    isStreakGoal: v.optional(v.boolean()),
    streakTargetDays: v.optional(v.number()),
    streakStartDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")
    const goal = await ctx.db.get(args.id)
    if (!goal || goal.userId !== userId) throw new Error("Goal not found")

    const now = Date.now()
    const wasCompleted = goal.isCompleted

    // If enabling streak goal, set start date to now if not provided
    const streakStartDate =
      args.isStreakGoal && !goal.isStreakGoal
        ? (args.streakStartDate ?? now)
        : args.streakStartDate

    await ctx.db.patch(args.id, {
      ...(args.text !== undefined && { text: args.text }),
      ...(args.isCompleted !== undefined && {
        isCompleted: args.isCompleted,
        completedAt: args.isCompleted ? now : undefined,
      }),
      ...(args.isStreakGoal !== undefined && {
        isStreakGoal: args.isStreakGoal,
      }),
      ...(args.streakTargetDays !== undefined && {
        streakTargetDays: args.streakTargetDays,
      }),
      ...(streakStartDate !== undefined && { streakStartDate }),
      updatedAt: now,
    })

    // Emit event if goal was just completed
    if (args.isCompleted && !wasCompleted) {
      const board = await ctx.db.get(goal.boardId)
      if (board) {
        // Check if all goals are now completed
        const allGoals = await ctx.db
          .query("goals")
          .withIndex("by_board", (q) => q.eq("boardId", goal.boardId))
          .collect()

        const allCompleted = allGoals.every((g) =>
          g._id === args.id ? true : g.isCompleted,
        )

        if (allCompleted) {
          await ctx.scheduler.runAfter(
            0,
            internal.boards.createEventFeedEntry,
            {
              userId,
              eventType: "board_completed",
              boardId: goal.boardId,
              boardName: board.name,
            },
          )
        } else {
          await ctx.scheduler.runAfter(
            0,
            internal.boards.createEventFeedEntry,
            {
              userId,
              eventType: "goal_completed",
              boardId: goal.boardId,
              boardName: board.name,
            },
          )
        }
      }
    }
  },
})

export const resetStreak = mutation({
  args: { id: v.id("goals") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")
    const goal = await ctx.db.get(args.id)
    if (!goal || goal.userId !== userId) throw new Error("Goal not found")
    if (!goal.isStreakGoal) throw new Error("Not a streak goal")

    const now = Date.now()
    await ctx.db.patch(args.id, {
      streakStartDate: now,
      isCompleted: false,
      completedAt: undefined,
      updatedAt: now,
    })
  },
})

export const toggleComplete = mutation({
  args: { id: v.id("goals") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")
    const goal = await ctx.db.get(args.id)
    if (!goal || goal.userId !== userId) throw new Error("Goal not found")

    const now = Date.now()
    const isCompleted = !goal.isCompleted
    await ctx.db.patch(args.id, {
      isCompleted,
      completedAt: isCompleted ? now : undefined,
      updatedAt: now,
    })

    // Emit event if goal was just completed
    if (isCompleted) {
      const board = await ctx.db.get(goal.boardId)
      if (board) {
        // Check if all goals are now completed
        const allGoals = await ctx.db
          .query("goals")
          .withIndex("by_board", (q) => q.eq("boardId", goal.boardId))
          .collect()

        const allCompleted = allGoals.every((g) =>
          g._id === args.id ? true : g.isCompleted,
        )

        if (allCompleted) {
          await ctx.scheduler.runAfter(
            0,
            internal.boards.createEventFeedEntry,
            {
              userId,
              eventType: "board_completed",
              boardId: goal.boardId,
              boardName: board.name,
            },
          )
        } else {
          await ctx.scheduler.runAfter(
            0,
            internal.boards.createEventFeedEntry,
            {
              userId,
              eventType: "goal_completed",
              boardId: goal.boardId,
              boardName: board.name,
            },
          )
        }
      }
    }
  },
})
