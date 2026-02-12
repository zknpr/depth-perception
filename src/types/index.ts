// Represents a single event within a puzzle that the player must sort
export interface PuzzleEvent {
  id: string;
  text: string;
  date: string;
  url: string | null;
}

// A complete puzzle as returned by the API (events in shuffled order, no sort_date exposed)
export interface Puzzle {
  id: string;
  title: string;
  category: string;
  events: PuzzleEvent[];
}

// Result returned by the server after submitting an answer
export interface SubmitResult {
  won: boolean;
  score: number;
  correctOrder: string[];
  xpEarned: number;
  newAchievements: Achievement[];
}

// Achievement definition
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
}

// User achievement with unlock timestamp
export interface UserAchievement extends Achievement {
  unlockedAt: string;
}

// Player stats computed from game history
export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  avgSolveTimeMs: number;
  fastestSolveTimeMs: number | null;
  xp: number;
  level: number;
}

// Guest stats stored in localStorage before wallet connection
export interface GuestStats {
  gamesPlayed: number;
  wins: number;
  currentStreak: number;
  bestStreak: number;
  results: GuestGameResult[];
}

// Minimal game result stored in localStorage for guest users
export interface GuestGameResult {
  puzzleId: string;
  won: boolean;
  score: number;
  hintsUsed: number;
  solveTimeMs: number;
  playedAt: string;
}

// Leaderboard entry for display
export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  ensName: string | null;
  xp: number;
  currentStreak: number;
  bestStreak: number;
  isCurrentUser: boolean;
}
