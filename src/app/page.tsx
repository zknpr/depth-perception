"use client";

import { useCallback, useEffect, useState } from "react";
import { GameBoard } from "@/components/game-board";
import type { Puzzle, SubmitResult } from "@/types";

// ─── Home Page ────────────────────────────────────────────────────────────────
// Fetches the daily puzzle from the server API on mount and delegates answer
// validation to the server via POST /api/game/submit. Handles loading and
// error states while the puzzle data is being fetched. The GameBoard component
// receives a server-backed onSubmit callback that returns XP and achievements.

export default function Home() {
  // The currently loaded puzzle, or null while loading / on error
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);

  // Loading state tracks whether the initial puzzle fetch is in progress
  const [loading, setLoading] = useState(true);

  // Error message displayed when the puzzle fetch or submission fails
  const [error, setError] = useState<string | null>(null);

  // Counter incremented to trigger a fresh puzzle fetch (forces GameBoard
  // remount via the key prop)
  const [puzzleKey, setPuzzleKey] = useState(0);

  // Tracks whether the current puzzle is today's daily challenge, used to
  // render a "Daily Challenge" badge in the GameBoard header
  const [isDaily, setIsDaily] = useState(false);

  // ─── Fetch Puzzle on Mount ──────────────────────────────────────────────
  // Requests today's puzzle from the API. Falls back to a random puzzle if
  // no daily puzzle is configured for today (handled server-side).
  useEffect(() => {
    let cancelled = false;

    async function fetchPuzzle() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/puzzles/today");

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(
            data?.error || `Failed to load puzzle (${res.status})`
          );
        }

        // The API response includes `isDaily` which is not part of the
        // Puzzle type but is needed to show the Daily Challenge badge.
        const data = (await res.json()) as Puzzle & { isDaily?: boolean };

        // Guard against state updates after unmount or stale fetches
        if (!cancelled) {
          setPuzzle(data);
          setIsDaily(Boolean(data.isDaily));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load puzzle"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPuzzle();

    // Cleanup function prevents state updates if the component unmounts
    // before the fetch completes (e.g., during fast navigation)
    return () => {
      cancelled = true;
    };
  }, [puzzleKey]);

  // ─── Server-Backed Submit Handler ───────────────────────────────────────
  // Sends the player's ordering to POST /api/game/submit for server-side
  // validation. The server computes the score, checks for wins, persists
  // game results (if authenticated), calculates XP, and returns newly
  // unlocked achievements.
  const handleSubmit = useCallback(
    async (
      orderedIds: string[],
      hintsUsed: number,
      solveTimeMs: number
    ): Promise<SubmitResult> => {
      if (!puzzle) {
        throw new Error("No puzzle loaded");
      }

      const res = await fetch("/api/game/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleId: puzzle.id,
          orderedEventIds: orderedIds,
          hintsUsed,
          solveTimeMs,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error || `Submission failed (${res.status})`
        );
      }

      return res.json();
    },
    [puzzle]
  );

  // ─── Next Puzzle Navigation ─────────────────────────────────────────────
  // Increments the puzzleKey counter which triggers a new fetch via the
  // useEffect dependency. This loads a fresh puzzle from the server and
  // forces a full GameBoard remount via the key prop.
  const handleNextPuzzle = useCallback(() => {
    setPuzzleKey((prev) => prev + 1);
  }, []);

  // ─── Loading State ──────────────────────────────────────────────────────
  // Displayed while the puzzle data is being fetched from the server.
  // Uses a pulsing animation to indicate activity.
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy/20 border-t-navy" />
          <p className="mt-4 text-sm text-gray-500">Loading puzzle...</p>
        </div>
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────
  // Displayed when the puzzle fetch fails. Shows the error message and a
  // retry button that re-triggers the fetch.
  if (error || !puzzle) {
    return (
      <div className="mx-auto max-w-2xl px-4">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm text-red-600">
            {error || "No puzzle available"}
          </p>
          <button
            type="button"
            onClick={() => setPuzzleKey((prev) => prev + 1)}
            className="mt-4 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4">
      {/* Puzzle title displayed above the game board */}
      <h1 className="mb-6 text-center text-2xl font-bold text-navy">
        {puzzle.title}
      </h1>

      {/* GameBoard is keyed by puzzle id + puzzleKey so that loading a new
          puzzle forces a full remount, resetting all internal state (shuffle
          order, timer, hints, result, etc.) */}
      <GameBoard
        key={puzzle.id + puzzleKey}
        puzzle={puzzle}
        onSubmit={handleSubmit}
        onNextPuzzle={handleNextPuzzle}
        isDaily={isDaily}
      />
    </div>
  );
}
