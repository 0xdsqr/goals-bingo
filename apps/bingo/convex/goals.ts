import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { mutation } from "./_generated/server"

// Check if goals form a BINGO (row, column, or diagonal)
function checkBingo(
  goals: Array<{ position: number; isCompleted: boolean }>,
  size: number,
): boolean {
  const completed = new Set(
    goals.filter((g) => g.isCompleted).map((g) => g.position),
  )

  const indices = Array.from({ length: size }, (_, i) => i)

  // Check rows
  const hasRowBingo = indices.some((row) =>
    indices.every((col) => completed.has(row * size + col)),
  )
  if (hasRowBingo) return true

  // Check columns
  const hasColBingo = indices.some((col) =>
    indices.every((row) => completed.has(row * size + col)),
  )
  if (hasColBingo) return true

  // Check diagonals
  const hasDiag1 = indices.every((i) => completed.has(i * size + i))
  const hasDiag2 = indices.every((i) =>
    completed.has(i * size + (size - 1 - i)),
  )

  return hasDiag1 || hasDiag2
}

export const update = mutation({
  args: {
    id: v.id("goals"),
    text: v.optional(v.string()),
    isCompleted: v.optional(v.boolean()),
    isStreakGoal: v.optional(v.boolean()),
    streakTargetDays: v.optional(v.number()),
    streakStartDate: v.optional(v.number()),
    isProgressGoal: v.optional(v.boolean()),
    progressTarget: v.optional(v.number()),
    progressCurrent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")
    const goal = await ctx.db.get(args.id)
    if (!goal || goal.userId !== userId) throw new Error("Goal not found")

    const now = Date.now()
    const wasCompleted = goal.isCompleted

    // If enabling streak goal, set start date to now if not provided
    const isNewStreakGoal = args.isStreakGoal && !goal.isStreakGoal
    const streakStartDate = isNewStreakGoal
      ? (args.streakStartDate ?? now)
      : args.streakStartDate

    // If enabling progress goal, set current to 0 if not provided
    const isNewProgressGoal = args.isProgressGoal && !goal.isProgressGoal
    const progressCurrent = isNewProgressGoal
      ? (args.progressCurrent ?? 0)
      : args.progressCurrent

    // Check if progress goal just hit target
    const progressTarget = args.progressTarget ?? goal.progressTarget
    const oldProgress = goal.progressCurrent ?? 0
    const newProgress = progressCurrent ?? goal.progressCurrent ?? 0
    const progressJustCompleted =
      goal.isProgressGoal &&
      progressTarget &&
      oldProgress < progressTarget &&
      newProgress >= progressTarget

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
      ...(args.isProgressGoal !== undefined && {
        isProgressGoal: args.isProgressGoal,
      }),
      ...(args.progressTarget !== undefined && {
        progressTarget: args.progressTarget,
      }),
      ...(progressCurrent !== undefined && { progressCurrent }),
      // Auto-complete progress goals when target is reached
      ...(progressJustCompleted && {
        isCompleted: true,
        completedAt: now,
      }),
      updatedAt: now,
    })

    // Emit event if goal was just completed
    if (args.isCompleted && !wasCompleted) {
      const board = await ctx.db.get(goal.boardId)
      if (board) {
        // Get all goals to check for bingo/completion
        const allGoals = await ctx.db
          .query("goals")
          .withIndex("by_board", (q) => q.eq("boardId", goal.boardId))
          .collect()

        // Update the current goal's status for checks
        const goalsWithUpdate = allGoals.map((g) =>
          g._id === args.id ? { ...g, isCompleted: true } : g,
        )

        const allCompleted = goalsWithUpdate.every((g) => g.isCompleted)

        // Check for new BINGO (wasn't bingo before, is now)
        const wasBingo = checkBingo(allGoals, board.size)
        const isBingo = checkBingo(goalsWithUpdate, board.size)
        const gotNewBingo = !wasBingo && isBingo

        if (allCompleted) {
          await ctx.scheduler.runAfter(
            0,
            internal.boards.createEventFeedEntry,
            {
              userId,
              eventType: "board_completed",
              boardId: goal.boardId,
              goalId: args.id,
              boardName: board.name,
            },
          )
        } else if (gotNewBingo) {
          // BINGO! They got a line
          await ctx.scheduler.runAfter(
            0,
            internal.boards.createEventFeedEntry,
            {
              userId,
              eventType: "bingo",
              boardId: goal.boardId,
              goalId: args.id,
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
              goalId: args.id,
              boardName: board.name,
            },
          )
        }
      }
    }

    // Void event if goal was uncompleted
    if (!args.isCompleted && wasCompleted) {
      await ctx.scheduler.runAfter(0, internal.boards.voidGoalEvent, {
        goalId: args.id,
      })
    }

    // Emit streak_started event when enabling a streak goal
    if (isNewStreakGoal) {
      const board = await ctx.db.get(goal.boardId)
      if (board) {
        await ctx.scheduler.runAfter(0, internal.boards.createEventFeedEntry, {
          userId,
          eventType: "streak_started",
          boardId: goal.boardId,
          goalId: args.id,
          boardName: board.name,
          goalText: args.text || goal.text,
          metadata: JSON.stringify({
            targetDays: args.streakTargetDays || goal.streakTargetDays,
          }),
        })
      }
    }

    // Emit progress_updated event when progress goal is completed
    if (progressJustCompleted) {
      const board = await ctx.db.get(goal.boardId)
      if (board) {
        await ctx.scheduler.runAfter(0, internal.boards.createEventFeedEntry, {
          userId,
          eventType: "goal_completed",
          boardId: goal.boardId,
          goalId: args.id,
          boardName: board.name,
          goalText: args.text || goal.text,
          metadata: JSON.stringify({
            progressTarget,
            progressCurrent: newProgress,
          }),
        })
      }
    }
  },
})

export const incrementProgress = mutation({
  args: {
    id: v.id("goals"),
    delta: v.optional(v.number()), // defaults to 1
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")
    const goal = await ctx.db.get(args.id)
    if (!goal || goal.userId !== userId) throw new Error("Goal not found")
    if (!goal.isProgressGoal) throw new Error("Not a progress goal")

    const now = Date.now()
    const delta = args.delta ?? 1
    const oldProgress = goal.progressCurrent ?? 0
    const newProgress = Math.max(0, oldProgress + delta)
    const target = goal.progressTarget ?? 1
    const justCompleted = oldProgress < target && newProgress >= target

    await ctx.db.patch(args.id, {
      progressCurrent: newProgress,
      ...(justCompleted && {
        isCompleted: true,
        completedAt: now,
      }),
      updatedAt: now,
    })

    // Emit event when goal is completed via progress
    if (justCompleted) {
      const board = await ctx.db.get(goal.boardId)
      if (board) {
        await ctx.scheduler.runAfter(0, internal.boards.createEventFeedEntry, {
          userId,
          eventType: "goal_completed",
          boardId: goal.boardId,
          goalId: args.id,
          boardName: board.name,
          goalText: goal.text,
          metadata: JSON.stringify({
            progressTarget: target,
            progressCurrent: newProgress,
          }),
        })
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

    // Calculate how many days the streak was before reset
    const now = Date.now()
    const previousDays = goal.streakStartDate
      ? Math.floor((now - goal.streakStartDate) / (1000 * 60 * 60 * 24))
      : 0

    await ctx.db.patch(args.id, {
      streakStartDate: now,
      isCompleted: false,
      completedAt: undefined,
      updatedAt: now,
    })

    // Emit streak_reset event (the shame!)
    const board = await ctx.db.get(goal.boardId)
    if (board) {
      await ctx.scheduler.runAfter(0, internal.boards.createEventFeedEntry, {
        userId,
        eventType: "streak_reset",
        boardId: goal.boardId,
        goalId: args.id,
        boardName: board.name,
        goalText: goal.text,
        metadata: JSON.stringify({ previousDays }),
      })
    }
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
        // Get all goals to check for bingo/completion
        const allGoals = await ctx.db
          .query("goals")
          .withIndex("by_board", (q) => q.eq("boardId", goal.boardId))
          .collect()

        // Update the current goal's status for checks
        const goalsWithUpdate = allGoals.map((g) =>
          g._id === args.id ? { ...g, isCompleted: true } : g,
        )

        const allCompleted = goalsWithUpdate.every((g) => g.isCompleted)

        // Check for new BINGO
        const wasBingo = checkBingo(allGoals, board.size)
        const isBingo = checkBingo(goalsWithUpdate, board.size)
        const gotNewBingo = !wasBingo && isBingo

        if (allCompleted) {
          await ctx.scheduler.runAfter(
            0,
            internal.boards.createEventFeedEntry,
            {
              userId,
              eventType: "board_completed",
              boardId: goal.boardId,
              goalId: args.id,
              boardName: board.name,
            },
          )
        } else if (gotNewBingo) {
          await ctx.scheduler.runAfter(
            0,
            internal.boards.createEventFeedEntry,
            {
              userId,
              eventType: "bingo",
              boardId: goal.boardId,
              goalId: args.id,
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
              goalId: args.id,
              boardName: board.name,
            },
          )
        }
      }
    } else {
      // Void event if goal was uncompleted
      await ctx.scheduler.runAfter(0, internal.boards.voidGoalEvent, {
        goalId: args.id,
      })
    }
  },
})
