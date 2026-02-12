// XP thresholds: level N requires N * XP_PER_LEVEL total XP
export const XP_PER_LEVEL = 500;

// XP awards for various game actions
export const XP_AWARDS = {
  win: 100,
  perfectBonus: 50,
  speedBonus: 30,
  streakMultiplier: 20,
  dailyChallenge: 75,
} as const;

// Maximum hints per game
export const MAX_HINTS = 3;

// Number of events per puzzle
export const EVENTS_PER_PUZZLE = 5;

// Speed bonus threshold in milliseconds (30 seconds)
export const SPEED_BONUS_THRESHOLD_MS = 30_000;

// Speed demon achievement threshold in milliseconds (15 seconds)
export const SPEED_DEMON_THRESHOLD_MS = 15_000;

// localStorage key for guest stats
export const GUEST_STATS_KEY = "depth_guest_stats";

// Leaderboard page size
export const LEADERBOARD_PAGE_SIZE = 50;
