"use client";

import { useCallback, useState } from "react";
import { GameBoard } from "@/components/game-board";
import type { Puzzle, SubmitResult } from "@/types";

// ─── Temporary Hardcoded Puzzles ──────────────────────────────────────────────
// These puzzles are used for local development and testing before the server
// API is available. Each puzzle contains 5 events listed in their correct
// chronological order. The GameBoard will shuffle them on mount.

const TEMP_PUZZLES: Puzzle[] = [
  {
    id: "temp-1",
    title: "January, 2026",
    category: "Leviathan News",
    events: [
      {
        id: "e1",
        text: "Vitalik brings back the milady profile pic on X/Twitter",
        date: "1/1/2026",
        url: null,
      },
      {
        id: "e2",
        text: "Japan's 30Y Government Bond Yield Breaks Past 2.5% for First Time Since 2009",
        date: "1/7/2026",
        url: null,
      },
      {
        id: "e3",
        text: "Yearn's yYB crosses 1 million YB locked",
        date: "1/12/2026",
        url: null,
      },
      {
        id: "e4",
        text: "Caroline Ellison begins 2-year prison sentence at FCI Dublin in California",
        date: "1/21/2026",
        url: null,
      },
      {
        id: "e5",
        text: "Introducing Polaris: The North Star of DeFi - Yearn's new launch",
        date: "1/27/2026",
        url: null,
      },
    ],
  },
  {
    id: "temp-2",
    title: "Demo Puzzle",
    category: "Historical Events",
    events: [
      {
        id: "h1",
        text: "Apollo 11 lands on the Moon.",
        date: "1969",
        url: "https://en.wikipedia.org/wiki/Apollo_11",
      },
      {
        id: "h2",
        text: "The Berlin Wall falls.",
        date: "1989",
        url: "https://en.wikipedia.org/wiki/Fall_of_the_Berlin_Wall",
      },
      {
        id: "h3",
        text: "First iPod is released.",
        date: "2001",
        url: "https://en.wikipedia.org/wiki/IPod",
      },
      {
        id: "h4",
        text: "First iPhone is released.",
        date: "2007",
        url: "https://en.wikipedia.org/wiki/IPhone",
      },
      {
        id: "h5",
        text: "SpaceX launches first crewed mission.",
        date: "2020",
        url: "https://en.wikipedia.org/wiki/SpaceX_Demo-2",
      },
    ],
  },
];

// ─── Correct Order Map ────────────────────────────────────────────────────────
// Maps each puzzle ID to its correct chronological event ordering.
// Used by the local handleSubmit to validate the player's answer without
// requiring a server round-trip. Will be replaced by server validation in
// Phase 5 when the puzzle API routes are implemented.

const CORRECT_ORDERS: Record<string, string[]> = {
  "temp-1": ["e1", "e2", "e3", "e4", "e5"],
  "temp-2": ["h1", "h2", "h3", "h4", "h5"],
};

// ─── Home Page ────────────────────────────────────────────────────────────────
// Renders the GameBoard with a temporary local validation flow.
// The `puzzleIndex` state tracks which puzzle is currently active, and the
// `key` prop on GameBoard forces a full remount when the puzzle changes,
// ensuring all internal state (shuffle, timer, hints) resets cleanly.

export default function Home() {
  // Index into TEMP_PUZZLES to track the currently displayed puzzle
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const puzzle = TEMP_PUZZLES[puzzleIndex];

  // ─── Local Validation ───────────────────────────────────────────────────
  // Compares the player's submitted ordering against the known correct order.
  // Computes a score (count of correctly placed events), determines win/loss,
  // and returns a SubmitResult matching the server API contract. This lets
  // the GameBoard render results identically whether validated locally or
  // via the server.
  const handleSubmit = useCallback(
    async (
      orderedIds: string[],
      hintsUsed: number,
      solveTimeMs: number
    ): Promise<SubmitResult> => {
      const correctOrder = CORRECT_ORDERS[puzzle.id];

      // Count how many events are in their correct position
      const score = orderedIds.reduce(
        (acc, id, i) => (id === correctOrder[i] ? acc + 1 : acc),
        0
      );

      // Win requires all events in the correct order
      const won = score === correctOrder.length;

      return {
        won,
        score,
        correctOrder,
        // XP placeholder: 100 base for a win, 0 for a loss
        xpEarned: won ? 100 : 0,
        // No achievements in local validation mode
        newAchievements: [],
      };
    },
    [puzzle.id]
  );

  // ─── Next Puzzle Navigation ─────────────────────────────────────────────
  // Cycles through the TEMP_PUZZLES array, wrapping back to the first puzzle
  // after the last one. The puzzleIndex change triggers a GameBoard remount
  // via the key prop.
  const handleNextPuzzle = useCallback(() => {
    setPuzzleIndex((prev) => (prev + 1) % TEMP_PUZZLES.length);
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4">
      {/* Puzzle title displayed above the game board */}
      <h1 className="mb-6 text-center text-2xl font-bold text-navy">
        {puzzle.title}
      </h1>

      {/* GameBoard is keyed by puzzle id + index so that changing puzzles
          forces a full remount, resetting all internal state (shuffle order,
          timer, hints, result, etc.) */}
      <GameBoard
        key={puzzle.id + puzzleIndex}
        puzzle={puzzle}
        onSubmit={handleSubmit}
        onNextPuzzle={handleNextPuzzle}
      />
    </div>
  );
}
