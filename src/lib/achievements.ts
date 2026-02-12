import { SPEED_DEMON_THRESHOLD_MS } from "./constants";

// Input parameters for checking which achievements the player has newly unlocked
interface AchievementCheckInput {
  totalWins: number;
  totalGames: number;
  currentStreak: number;
  bestStreak: number;
  hintsUsedThisGame: number;
  solveTimeMsThisGame: number;
  totalPerfectWins: number;
  totalDailies: number;
  won: boolean;
  alreadyUnlocked: Set<string>;
}

// checkAchievements evaluates all achievement conditions against the player's
// current stats and returns an array of achievement IDs that were newly unlocked
// in this game. Each achievement is only checked if it hasn't already been
// unlocked (via the `alreadyUnlocked` set).
//
// Achievement catalog:
//   first_win   — Win your first game
//   streak_3    — Win 3 games in a row
//   streak_7    — Win 7 games in a row
//   streak_15   — Win 15 games in a row
//   no_hints    — Win a game without using any hints
//   speed_demon — Win a game in under 15 seconds
//   daily_5     — Complete 5 daily challenges
//   daily_30    — Complete 30 daily challenges
//   games_50    — Play 50 total games
//   perfect_10  — Win 10 games with a perfect score (no hints)
export function checkAchievements(input: AchievementCheckInput): string[] {
  const newlyUnlocked: string[] = [];

  // Helper that pushes the achievement ID if the condition is met and it hasn't
  // been previously unlocked
  const check = (id: string, condition: boolean) => {
    if (!input.alreadyUnlocked.has(id) && condition) newlyUnlocked.push(id);
  };

  // Milestone achievements
  check("first_win", input.won && input.totalWins >= 1);

  // Streak achievements — checked in ascending order
  check("streak_3", input.currentStreak >= 3);
  check("streak_7", input.currentStreak >= 7);
  check("streak_15", input.currentStreak >= 15);

  // Skill-based achievements
  check("no_hints", input.won && input.hintsUsedThisGame === 0);
  check(
    "speed_demon",
    input.won && input.solveTimeMsThisGame < SPEED_DEMON_THRESHOLD_MS
  );

  // Daily challenge milestones
  check("daily_5", input.totalDailies >= 5);
  check("daily_30", input.totalDailies >= 30);

  // Lifetime milestones
  check("games_50", input.totalGames >= 50);
  check("perfect_10", input.totalPerfectWins >= 10);

  return newlyUnlocked;
}
