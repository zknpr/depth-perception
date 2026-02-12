import { XP_AWARDS, SPEED_BONUS_THRESHOLD_MS } from "./constants";

// Input parameters for XP calculation after a game ends
interface XpCalcInput {
  won: boolean;
  hintsUsed: number;
  solveTimeMs: number;
  currentStreak: number;
  isDaily: boolean;
}

// calculateXp computes the total XP earned for a single game based on the
// player's performance. XP is only awarded for wins. Bonuses stack additively:
//   - Base win XP (100)
//   - Perfect bonus (+50) if zero hints were used
//   - Speed bonus (+30) if solved under the threshold (30s)
//   - Streak multiplier (+20 * current streak) for consecutive wins
//   - Daily challenge bonus (+75) if the puzzle is today's daily
export function calculateXp(input: XpCalcInput): number {
  // No XP for losses — early return avoids unnecessary computation
  if (!input.won) return 0;

  // Start with the base win award
  let xp = XP_AWARDS.win;

  // Perfect bonus: no hints used during the entire game
  if (input.hintsUsed === 0) xp += XP_AWARDS.perfectBonus;

  // Speed bonus: solved faster than the configured threshold
  if (input.solveTimeMs < SPEED_BONUS_THRESHOLD_MS) xp += XP_AWARDS.speedBonus;

  // Streak multiplier: scales linearly with consecutive wins (only applies
  // when the streak is greater than 1, since a single win is the base case)
  if (input.currentStreak > 1)
    xp += XP_AWARDS.streakMultiplier * input.currentStreak;

  // Daily challenge bonus: extra incentive for playing the daily puzzle
  if (input.isDaily) xp += XP_AWARDS.dailyChallenge;

  return xp;
}
