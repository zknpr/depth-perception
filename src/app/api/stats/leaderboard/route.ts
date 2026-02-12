import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users, gameResults } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { LEADERBOARD_PAGE_SIZE } from "@/lib/constants";

// GET /api/stats/leaderboard
// Returns the top players sorted by the requested metric. Supports three sort
// modes via the `?sort=` query parameter:
//   - "xp" (default): ranks by total XP from the users table
//   - "streak": ranks by current consecutive win streak
//   - "best_streak": ranks by best-ever consecutive win streak
//
// Each entry includes a rank, wallet address, ENS name, XP, and streak info.
// If the requesting user is authenticated, their entry is flagged with
// `isCurrentUser: true`.
export async function GET(request: Request) {
  try {
    // Parse the `sort` query parameter, defaulting to "xp" if not provided
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "xp";

    // Validate sort parameter against known values
    if (!["xp", "streak", "best_streak"].includes(sort)) {
      return NextResponse.json(
        { error: "Invalid sort parameter. Use: xp, streak, or best_streak" },
        { status: 400 }
      );
    }

    // ── Check authentication for current-user flagging ─────────────────────
    // This is optional — unauthenticated users can still view the leaderboard,
    // they just won't see their own entry highlighted.
    const session = await getServerSession(authOptions);
    const currentWallet = session?.user?.id ?? null;

    if (sort === "xp") {
      // ── XP sort: simple query on the users table ─────────────────────────
      // XP is stored directly on the user record so no aggregation is needed
      const topUsers = await db
        .select({
          walletAddress: users.walletAddress,
          ensName: users.ensName,
          xp: users.xp,
        })
        .from(users)
        .orderBy(desc(users.xp))
        .limit(LEADERBOARD_PAGE_SIZE);

      // For XP sort, we still need streak data for each user. Fetch game
      // results for each user to compute streaks.
      const entries = await Promise.all(
        topUsers.map(async (u, index) => {
          // Fetch this user's game results to compute streaks
          const userResults = await db
            .select({ won: gameResults.won })
            .from(gameResults)
            .innerJoin(users, eq(gameResults.userId, users.id))
            .where(eq(users.walletAddress, u.walletAddress))
            .orderBy(desc(gameResults.playedAt));

          const { currentStreak, bestStreak } =
            computeStreaks(userResults);

          return {
            rank: index + 1,
            walletAddress: u.walletAddress,
            ensName: u.ensName,
            xp: u.xp,
            currentStreak,
            bestStreak,
            isCurrentUser: u.walletAddress === currentWallet,
          };
        })
      );

      return NextResponse.json(entries);
    }

    // ── Streak-based sorts ─────────────────────────────────────────────────
    // For streak and best_streak sorts, we need to compute streaks for every
    // user from their game results, then sort and rank.

    // Fetch all users
    const allUsers = await db
      .select({
        id: users.id,
        walletAddress: users.walletAddress,
        ensName: users.ensName,
        xp: users.xp,
      })
      .from(users);

    // Compute streaks for each user
    const usersWithStreaks = await Promise.all(
      allUsers.map(async (u) => {
        const userResults = await db
          .select({ won: gameResults.won })
          .from(gameResults)
          .where(eq(gameResults.userId, u.id))
          .orderBy(desc(gameResults.playedAt));

        const { currentStreak, bestStreak } = computeStreaks(userResults);

        return {
          walletAddress: u.walletAddress,
          ensName: u.ensName,
          xp: u.xp,
          currentStreak,
          bestStreak,
          isCurrentUser: u.walletAddress === currentWallet,
        };
      })
    );

    // Sort by the requested streak metric (descending) and take the top N
    usersWithStreaks.sort((a, b) => {
      const key = sort === "streak" ? "currentStreak" : "bestStreak";
      return b[key] - a[key];
    });

    // Apply the page size limit and assign ranks
    const entries = usersWithStreaks
      .slice(0, LEADERBOARD_PAGE_SIZE)
      .map((u, index) => ({
        rank: index + 1,
        ...u,
      }));

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// computeStreaks takes game results ordered by playedAt descending and computes
// both the current consecutive win streak (from most recent game backwards)
// and the best-ever consecutive win streak (scanning all games chronologically).
function computeStreaks(
  results: { won: boolean }[]
): { currentStreak: number; bestStreak: number } {
  // Current streak: count consecutive wins from the most recent game
  let currentStreak = 0;
  for (const r of results) {
    if (r.won) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Best streak: scan chronologically (oldest first) for the longest run
  let bestStreak = 0;
  let tempStreak = 0;
  const chronological = [...results].reverse();
  for (const r of chronological) {
    if (r.won) {
      tempStreak++;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  return { currentStreak, bestStreak };
}
