import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/db";
import { puzzles, puzzleEvents } from "@/db/schema";
import { eq } from "drizzle-orm";

// PUT /api/admin/puzzles/[id]
// Updates an existing puzzle's metadata and replaces all its events. The old
// events are deleted and new ones are inserted from the request body. This
// "replace all" strategy avoids complex diff logic and keeps the event ordering
// consistent with the array position.
//
// Request body:
//   { title: string, category: string, isDaily: boolean, dailyDate?: string,
//     events: [{ text: string, date: string, sortDate: string, url?: string }] }
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Gate: only admin wallets may update puzzles
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
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

    // ── Verify the puzzle exists ──────────────────────────────────────────
    const existing = await db
      .select({ id: puzzles.id })
      .from(puzzles)
      .where(eq(puzzles.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Puzzle not found" },
        { status: 404 }
      );
    }

    // ── Update puzzle metadata ────────────────────────────────────────────
    const [updatedPuzzle] = await db
      .update(puzzles)
      .set({
        title,
        category,
        isDaily: Boolean(isDaily),
        dailyDate: isDaily ? dailyDate || null : null,
      })
      .where(eq(puzzles.id, id))
      .returning();

    // ── Replace all events ────────────────────────────────────────────────
    // Delete existing events (FK cascade would handle this on puzzle delete,
    // but here we want to keep the puzzle and replace events only)
    await db.delete(puzzleEvents).where(eq(puzzleEvents.puzzleId, id));

    // Insert new events with orderIndex derived from array position
    const eventValues = events.map(
      (ev: { text: string; date: string; sortDate: string; url?: string }, i: number) => ({
        puzzleId: id,
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

    return NextResponse.json({
      ...updatedPuzzle,
      events: insertedEvents.map((e) => ({
        id: e.id,
        text: e.text,
        date: e.date,
        sortDate: e.sortDate,
        url: e.url,
        orderIndex: e.orderIndex,
      })),
    });
  } catch (error) {
    console.error("Failed to update puzzle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/puzzles/[id]
// Deletes a puzzle by ID. Associated events are automatically removed via the
// ON DELETE CASCADE foreign key constraint on puzzle_events.puzzle_id.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Gate: only admin wallets may delete puzzles
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify the puzzle exists before attempting deletion
    const existing = await db
      .select({ id: puzzles.id })
      .from(puzzles)
      .where(eq(puzzles.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Puzzle not found" },
        { status: 404 }
      );
    }

    // Delete the puzzle — events are cascade-deleted by the FK constraint
    await db.delete(puzzles).where(eq(puzzles.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete puzzle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
