export interface Goal {
  id: string;
  text: string;
  position: number;
  isCompleted: boolean;
  isFreeSpace?: boolean;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  size: number;
  goals: Goal[];
  createdAt: number;
  updatedAt: number;
}

export type BoardSize = 5; // BINGO is always 5x5

export const BINGO_LETTERS = ["B", "I", "N", "G", "O"] as const;

// Fun random board name generator
const ADJECTIVES = [
  "Epic", "Stellar", "Cosmic", "Mighty", "Radiant", "Bold", "Swift", "Vibrant",
  "Fierce", "Noble", "Daring", "Blazing", "Thunder", "Golden", "Crystal", "Shadow",
  "Phoenix", "Dragon", "Mystic", "Turbo", "Ultra", "Mega", "Super", "Hyper"
];

const NOUNS = [
  "Quest", "Journey", "Mission", "Adventure", "Challenge", "Sprint", "Marathon",
  "Odyssey", "Voyage", "Expedition", "Crusade", "Campaign", "Pursuit", "Endeavor",
  "Goals", "Dreams", "Ambitions", "Targets", "Victories", "Triumphs", "Wins"
];

export const generateBoardName = (): string => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
};

export const createEmptyBoard = (size: BoardSize = 5): Goal[] => {
  const centerPosition = Math.floor((size * size) / 2); // Position 12 for 5x5
  return Array.from({ length: size * size }, (_, i) => ({
    id: crypto.randomUUID(),
    text: i === centerPosition ? "FREE SPACE" : "",
    position: i,
    isCompleted: i === centerPosition, // Free space is always completed
    isFreeSpace: i === centerPosition,
  }));
};

export const checkBingo = (goals: Goal[], size: number): boolean => {
  const completed = new Set(
    goals.filter((g) => g.isCompleted).map((g) => g.position)
  );

  const indices = Array.from({ length: size }, (_, i) => i);

  // Check rows
  const hasRowBingo = indices.some((row) =>
    indices.every((col) => completed.has(row * size + col))
  );
  if (hasRowBingo) return true;

  // Check columns
  const hasColBingo = indices.some((col) =>
    indices.every((row) => completed.has(row * size + col))
  );
  if (hasColBingo) return true;

  // Check diagonals
  const hasDiag1 = indices.every((i) => completed.has(i * size + i));
  const hasDiag2 = indices.every((i) => completed.has(i * size + (size - 1 - i)));

  return hasDiag1 || hasDiag2;
};
