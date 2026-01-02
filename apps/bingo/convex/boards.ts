import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";
import { action, internalMutation, mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const boards = await ctx.db
      .query("boards")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Enrich boards with goal completion stats
    const enrichedBoards = await Promise.all(
      boards.map(async (board) => {
        const goals = await ctx.db
          .query("goals")
          .withIndex("by_board", (q) => q.eq("boardId", board._id))
          .collect();

        const totalGoals = goals.length;
        const completedGoals = goals.filter((g) => g.isCompleted).length;
        // Exclude free space from percentage calculation
        const nonFreeSpaceGoals = goals.filter((g) => !g.isFreeSpace);
        const nonFreeSpaceCompleted = nonFreeSpaceGoals.filter(
          (g) => g.isCompleted,
        ).length;
        const completionPercent =
          nonFreeSpaceGoals.length > 0
            ? Math.round(
                (nonFreeSpaceCompleted / nonFreeSpaceGoals.length) * 100,
              )
            : 0;

        return {
          ...board,
          totalGoals,
          completedGoals,
          completionPercent,
        };
      }),
    );

    return enrichedBoards;
  },
});

export const get = query({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const board = await ctx.db.get(args.id);
    if (!board || board.userId !== userId) return null;
    return board;
  },
});

// Generate a share link for a board
export const generateShareLink = mutation({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.id);
    if (!board || board.userId !== userId) throw new Error("Board not found");

    // If already has a shareId, return it
    if (board.shareId) {
      return { shareId: board.shareId };
    }

    // Generate a unique share ID (nanoid-style)
    const shareId = Array.from(crypto.getRandomValues(new Uint8Array(10)))
      .map((b) => b.toString(36))
      .join("")
      .slice(0, 12);

    await ctx.db.patch(args.id, { shareId });
    return { shareId };
  },
});

// Remove share link from a board
export const removeShareLink = mutation({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.id);
    if (!board || board.userId !== userId) throw new Error("Board not found");

    await ctx.db.patch(args.id, { shareId: undefined });
    return { success: true };
  },
});

// Get a shared board by shareId (public, no auth required)
export const getSharedBoard = query({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const board = await ctx.db
      .query("boards")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first();

    if (!board) return null;

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_board", (q) => q.eq("boardId", board._id))
      .collect();

    // Get owner name
    const owner = await ctx.db.get(board.userId);

    return {
      ...board,
      goals,
      ownerName: owner?.name || owner?.email || "Anonymous",
    };
  },
});

// Get boards from community members (users who opted into event feed)
export const getCommunityBoards = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Check if current user is opted in
    const userOptIn = await ctx.db
      .query("eventFeedOptIn")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!userOptIn) return [];

    // Get all opted-in users
    const optIns = await ctx.db.query("eventFeedOptIn").collect();
    const optedInUserIds = optIns.map((o) => o.userId);

    // Get boards from opted-in users (excluding current user's boards)
    const allBoards = await ctx.db.query("boards").collect();
    const communityBoards = allBoards.filter(
      (board) =>
        optedInUserIds.includes(board.userId) && board.userId !== userId,
    );

    // Enrich with owner names
    const enrichedBoards = await Promise.all(
      communityBoards.map(async (board) => {
        const owner = await ctx.db.get(board.userId);
        return {
          ...board,
          ownerName: owner?.name || owner?.email || "Anonymous",
        };
      }),
    );

    // Sort by most recent
    return enrichedBoards
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20);
  },
});

// Get a community board with goals (for opted-in community members)
export const getCommunityBoardWithGoals = query({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Check if current user is opted in
    const userOptIn = await ctx.db
      .query("eventFeedOptIn")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!userOptIn) return null;

    const board = await ctx.db.get(args.id);
    if (!board) return null;

    // Check if board owner is opted in
    const ownerOptIn = await ctx.db
      .query("eventFeedOptIn")
      .withIndex("by_user", (q) => q.eq("userId", board.userId))
      .first();

    if (!ownerOptIn) return null;

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_board", (q) => q.eq("boardId", board._id))
      .collect();

    const owner = await ctx.db.get(board.userId);

    return {
      ...board,
      goals,
      ownerName: owner?.name || owner?.email || "Anonymous",
    };
  },
});

export const getWithGoals = query({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const board = await ctx.db.get(args.id);
    if (!board || board.userId !== userId) return null;
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_board", (q) => q.eq("boardId", args.id))
      .collect();
    return { ...board, goals };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    size: v.number(),
    year: v.optional(v.number()),
    goals: v.optional(
      v.array(
        v.object({
          text: v.string(),
          position: v.number(),
          isCompleted: v.boolean(),
          isFreeSpace: v.optional(v.boolean()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const year = args.year ?? new Date().getFullYear();
    const boardId = await ctx.db.insert("boards", {
      userId,
      name: args.name,
      description: args.description,
      size: args.size,
      year,
      createdAt: now,
      updatedAt: now,
    });

    const totalCells = args.size * args.size;
    const centerPosition = Math.floor(totalCells / 2);
    const positions = Array.from({ length: totalCells }, (_, i) => i);

    await Promise.all(
      positions.map((position) => {
        const existingGoal = args.goals?.find((g) => g.position === position);
        const isFreeSpace =
          existingGoal?.isFreeSpace ?? position === centerPosition;
        return ctx.db.insert("goals", {
          boardId,
          userId,
          text: existingGoal?.text ?? (isFreeSpace ? "FREE SPACE" : ""),
          position,
          isCompleted: existingGoal?.isCompleted ?? isFreeSpace,
          isFreeSpace,
          createdAt: now,
          updatedAt: now,
        });
      }),
    );

    // Create event feed entry for board creation
    await ctx.scheduler.runAfter(0, internal.boards.createEventFeedEntry, {
      userId,
      eventType: "board_created",
      boardId,
      boardName: args.name,
    });

    return boardId;
  },
});

export const update = mutation({
  args: {
    id: v.id("boards"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    difficultySummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const board = await ctx.db.get(args.id);
    if (!board || board.userId !== userId) throw new Error("Board not found");

    await ctx.db.patch(args.id, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.difficulty !== undefined && { difficulty: args.difficulty }),
      ...(args.difficultySummary !== undefined && {
        difficultySummary: args.difficultySummary,
      }),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const board = await ctx.db.get(args.id);
    if (!board || board.userId !== userId) throw new Error("Board not found");

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_board", (q) => q.eq("boardId", args.id))
      .collect();

    await Promise.all(goals.map((goal) => ctx.db.delete(goal._id)));
    await ctx.db.delete(args.id);
  },
});

// Event Feed Opt-In Functions
export const getEventFeedStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { isOptedIn: false };

    const optIn = await ctx.db
      .query("eventFeedOptIn")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return { isOptedIn: !!optIn };
  },
});

export const toggleEventFeedOptIn = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existingOptIn = await ctx.db
      .query("eventFeedOptIn")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingOptIn) {
      await ctx.db.delete(existingOptIn._id);
      return { isOptedIn: false };
    } else {
      await ctx.db.insert("eventFeedOptIn", {
        userId,
        optedInAt: Date.now(),
      });
      return { isOptedIn: true };
    }
  },
});

export const getEventFeed = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Check if user is opted in
    const optIn = await ctx.db
      .query("eventFeedOptIn")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!optIn) return [];

    // Get recent events from opted-in users only
    const events = await ctx.db
      .query("eventFeed")
      .withIndex("by_created")
      .order("desc")
      .take(50);

    // Filter to only show events from opted-in users and enrich with user names
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        // Check if event creator is still opted in
        const creatorOptIn = await ctx.db
          .query("eventFeedOptIn")
          .withIndex("by_user", (q) => q.eq("userId", event.userId))
          .first();

        if (!creatorOptIn) return null;

        // Get user name
        const user = await ctx.db.get(event.userId);

        // Get board shareId if board exists
        let shareId: string | undefined;
        if (event.boardId) {
          const board = await ctx.db.get(event.boardId);
          shareId = board?.shareId;
        }

        return {
          ...event,
          userName: user?.name || user?.email || "Anonymous",
          shareId,
        };
      }),
    );

    return enrichedEvents.filter(Boolean).slice(0, 20);
  },
});

// Internal function to create event feed entries
export const createEventFeedEntry = internalMutation({
  args: {
    userId: v.id("users"),
    eventType: v.union(
      v.literal("board_created"),
      v.literal("goal_completed"),
      v.literal("board_completed"),
    ),
    boardId: v.optional(v.id("boards")),
    boardName: v.string(),
  },
  handler: async (ctx, args) => {
    // Only create event if user is opted in
    const optIn = await ctx.db
      .query("eventFeedOptIn")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!optIn) return null;

    return await ctx.db.insert("eventFeed", {
      userId: args.userId,
      eventType: args.eventType,
      boardId: args.boardId,
      boardName: args.boardName,
      createdAt: Date.now(),
    });
  },
});

// AI Difficulty Ranking Action
export const rankDifficulty = action({
  args: {
    goals: v.array(v.string()),
  },
  handler: async (_ctx, args) => {
    if (!args.goals || args.goals.length === 0) {
      return { ranking: "No goals provided to analyze." };
    }

    const openrouterToken = process.env.OPENROUTER_TOKEN;
    if (!openrouterToken) {
      return {
        ranking:
          "AI service not configured. Please add OPENROUTER_TOKEN to Convex environment variables.",
      };
    }

    try {
      const openai = new OpenAI({
        apiKey: openrouterToken,
        baseURL:
          "https://gateway.ai.cloudflare.com/v1/f8913f78ee578f0e62ccb9ad8a89c60f/goals-bingo/openrouter",
      });

      const goalsText = args.goals.map((g, i) => `${i + 1}. ${g}`).join("\n");

      const chatCompletion = await openai.chat.completions.create({
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a goal difficulty analyst. Analyze the provided bingo board goals and rate the overall difficulty. 
Be concise but insightful. Consider factors like:
- Time required
- Skill level needed  
- Resources required
- Emotional/mental challenge
- Dependencies on others

Provide a difficulty rating (Easy/Medium/Hard/Expert) and a brief 2-3 sentence explanation.`,
          },
          {
            role: "user",
            content: `Please analyze these bingo board goals:\n\n${goalsText}`,
          },
        ],
        max_tokens: 200,
      });

      const ranking =
        chatCompletion.choices[0]?.message?.content ||
        "Unable to analyze goals.";
      return { ranking };
    } catch (error) {
      console.error("AI ranking error:", error);
      return { ranking: "Failed to analyze goals. Please try again." };
    }
  },
});

// Generate upload URL for image
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

// Extract goals from uploaded image using vision AI
export const extractGoalsFromImage = action({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const openrouterToken = process.env.OPENROUTER_TOKEN;
    if (!openrouterToken) {
      return {
        success: false,
        error: "AI service not configured.",
        goals: [],
      };
    }

    try {
      // Get the image URL from storage
      const imageUrl = await ctx.storage.getUrl(args.storageId);
      if (!imageUrl) {
        return { success: false, error: "Image not found.", goals: [] };
      }

      const openai = new OpenAI({
        apiKey: openrouterToken,
        baseURL:
          "https://gateway.ai.cloudflare.com/v1/f8913f78ee578f0e62ccb9ad8a89c60f/goals-bingo/openrouter",
      });

      const response = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a goal extraction assistant. Extract goals from images of handwritten or typed goal lists.
Return ONLY a JSON array of strings, with each goal as a separate item. Extract up to 24 goals (for a 5x5 bingo board, excluding center free space).
If you see numbered items (1-10, etc), extract each as a separate goal.
Clean up the text but preserve the meaning. If you can't read something, skip it.
Return format: ["goal 1", "goal 2", ...]`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the goals from this image as a JSON array:",
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content || "[]";

      // Parse the JSON array from the response
      let goals: string[] = [];
      try {
        // Try to extract JSON array from the response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          goals = JSON.parse(jsonMatch[0]);
        }
      } catch {
        console.error("Failed to parse goals JSON:", content);
        return {
          success: false,
          error: "Failed to parse goals from image.",
          goals: [],
        };
      }

      // Clean up and limit to 24 goals
      goals = goals
        .filter((g) => typeof g === "string" && g.trim().length > 0)
        .map((g) => g.trim())
        .slice(0, 24);

      return { success: true, goals, error: null };
    } catch (error) {
      console.error("Vision AI error:", error);
      return {
        success: false,
        error: "Failed to extract goals from image.",
        goals: [],
      };
    }
  },
});
