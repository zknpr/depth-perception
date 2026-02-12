import { NextResponse } from "next/server";
import { db } from "@/db";
import { puzzles, puzzleEvents } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { asc } from "drizzle-orm";

// Fisher-Yates shuffle — produces a uniformly random permutation of the input
// array. Used to randomize event order so the client never receives events in
// their correct chronological sequence.
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// GET /api/puzzles/today
// Returns the daily puzzle if one exists for today's date, otherwise falls back
// to a random puzzle from the database. Events are shuffled so the client
// receives them in a non-chronological order. The response omits `sortDate` and
// `orderIndex` to prevent the client from trivially solving the puzzle.
export async function GET() {
  try {
    // Format today's date as YYYY-MM-DD for comparison with the `daily_date` column
    const today = new Date().toISOString().split("T")[0];

    // Attempt to find a puzzle marked as the daily challenge for today
    const dailyPuzzle = await db
      .select()
      .from(puzzles)
      .where(and(eq(puzzles.isDaily, true), eq(puzzles.dailyDate, today)))
      .limit(1);

    let puzzle;

    if (dailyPuzzle.length > 0) {
      // Daily puzzle found — use it directly
      puzzle = dailyPuzzle[0];
    } else {
      // No daily puzzle for today — fall back to a random puzzle.
      // `sql<number>\`random()\`` uses PostgreSQL's built-in random() to select
      // a uniformly random row without loading the entire table.
      const randomPuzzle = await db
        .select()
        .from(puzzles)
        .orderBy(sql`random()`)
        .limit(1);

      if (randomPuzzle.length === 0) {
        return NextResponse.json(
          { error: "No puzzles available" },
          { status: 404 }
        );
      }

      puzzle = randomPuzzle[0];
    }

    // Fetch all events belonging to the selected puzzle, ordered by their
    // correct chronological index (needed for shuffling only — index is not
    // exposed to the client)
    const events = await db
      .select()
      .from(puzzleEvents)
      .where(eq(puzzleEvents.puzzleId, puzzle.id))
      .orderBy(asc(puzzleEvents.orderIndex));

    // Shuffle events and strip sensitive fields (sortDate, orderIndex) that
    // would reveal the answer
    const shuffledEvents = shuffle(events).map((e) => ({
      id: e.id,
      text: e.text,
      date: e.date,
      url: e.url,
    }));

    return NextResponse.json({
      id: puzzle.id,
      title: puzzle.title,
      category: puzzle.category,
      isDaily: puzzle.isDaily,
      events: shuffledEvents,
    });
  } catch (error) {
    console.error("Failed to fetch today's puzzle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
