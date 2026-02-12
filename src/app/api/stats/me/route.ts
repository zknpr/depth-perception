import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  users,
  gameResults,
  userAchievements,
  achievements,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { XP_PER_LEVEL } from "@/lib/constants";

// GET /api/stats/me
// Returns comprehensive statistics for the currently authenticated user.
// Requires a valid session — returns 401 if not authenticated.
//
// Response shape:
//   {
//     gamesPlayed, wins, winRate, currentStreak, bestStreak,
//     avgSolveTimeMs, fastestSolveTimeMs, xp, level,
//     achievements: UserAchievement[],
//     recentGames: GameResult[] (last 20)
//   }
export async function GET() {
  try {
    // ── Authentication check ───────────────────────────────────────────────
    // next-auth v4: getServerSession with authOptions retrieves the JWT-based
    // session. Returns null if the user is not authenticated.
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const walletAddress = session.user.id;

    // ── Fetch user record ──────────────────────────────────────────────────
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = userResult[0];

    // ── Fetch all game results ─────────────────────────────────────────────
    // Ordered by playedAt descending for streak computation and recent history
    const allResults = await db
      .select()
      .from(gameResults)
      .where(eq(gameResults.userId, user.id))
      .orderBy(desc(gameResults.playedAt));

    // ── Compute basic stats ────────────────────────────────────────────────
    const gamesPlayed = allResults.length;
    const wins = allResults.filter((r) => r.won).length;
    const winRate = gamesPlayed > 0 ? wins / gamesPlayed : 0;

    // ── Compute current streak ─────────────────────────────────────────────
    // Count consecutive wins from the most recent game backwards. A single
    // loss breaks the streak.
    let currentStreak = 0;
    for (const r of allResults) {
      if (r.won) {
        currentStreak++;
      } else {
        break;
      }
    }

    // ── Compute best streak ────────────────────────────────────────────────
    // Scan all results in chronological order (oldest first) to find the
    // longest consecutive win run
    let bestStreak = 0;
    let tempStreak = 0;
    const chronologicalResults = [...allResults].reverse();
    for (const r of chronologicalResults) {
      if (r.won) {
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    // ── Compute solve time stats ───────────────────────────────────────────
    // Only consider winning games for solve time statistics (losses don't
    // represent meaningful solve times)
    const winningResults = allResults.filter((r) => r.won);
    const avgSolveTimeMs =
      winningResults.length > 0
        ? Math.round(
            winningResults.reduce((sum, r) => sum + r.solveTimeMs, 0) /
              winningResults.length
          )
        : 0;
    const fastestSolveTimeMs =
      winningResults.length > 0
        ? Math.min(...winningResults.map((r) => r.solveTimeMs))
        : null;

    // ── Compute level from XP ──────────────────────────────────────────────
    // Level N requires N * XP_PER_LEVEL total XP. Integer division gives the
    // current level.
    const level = Math.floor(user.xp / XP_PER_LEVEL);

    // ── Fetch achievements with details ────────────────────────────────────
    // Inner join user_achievements with achievements to get full metadata
    // for each unlocked achievement
    const userAchievementRows = await db
      .select({
        id: achievements.id,
        title: achievements.title,
        description: achievements.description,
        icon: achievements.icon,
        xpReward: achievements.xpReward,
        unlockedAt: userAchievements.unlockedAt,
      })
      .from(userAchievements)
      .innerJoin(
        achievements,
        eq(userAchievements.achievementId, achievements.id)
      )
      .where(eq(userAchievements.userId, user.id));

    // Format achievement timestamps as ISO strings for JSON serialization
    const formattedAchievements = userAchievementRows.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      icon: a.icon,
      xpReward: a.xpReward,
      unlockedAt: a.unlockedAt.toISOString(),
    }));

    // ── Fetch recent game history ──────────────────────────────────────────
    // Return the last 20 games with relevant details for the player's
    // activity feed
    const recentGames = allResults.slice(0, 20).map((r) => ({
      id: r.id,
      puzzleId: r.puzzleId,
      won: r.won,
      score: r.score,
      hintsUsed: r.hintsUsed,
      solveTimeMs: r.solveTimeMs,
      playedAt: r.playedAt.toISOString(),
    }));

    return NextResponse.json({
      gamesPlayed,
      wins,
      winRate,
      currentStreak,
      bestStreak,
      avgSolveTimeMs,
      fastestSolveTimeMs,
      xp: user.xp,
      level,
      achievements: formattedAchievements,
      recentGames,
    });
  } catch (error) {
    console.error("Failed to fetch user stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
