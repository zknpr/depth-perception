import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/db";
import { puzzles, puzzleEvents } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";

// GET /api/admin/puzzles
// Lists all puzzles with their associated events, ordered by creation date
// (most recent first). Each puzzle includes a nested `events` array sorted
// by `orderIndex`. Access is restricted to admin wallets.
export async function GET() {
  try {
    // Gate: only admin wallets may access this endpoint
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all puzzles ordered by creation date descending
    const allPuzzles = await db
      .select()
      .from(puzzles)
      .orderBy(desc(puzzles.createdAt));

    // For each puzzle, fetch its events in chronological order (orderIndex)
    const result = await Promise.all(
      allPuzzles.map(async (puzzle) => {
        const events = await db
          .select()
          .from(puzzleEvents)
          .where(eq(puzzleEvents.puzzleId, puzzle.id))
          .orderBy(asc(puzzleEvents.orderIndex));

        return {
          ...puzzle,
          events: events.map((e) => ({
            id: e.id,
            text: e.text,
            date: e.date,
            sortDate: e.sortDate,
            url: e.url,
            orderIndex: e.orderIndex,
          })),
        };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to list puzzles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/puzzles
// Creates a new puzzle with its events. The request body must include:
//   { title: string, category: string, isDaily: boolean, dailyDate?: string,
//     events: [{ text: string, date: string, sortDate: string, url?: string }] }
// The `orderIndex` for each event is derived from its position in the array.
export async function POST(request: Request) {
  try {
    // Gate: only admin wallets may create puzzles
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, category, isDaily, dailyDate, events } = body;

    // ── Input validation ──────────────────────────────────────────────────
    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid title" },
        { status: 400 }
      );
    }
    if (!category || typeof category !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid category" },
        { status: 400 }
      );
    }
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "Events array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Validate each event has the required fields
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (!ev.text || typeof ev.text !== "string") {
        return NextResponse.json(
          { error: `Event at index ${i} is missing a valid text field` },
          { status: 400 }
        );
      }
      if (!ev.date || typeof ev.date !== "string") {
        return NextResponse.json(
          { error: `Event at index ${i} is missing a valid date field` },
          { status: 400 }
        );
      }
      if (!ev.sortDate || typeof ev.sortDate !== "string") {
        return NextResponse.json(
          { error: `Event at index ${i} is missing a valid sortDate field` },
          { status: 400 }
        );
      }
    }

    // ── Insert puzzle ─────────────────────────────────────────────────────
    const [newPuzzle] = await db
      .insert(puzzles)
      .values({
        title,
        category,
        isDaily: Boolean(isDaily),
        dailyDate: isDaily ? dailyDate || null : null,
      })
      .returning();

    // ── Insert events with orderIndex derived from array position ────────
    const eventValues = events.map(
      (ev: { text: string; date: string; sortDate: string; url?: string }, i: number) => ({
        puzzleId: newPuzzle.id,
        text: ev.text,
        date: ev.date,
        sortDate: new Date(ev.sortDate),
        url: ev.url || null,
        orderIndex: i,
      })
    );

    const insertedEvents = await db
      .insert(puzzleEvents)
      .values(eventValues)
      .returning();

    return NextResponse.json(
      {
        ...newPuzzle,
        events: insertedEvents.map((e) => ({
          id: e.id,
          text: e.text,
          date: e.date,
          sortDate: e.sortDate,
          url: e.url,
          orderIndex: e.orderIndex,
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create puzzle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
