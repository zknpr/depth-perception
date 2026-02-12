import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users, gameResults, puzzles } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { GuestGameResult } from "@/types";

// POST /api/game/migrate
// Migrates guest game results from the client's localStorage into the
// authenticated user's server-side game history. This endpoint is called
// once when a guest user connects a wallet and authenticates for the first
// time, allowing their offline progress to be persisted permanently.
//
// Request body:
//   { results: GuestGameResult[] }
//
// Response:
//   { migrated: number } — count of results successfully inserted
//
// Authentication: Required. Returns 401 if no valid session exists.
// Idempotency: If a puzzle referenced by a guest result does not exist in
// the database, that result is silently skipped (no error).
export async function POST(request: Request) {
  try {
    // ── Require authentication ──────────────────────────────────────────────
    // next-auth v4 pattern: getServerSession with authOptions
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const walletAddress = session.user.id;

    // ── Parse and validate request body ─────────────────────────────────────
    const body = await request.json();
    const { results } = body as { results?: GuestGameResult[] };

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty results array" },
        { status: 400 }
      );
    }

    // Validate each result has the required fields and correct types
    for (const r of results) {
      if (
        typeof r.puzzleId !== "string" ||
        typeof r.won !== "boolean" ||
        typeof r.score !== "number" ||
        typeof r.hintsUsed !== "number" ||
        typeof r.solveTimeMs !== "number" ||
        typeof r.playedAt !== "string"
      ) {
        return NextResponse.json(
          { error: "Invalid result format" },
          { status: 400 }
        );
      }
    }

    // ── Upsert user by wallet address ───────────────────────────────────────
    // The user may already exist (returning player) or this may be their
    // first authenticated session. We look up first and create if needed.
    let userResult = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress))
      .limit(1);

    if (userResult.length === 0) {
      // First-time authenticated user — create their record
      const inserted = await db
        .insert(users)
        .values({ walletAddress })
        .returning();
      userResult = inserted;
    }

    const user = userResult[0];

    // ── Filter to results with valid puzzles ────────────────────────────────
    // Collect all unique puzzle IDs from the guest results, then query the
    // database to find which ones actually exist. Results referencing
    // non-existent puzzles are silently skipped.
    const uniquePuzzleIds = [...new Set(results.map((r) => r.puzzleId))];

    const existingPuzzles = await db
      .select({ id: puzzles.id })
      .from(puzzles)
      .where(inArray(puzzles.id, uniquePuzzleIds));

    const existingPuzzleIdSet = new Set(existingPuzzles.map((p) => p.id));

    // Filter results to only include those referencing existing puzzles
    const validResults = results.filter((r) =>
      existingPuzzleIdSet.has(r.puzzleId)
    );

    // ── Insert valid results into game_results ──────────────────────────────
    let migrated = 0;

    if (validResults.length > 0) {
      // Insert each result individually so that individual failures (e.g.
      // unique constraint violations) do not block the rest of the batch.
      // This is safer than a bulk insert for migration scenarios.
      for (const r of validResults) {
        try {
          await db.insert(gameResults).values({
            userId: user.id,
            puzzleId: r.puzzleId,
            won: r.won,
            score: r.score,
            hintsUsed: r.hintsUsed,
            solveTimeMs: r.solveTimeMs,
            playedAt: new Date(r.playedAt),
          });
          migrated++;
        } catch (insertError) {
          // Skip individual failures (e.g. duplicate entries) — log for
          // debugging but do not abort the entire migration
          console.warn(
            `Failed to migrate result for puzzle ${r.puzzleId}:`,
            insertError
          );
        }
      }
    }

    return NextResponse.json({ migrated });
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
