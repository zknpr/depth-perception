"use client";

import type { Achievement, UserAchievement } from "@/types";

// ─── ALL_ACHIEVEMENTS ────────────────────────────────────────────────────────
// Complete list of achievements available in the game. Each entry defines the
// achievement's unique id, display title, description, emoji icon, and XP
// reward. This constant is the single source of truth for the achievement
// catalog used to render both unlocked and locked states.
const ALL_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_win",
    title: "First Blood",
    description: "Win your first game",
    icon: "🏆",
    xpReward: 50,
  },
  {
    id: "streak_3",
    title: "Hat Trick",
    description: "Achieve a 3-game win streak",
    icon: "🔥",
    xpReward: 100,
  },
  {
    id: "streak_7",
    title: "On Fire",
    description: "Achieve a 7-game win streak",
    icon: "💥",
    xpReward: 250,
  },
  {
    id: "streak_15",
    title: "Unstoppable",
    description: "Achieve a 15-game win streak",
    icon: "⚡",
    xpReward: 500,
  },
  {
    id: "no_hints",
    title: "Purist",
    description: "Win without using hints",
    icon: "🧠",
    xpReward: 75,
  },
  {
    id: "speed_demon",
    title: "Speed Demon",
    description: "Win in under 15 seconds",
    icon: "⏱️",
    xpReward: 150,
  },
  {
    id: "daily_5",
    title: "Dedicated",
    description: "Complete 5 daily challenges",
    icon: "📅",
    xpReward: 200,
  },
  {
    id: "daily_30",
    title: "Habitual",
    description: "Complete 30 daily challenges",
    icon: "🗓️",
    xpReward: 500,
  },
  {
    id: "games_50",
    title: "Veteran",
    description: "Play 50 games",
    icon: "🎮",
    xpReward: 300,
  },
  {
    id: "perfect_10",
    title: "Perfectionist",
    description: "Win 10 games with no hints",
    icon: "💎",
    xpReward: 400,
  },
];

// ─── Props ───────────────────────────────────────────────────────────────────
// `unlockedAchievements` — array of UserAchievement objects returned from the
// API, each containing an `id` that maps to an entry in ALL_ACHIEVEMENTS plus
// an `unlockedAt` timestamp. If not provided, all achievements show as locked.
interface AchievementGridProps {
  unlockedAchievements: UserAchievement[];
}

// ─── AchievementGrid ─────────────────────────────────────────────────────────
// Renders a responsive grid displaying all game achievements. Unlocked
// achievements show their icon, title, description, and XP reward with a lime
// accent border. Locked achievements are greyed out with a lock emoji and
// placeholder text to maintain mystery.
//
// Layout: 2 columns on mobile, 3 columns on md+ screens.
export function AchievementGrid({ unlockedAchievements }: AchievementGridProps) {
  // Build a Set of unlocked achievement IDs for O(1) lookup when rendering
  // each achievement card. This avoids repeated .find() calls on the array.
  const unlockedIds = new Set(unlockedAchievements.map((a) => a.id));

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {ALL_ACHIEVEMENTS.map((achievement) => {
        // Check if this achievement has been unlocked by the player
        const isUnlocked = unlockedIds.has(achievement.id);

        return (
          <div
            key={achievement.id}
            className={`
              rounded-xl border-2 p-4 transition-all
              ${
                isUnlocked
                  ? "border-lime bg-white shadow-sm"
                  : "border-gray-200 bg-gray-50 opacity-60"
              }
            `}
          >
            {/* Achievement icon: full emoji when unlocked, lock emoji when locked */}
            <div className="mb-2 text-2xl">
              {isUnlocked ? achievement.icon : "🔒"}
            </div>

            {/* Title: real title when unlocked, "???" placeholder when locked
                to maintain mystery and encourage exploration */}
            <p
              className={`text-sm font-semibold ${
                isUnlocked ? "text-navy" : "text-gray-400"
              }`}
            >
              {isUnlocked ? achievement.title : "???"}
            </p>

            {/* Description: actual description when unlocked, generic prompt
                when locked to avoid spoiling achievement requirements */}
            <p className="mt-0.5 text-xs text-gray-500">
              {isUnlocked ? achievement.description : "Keep playing to unlock"}
            </p>

            {/* XP reward badge: only shown for unlocked achievements */}
            {isUnlocked && (
              <p className="mt-2 text-xs font-semibold text-navy">
                +{achievement.xpReward} XP
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Export the constant for potential reuse in other modules (e.g., server-side
// achievement checking)
export { ALL_ACHIEVEMENTS };
