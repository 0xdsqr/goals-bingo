import { useCallback, useEffect, useState } from "react";
import type { BoardSize, Goal } from "./types";
import { createEmptyBoard, generateBoardName } from "./types";

const STORAGE_KEY = "goals-bingo-draft";

export interface DraftBoard {
  name: string;
  size: BoardSize;
  goals: Goal[];
  updatedAt: number;
}

const createDefaultBoard = (): DraftBoard => ({
  name: generateBoardName(),
  size: 5,
  goals: createEmptyBoard(5),
  updatedAt: Date.now(),
});

const getStoredBoard = (): DraftBoard => {
  if (typeof window === "undefined") return createDefaultBoard();
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return createDefaultBoard();
  try {
    const parsed = JSON.parse(stored) as DraftBoard;
    // Migrate old boards without name
    if (!parsed.name) {
      parsed.name = generateBoardName();
    }
    // Migrate old boards without free space
    if (!parsed.goals.some((g) => g.isFreeSpace)) {
      const centerPosition = Math.floor((parsed.size * parsed.size) / 2);
      parsed.goals = parsed.goals.map((g) => ({
        ...g,
        isFreeSpace: g.position === centerPosition,
        isCompleted: g.position === centerPosition ? true : g.isCompleted,
        text: g.position === centerPosition ? "FREE SPACE" : g.text,
      }));
    }
    return parsed;
  } catch {
    return createDefaultBoard();
  }
};

export const useLocalBoard = () => {
  const [board, setBoard] = useState<DraftBoard | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    const stored = getStoredBoard();
    setBoard(stored);
    setIsLoaded(true);
  }, []);

  const updateBoardName = useCallback((name: string) => {
    setBoard((current) => {
      if (!current) return current;
      const newBoard = {
        ...current,
        name,
        updatedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newBoard));
      return newBoard;
    });
  }, []);

  const regenerateName = useCallback(() => {
    const newName = generateBoardName();
    updateBoardName(newName);
    return newName;
  }, [updateBoardName]);

  const updateGoal = useCallback(
    (goalId: string, updates: Partial<Pick<Goal, "text" | "isCompleted">>) => {
      setBoard((current) => {
        if (!current) return current;
        const goal = current.goals.find((g) => g.id === goalId);
        // Don't allow updating free space
        if (goal?.isFreeSpace) return current;
        const newBoard = {
          ...current,
          goals: current.goals.map((g) =>
            g.id === goalId ? { ...g, ...updates } : g,
          ),
          updatedAt: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newBoard));
        return newBoard;
      });
    },
    [],
  );

  const toggleGoal = useCallback((goalId: string) => {
    setBoard((current) => {
      if (!current) return current;
      const goal = current.goals.find((g) => g.id === goalId);
      // Don't allow toggling free space
      if (!goal || goal.isFreeSpace) return current;
      const newBoard = {
        ...current,
        goals: current.goals.map((g) =>
          g.id === goalId ? { ...g, isCompleted: !g.isCompleted } : g,
        ),
        updatedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newBoard));
      return newBoard;
    });
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setBoard(createDefaultBoard());
  }, []);

  const getExportData = useCallback(
    () =>
      board?.goals.map((g) => ({
        text: g.text,
        position: g.position,
        isCompleted: g.isCompleted,
        isFreeSpace: g.isFreeSpace,
      })) ?? [],
    [board],
  );

  return {
    board,
    isLoaded,
    updateBoardName,
    regenerateName,
    updateGoal,
    toggleGoal,
    clear,
    getExportData,
  };
};
