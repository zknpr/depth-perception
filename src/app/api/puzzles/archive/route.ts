import { NextResponse } from "next/server";
import { db } from "@/db";
import { puzzles } from "@/db/schema";
import { desc } from "drizzle-orm";

// GET /api/puzzles/archive
// Returns metadata for all puzzles ordered by creation date (newest first).
// Events are intentionally excluded to keep the payload small — the client
// should fetch individual puzzles via /api/puzzles/[id] when the player
// selects one from the archive.
export async function GET() {
  try {
    // Select only metadata columns, omitting events. Ordered by createdAt
    // descending so the most recently added puzzles appear first.
    const allPuzzles = await db
      .select({
        id: puzzles.id,
        title: puzzles.title,
        category: puzzles.category,
        isDaily: puzzles.isDaily,
        dailyDate: puzzles.dailyDate,
        createdAt: puzzles.createdAt,
      })
      .from(puzzles)
      .orderBy(desc(puzzles.createdAt));

    return NextResponse.json(allPuzzles);
  } catch (error) {
    console.error("Failed to fetch puzzle archive:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
