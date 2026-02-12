import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  puzzles,
  puzzleEvents,
  gameResults,
  users,
  achievements,
  userAchievements,
} from "@/db/schema";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
import { calculateXp } from "@/lib/xp";
import { checkAchievements } from "@/lib/achievements";

// POST /api/game/submit
// Validates the player's submitted event ordering against the correct
// chronological order stored in the database. For authenticated users, persists
// the game result, computes streak information, checks for newly unlocked
// achievements, calculates XP, and updates the user record. For unauthenticated
// users, returns the result without any persistence.
//
// Request body:
//   { puzzleId: string, orderedEventIds: string[], hintsUsed: number, solveTimeMs: number }
//
// Response:
//   { won: boolean, score: number, correctOrder: string[], xpEarned: number, newAchievements: Achievement[] }
export async function POST(request: Request) {
  try {
    // ── Parse and validate request body ────────────────────────────────────
    const body = await request.json();
    const { puzzleId, orderedEventIds, hintsUsed, solveTimeMs } = body;

    // Validate all required fields are present and correctly typed
    if (!puzzleId || typeof puzzleId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid puzzleId" },
        { status: 400 }
      );
    }
    if (!Array.isArray(orderedEventIds) || orderedEventIds.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid orderedEventIds" },
        { status: 400 }
      );
    }
    if (typeof hintsUsed !== "number" || hintsUsed < 0) {
      return NextResponse.json(
        { error: "Missing or invalid hintsUsed" },
        { status: 400 }
      );
    }
    if (typeof solveTimeMs !== "number" || solveTimeMs < 0) {
      return NextResponse.json(
        { error: "Missing or invalid solveTimeMs" },
        { status: 400 }
      );
    }

    // ── Fetch the correct event order from the database ────────────────────
    // Events are ordered by `orderIndex` which represents the correct
    // chronological sequence
    const correctEvents = await db
      .select({ id: puzzleEvents.id })
      .from(puzzleEvents)
      .where(eq(puzzleEvents.puzzleId, puzzleId))
      .orderBy(asc(puzzleEvents.orderIndex));

    if (correctEvents.length === 0) {
      return NextResponse.json(
        { error: "Puzzle not found or has no events" },
        { status: 404 }
      );
    }

    // Build the correct order as an array of event IDs
    const correctOrder = correctEvents.map((e) => e.id);

    // ── Compute score ──────────────────────────────────────────────────────
    // Score = count of events in the correct position. A perfect score means
    // every event matches its expected index in the chronological sequence.
    const score = orderedEventIds.reduce(
      (acc: number, id: string, i: number) =>
        id === correctOrder[i] ? acc + 1 : acc,
      0
    );
    const won = score === correctOrder.length;

    // ── Check authentication ───────────────────────────────────────────────
    // next-auth v4: use getServerSession with authOptions to retrieve the
    // current session. If no session exists, the user is playing as a guest.
    const session = await getServerSession(authOptions);

    let xpEarned = 0;
    let newAchievementDetails: {
      id: string;
      title: string;
      description: string;
      icon: string;
      xpReward: number;
    }[] = [];

    if (session?.user?.id) {
      // ── Authenticated user flow ────────────────────────────────────────
      const walletAddress = session.user.id;

      // Look up the user record by wallet address
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress))
        .limit(1);

      if (userResult.length === 0) {
        // User exists in session (JWT) but not in the database — this can
        // happen if the DB was reset. Return the result without persisting.
        return NextResponse.json({
          won,
          score,
          correctOrder,
          xpEarned: 0,
          newAchievements: [],
        });
      }

      const user = userResult[0];

      // ── Daily duplicate check ───────────────────────────────────────────
      // If this puzzle is a daily challenge and the authenticated user has
      // already submitted a result for it, reject the submission with a 409
      // to prevent repeated XP farming on the same daily.
      const puzzleCheck = await db
        .select({ isDaily: puzzles.isDaily })
        .from(puzzles)
        .where(eq(puzzles.id, puzzleId))
        .limit(1);

      if (puzzleCheck.length > 0 && puzzleCheck[0].isDaily) {
        const existingResult = await db
          .select({ id: gameResults.id })
          .from(gameResults)
          .where(
            and(
              eq(gameResults.userId, user.id),
              eq(gameResults.puzzleId, puzzleId)
            )
          )
          .limit(1);

        if (existingResult.length > 0) {
          return NextResponse.json(
            { error: "You have already completed today's daily challenge" },
            { status: 409 }
          );
        }
      }

      // ── Record the game result ─────────────────────────────────────────
      await db.insert(gameResults).values({
        userId: user.id,
        puzzleId,
        won,
        score,
        hintsUsed,
        solveTimeMs,
      });

      // ── Compute streak ─────────────────────────────────────────────────
      // Fetch all game results for this user ordered by playedAt descending
      // to compute the current consecutive win streak
      const allResults = await db
        .select({ won: gameResults.won })
        .from(gameResults)
        .where(eq(gameResults.userId, user.id))
        .orderBy(desc(gameResults.playedAt));

      // Count consecutive wins from the most recent game backwards
      let currentStreak = 0;
      for (const r of allResults) {
        if (r.won) {
          currentStreak++;
        } else {
          break;
        }
      }

      // Compute best streak by scanning all results chronologically
      let bestStreak = 0;
      let tempStreak = 0;
      // Reverse to process in chronological order (oldest first)
      const chronologicalResults = [...allResults].reverse();
      for (const r of chronologicalResults) {
        if (r.won) {
          tempStreak++;
          if (tempStreak > bestStreak) bestStreak = tempStreak;
        } else {
          tempStreak = 0;
        }
      }

      // ── Compute additional stats for achievement checks ────────────────
      const totalGames = allResults.length;
      const totalWins = allResults.filter((r) => r.won).length;

      // Count perfect wins (wins with 0 hints) from the full game history
      const perfectWinResults = await db
        .select({ id: gameResults.id })
        .from(gameResults)
        .where(
          and(
            eq(gameResults.userId, user.id),
            eq(gameResults.won, true),
            eq(gameResults.hintsUsed, 0)
          )
        );
      const totalPerfectWins = perfectWinResults.length;

      // Count daily challenge completions — games where the puzzle was a daily
      const dailyResults = await db
        .select({ id: gameResults.id })
        .from(gameResults)
        .innerJoin(puzzles, eq(gameResults.puzzleId, puzzles.id))
        .where(
          and(eq(gameResults.userId, user.id), eq(puzzles.isDaily, true))
        );
      const totalDailies = dailyResults.length;

      // ── Fetch already-unlocked achievements ────────────────────────────
      const unlockedRows = await db
        .select({ achievementId: userAchievements.achievementId })
        .from(userAchievements)
        .where(eq(userAchievements.userId, user.id));
      const alreadyUnlocked = new Set(unlockedRows.map((r) => r.achievementId));

      // ── Check for newly unlocked achievements ──────────────────────────
      const newlyUnlockedIds = checkAchievements({
        totalWins,
        totalGames,
        currentStreak,
        bestStreak,
        hintsUsedThisGame: hintsUsed,
        solveTimeMsThisGame: solveTimeMs,
        totalPerfectWins,
        totalDailies,
        won,
        alreadyUnlocked,
      });

      // ── Persist newly unlocked achievements ────────────────────────────
      let achievementXp = 0;
      if (newlyUnlockedIds.length > 0) {
        // Insert rows into the user_achievements join table
        await db.insert(userAchievements).values(
          newlyUnlockedIds.map((achievementId) => ({
            userId: user.id,
            achievementId,
          }))
        );

        // Fetch full achievement details using inArray to handle any number of
        // newly unlocked achievements in a single query
        const achievementRows = await db
          .select()
          .from(achievements)
          .where(inArray(achievements.id, newlyUnlockedIds));

        newAchievementDetails = achievementRows.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          icon: a.icon,
          xpReward: a.xpReward,
        }));

        // Sum all achievement XP rewards for the total bonus
        achievementXp = achievementRows.reduce(
          (sum, a) => sum + a.xpReward,
          0
        );
      }

      // ── Check if the puzzle is a daily challenge ───────────────────────
      const puzzleRow = await db
        .select({ isDaily: puzzles.isDaily })
        .from(puzzles)
        .where(eq(puzzles.id, puzzleId))
        .limit(1);
      const isDaily = puzzleRow.length > 0 && puzzleRow[0].isDaily;

      // ── Calculate XP earned ────────────────────────────────────────────
      xpEarned =
        calculateXp({
          won,
          hintsUsed,
          solveTimeMs,
          currentStreak,
          isDaily,
        }) + achievementXp;

      // ── Update user record ─────────────────────────────────────────────
      // Increment XP and update last played timestamp
      await db
        .update(users)
        .set({
          xp: user.xp + xpEarned,
          lastPlayedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    // ── Return result ──────────────────────────────────────────────────────
    // Both authenticated and unauthenticated users receive the same response
    // shape. Unauthenticated users get xpEarned=0 and no achievements.
    return NextResponse.json({
      won,
      score,
      correctOrder,
      xpEarned,
      newAchievements: newAchievementDetails,
    });
  } catch (error) {
    console.error("Failed to submit game:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
