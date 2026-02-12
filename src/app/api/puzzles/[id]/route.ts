import { NextResponse } from "next/server";
import { db } from "@/db";
import { puzzles, puzzleEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
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

// GET /api/puzzles/[id]
// Returns a specific puzzle by its UUID. Events are shuffled so the client
// receives them in a non-chronological order. The response omits `sortDate` and
// `orderIndex` to prevent the client from trivially solving the puzzle.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Basic UUID format validation to reject obviously invalid IDs before
    // hitting the database
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Invalid puzzle ID format" },
        { status: 400 }
      );
    }

    // Fetch the puzzle by primary key
    const puzzleResult = await db
      .select()
      .from(puzzles)
      .where(eq(puzzles.id, id))
      .limit(1);

    if (puzzleResult.length === 0) {
      return NextResponse.json(
        { error: "Puzzle not found" },
        { status: 404 }
      );
    }

    const puzzle = puzzleResult[0];

    // Fetch all events for this puzzle, ordered by orderIndex (for shuffling
    // purposes — the index itself is not exposed)
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
      events: shuffledEvents,
    });
  } catch (error) {
    console.error("Failed to fetch puzzle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
