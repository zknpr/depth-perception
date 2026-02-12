"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import { GameCard } from "@/components/game-card";
import { GameTimer } from "@/components/game-timer";
import { AchievementToast } from "@/components/achievement-toast";
import { ResultModal } from "@/components/result-modal";
import { MAX_HINTS } from "@/lib/constants";
import type { Puzzle, PuzzleEvent, SubmitResult, Achievement } from "@/types";

// ─── Inline SVG Icons ────────────────────────────────────────────────────────
// Minimal icons used in the board UI (action buttons, hints, info).

function LightbulbIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Lightbulb outline with filament lines at the base */}
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
    </svg>
  );
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function RefreshCwIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Circular arrows indicating a retry/refresh action */}
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
    </svg>
  );
}

function InfoIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Circle with "i" for information */}
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function ArrowRightIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ─── Fisher-Yates Shuffle ────────────────────────────────────────────────────
// Creates a new shuffled copy of the input array using the Fisher-Yates
// (Knuth) algorithm. This ensures each permutation is equally likely.
// Guarantees the result differs from the original order (re-shuffles if
// identical) so the player always has work to do.
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  // If the shuffle produced the same order (unlikely for 5 items but
  // possible), recursively re-shuffle to guarantee a different arrangement
  if (
    copy.length > 1 &&
    copy.every((item, idx) => item === arr[idx])
  ) {
    return shuffle(arr);
  }
  return copy;
}

// ─── Props ───────────────────────────────────────────────────────────────────
// `puzzle` — the current puzzle with events in server-provided order
// `onSubmit` — async callback to validate the player's ordering
// `onNextPuzzle` — navigates to the next puzzle after completion

interface GameBoardProps {
  puzzle: Puzzle;
  onSubmit: (
    orderedIds: string[],
    hintsUsed: number,
    solveTimeMs: number
  ) => Promise<SubmitResult>;
  onNextPuzzle: () => void;
  // When true, displays a "Daily Challenge" badge in the header area to
  // distinguish daily puzzles from random/archive puzzles.
  isDaily?: boolean;
}

export function GameBoard({ puzzle, onSubmit, onNextPuzzle, isDaily }: GameBoardProps) {
  // ─── State ──────────────────────────────────────────────────────────────
  // `items` — the player's current ordering of events (shuffled on mount)
  const [items, setItems] = useState<PuzzleEvent[]>([]);

  // Whether the player has successfully solved the puzzle
  const [gameWon, setGameWon] = useState(false);

  // Hint tracking: remaining count and set of event IDs that have been hinted
  const [hintsLeft, setHintsLeft] = useState(MAX_HINTS);
  const [hintedEventIds, setHintedEventIds] = useState<Set<string>>(
    new Set()
  );
  // Temporary message shown when a hint is used (or unavailable)
  const [hintMessage, setHintMessage] = useState<string | null>(null);

  // Set of event IDs that the player has locked in position
  const [lockedItems, setLockedItems] = useState<Set<string>>(new Set());

  // Index of the currently selected card for tap-to-swap (-1 = none)
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Timer control: starts on mount, stops on submission
  const [timerRunning, setTimerRunning] = useState(false);
  const [solveTimeMs, setSolveTimeMs] = useState(0);

  // Server response after submission
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // The correct ordering returned by the server (used to compute per-card
  // status by comparing each card's position against this reference)
  const [correctOrder, setCorrectOrder] = useState<string[]>([]);

  // Whether the result modal should be displayed after submission
  const [showModal, setShowModal] = useState(false);

  // Queue of achievements to display as sequential slide-in toasts.
  // The first item in the queue is rendered; on dismiss it is removed
  // and the next achievement (if any) takes its place.
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);

  // ─── Shuffle on mount / puzzle change ───────────────────────────────────
  // Fisher-Yates shuffle creates a random initial ordering for the player.
  // Also starts the timer and resets all game state.
  useEffect(() => {
    setItems(shuffle(puzzle.events));
    setGameWon(false);
    setHintsLeft(MAX_HINTS);
    setHintedEventIds(new Set());
    setHintMessage(null);
    setLockedItems(new Set());
    setSelectedIndex(-1);
    setTimerRunning(true);
    setSolveTimeMs(0);
    setResult(null);
    setCorrectOrder([]);
    setShowModal(false);
    setAchievementQueue([]);
    setSubmitting(false);
  }, [puzzle]);

  // ─── DnD Sensors ───────────────────────────────────────────────────────
  // PointerSensor with a 5px distance activation constraint prevents
  // accidental drags when the user intends to click/tap. KeyboardSensor
  // enables arrow-key reordering for accessibility.
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  const sensors = useSensors(pointerSensor, keyboardSensor);

  // ─── Drag End Handler ──────────────────────────────────────────────────
  // When a drag completes, reorder the items array using arrayMove from
  // @dnd-kit/sortable. This moves the dragged item from its old index
  // to the index of the item it was dropped onto.
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      // If dropped outside the list or onto itself, do nothing
      if (!over || active.id === over.id) return;

      setItems((prev) => {
        const oldIndex = prev.findIndex((item) => item.id === active.id);
        const newIndex = prev.findIndex((item) => item.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });

      // Clear any tap-to-swap selection since the user is using drag instead
      setSelectedIndex(-1);
    },
    []
  );

  // ─── Tap-to-Swap Handler ──────────────────────────────────────────────
  // Implements a two-tap swap mechanism for mobile users who find dragging
  // difficult. First tap selects a card, second tap on a different card
  // swaps their positions. Tapping the same card deselects it.
  // After the game is won, tapping a card with a URL opens it instead.
  const handleCardClick = useCallback(
    (index: number) => {
      if (gameWon) {
        // After winning, clicking a card opens its source URL (if any)
        const event = items[index];
        if (event?.url) {
          window.open(event.url, "_blank", "noopener,noreferrer");
        }
        return;
      }

      if (selectedIndex === -1) {
        // No card selected yet — select this one
        setSelectedIndex(index);
      } else if (selectedIndex === index) {
        // Same card tapped again — deselect
        setSelectedIndex(-1);
      } else {
        // Different card tapped — swap the two positions
        setItems((prev) => {
          const copy = [...prev];
          [copy[selectedIndex], copy[index]] = [copy[index], copy[selectedIndex]];
          return copy;
        });
        setSelectedIndex(-1);
      }
    },
    [gameWon, items, selectedIndex]
  );

  // ─── Lock Toggle ──────────────────────────────────────────────────────
  // Toggles whether a card is locked in its current position. Locked cards
  // cannot be dragged and are visually distinguished with a navy border.
  const handleToggleLock = useCallback(
    (eventId: string) => {
      if (gameWon) return;
      setLockedItems((prev) => {
        const next = new Set(prev);
        if (next.has(eventId)) {
          next.delete(eventId);
        } else {
          next.add(eventId);
        }
        return next;
      });
    },
    [gameWon]
  );

  // ─── Hint Handler ─────────────────────────────────────────────────────
  // Placeholder: reveals the date for one incorrectly-placed card.
  // Full hint logic requires server integration (Phase 5) to know which
  // cards are in the wrong position. For now, shows a message.
  const handleHint = useCallback(() => {
    if (gameWon || hintsLeft <= 0) return;

    // Placeholder message until server integration is available
    setHintMessage("Hints available after server integration");

    // Auto-dismiss the hint message after 3 seconds
    setTimeout(() => setHintMessage(null), 3000);
  }, [gameWon, hintsLeft]);

  // ─── Submit Handler ───────────────────────────────────────────────────
  // Sends the player's current ordering to the server for validation.
  // On success, stops the timer, records the result, and triggers the
  // game-won state (which reveals dates and shows the score).
  const handleSubmit = useCallback(async () => {
    if (submitting || gameWon) return;

    setSubmitting(true);
    setTimerRunning(false);

    try {
      const orderedIds = items.map((item) => item.id);
      const hintsUsed = MAX_HINTS - hintsLeft;
      const submitResult = await onSubmit(orderedIds, hintsUsed, solveTimeMs);

      setResult(submitResult);
      setCorrectOrder(submitResult.correctOrder);

      if (submitResult.won) {
        setGameWon(true);
      }

      // Queue achievements for sequential toast display via AchievementToast
      if (submitResult.newAchievements.length > 0) {
        setAchievementQueue(submitResult.newAchievements);
      }

      setShowModal(true);
    } catch (error) {
      // Re-enable the timer so the player can try again
      setTimerRunning(true);
      console.error("Submit failed:", error);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, gameWon, items, hintsLeft, solveTimeMs, onSubmit]);

  // ─── Retry Handler ────────────────────────────────────────────────────
  // Re-shuffles the events and resets all game state so the player can
  // attempt the same puzzle again with a fresh arrangement.
  const handleRetry = useCallback(() => {
    setItems(shuffle(puzzle.events));
    setGameWon(false);
    setHintsLeft(MAX_HINTS);
    setHintedEventIds(new Set());
    setHintMessage(null);
    setLockedItems(new Set());
    setSelectedIndex(-1);
    setTimerRunning(true);
    setSolveTimeMs(0);
    setResult(null);
    setCorrectOrder([]);
    setShowModal(false);
    setAchievementQueue([]);
    setSubmitting(false);
  }, [puzzle.events]);

  // ─── Card Status Computation ──────────────────────────────────────────
  // After submission, compares each card's position against the server's
  // correct ordering to determine if it's in the right spot.
  const getCardStatus = useCallback(
    (eventId: string, index: number): "correct" | "incorrect" | null => {
      // No status during play — only computed after submission
      if (correctOrder.length === 0) return null;
      return correctOrder[index] === eventId ? "correct" : "incorrect";
    },
    [correctOrder]
  );

  // Memoize the number of hints used for display
  const hintsUsed = MAX_HINTS - hintsLeft;

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      {/* ── Header: category label + daily badge + timer ────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-navy/10 px-3 py-1 text-xs font-semibold tracking-wide text-navy uppercase">
            {puzzle.category}
          </span>
          {/* Daily Challenge badge — rendered only when the puzzle is today's daily */}
          {isDaily && (
            <span className="rounded-full bg-navy px-3 py-1 text-xs font-semibold tracking-wide text-white">
              Daily Challenge
            </span>
          )}
        </div>
        <GameTimer running={timerRunning} onTimeUpdate={setSolveTimeMs} />
      </div>

      {/* ── Instructions (hidden after game ends) ──────────────────────── */}
      {!gameWon && !result && (
        <p className="text-center text-sm text-gray-500">
          Arrange these events in chronological order — earliest at top,
          most recent at bottom.
        </p>
      )}

      {/* ── Result banner (shown after submission) ─────────────────────── */}
      {result && (
        <div
          className={`rounded-lg p-3 text-center text-sm font-medium ${
            result.won
              ? "bg-lime/20 text-navy"
              : "bg-red-50 text-red-700"
          }`}
        >
          {result.won
            ? `Correct! Score: ${result.score} — XP earned: ${result.xpEarned}`
            : `Not quite right. Score: ${result.score}/5`}
        </div>
      )}

      {/* ── Sortable card list with timeline connector line ─────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="relative space-y-2">
            {/* Vertical timeline line behind the cards. Positioned absolutely
                to span the full height of the card list, creating a visual
                connection between events on the timeline. */}
            <div className="absolute top-4 bottom-4 left-[1.35rem] w-0.5 bg-border" />

            {items.map((event, index) => (
              <GameCard
                key={event.id}
                event={event}
                index={index}
                gameWon={gameWon}
                isHinted={hintedEventIds.has(event.id)}
                isLocked={lockedItems.has(event.id)}
                isSelected={selectedIndex === index}
                status={getCardStatus(event.id, index)}
                onToggleLock={handleToggleLock}
                onClick={() => handleCardClick(index)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* ── Hint message toast ─────────────────────────────────────────── */}
      {hintMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-navy/5 p-3 text-sm text-navy/70">
          <InfoIcon size={16} />
          <span>{hintMessage}</span>
        </div>
      )}

      {/* ── Action area ────────────────────────────────────────────────── */}
      {/* During play: hint button + submit button
          After game: score summary + retry/next buttons */}
      <div className="flex items-center justify-between gap-3">
        {!result ? (
          <>
            {/* Hint button: shows remaining count, disabled when none left */}
            <button
              type="button"
              onClick={handleHint}
              disabled={hintsLeft <= 0 || gameWon}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-navy/70 transition-colors hover:bg-navy/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <LightbulbIcon size={16} />
              <span>Hint ({hintsLeft})</span>
            </button>

            {/* Submit button: sends the current ordering for validation */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-lg bg-navy px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <span>Checking...</span>
              ) : (
                <>
                  <CheckIcon size={16} />
                  <span>Submit</span>
                </>
              )}
            </button>
          </>
        ) : (
          <>
            {/* Retry button: re-shuffles and restarts the same puzzle */}
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-navy/70 transition-colors hover:bg-navy/5"
            >
              <RefreshCwIcon size={16} />
              <span>Retry</span>
            </button>

            {/* Next puzzle button: navigates to a different puzzle */}
            <button
              type="button"
              onClick={onNextPuzzle}
              className="flex items-center gap-1.5 rounded-lg bg-lime px-5 py-2 text-sm font-semibold text-navy transition-colors hover:bg-lime/90"
            >
              <span>Next Puzzle</span>
              <ArrowRightIcon size={16} />
            </button>
          </>
        )}
      </div>

      {/* ── Mobile tip footer ──────────────────────────────────────────── */}
      {!gameWon && !result && (
        <p className="text-center text-xs text-gray-400">
          <span className="sm:hidden">
            Tap two cards to swap, or drag the grip icon to reorder.
          </span>
          <span className="hidden sm:inline">
            Drag the grip icon to reorder, or click two cards to swap them.
          </span>
        </p>
      )}

      {/* ── Result Modal ───────────────────────────────────────────────── */}
      {/* Shown as a full-screen overlay after submission. Win state shows
          XP earned, achievements, and a review button. Loss state shows
          score and a retry button. */}
      {showModal && result && (
        <ResultModal
          result={result}
          totalEvents={puzzle.events.length}
          onRetry={handleRetry}
          onReview={() => setShowModal(false)}
        />
      )}

      {/* ── Achievement Toasts ─────────────────────────────────────────── */}
      {/* Renders the first achievement in the queue as a slide-in toast.
          When dismissed (manually or via auto-timer), the first item is
          removed from the queue, causing the next achievement to render. */}
      {achievementQueue.length > 0 && (
        <AchievementToast
          key={achievementQueue[0].id}
          achievement={achievementQueue[0]}
          onDismiss={() =>
            setAchievementQueue((prev) => prev.slice(1))
          }
        />
      )}
    </div>
  );
}
