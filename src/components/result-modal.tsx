"use client";

import type { SubmitResult } from "@/types";

// ─── Props ───────────────────────────────────────────────────────────────────
// `result` — the server response from submitting the puzzle answer
// `totalEvents` — total number of events in the puzzle (used for score display)
// `onRetry` — callback to re-shuffle and retry the same puzzle
// `onReview` — callback to dismiss the modal and review the results/stories
interface ResultModalProps {
  result: SubmitResult;
  totalEvents: number;
  onRetry: () => void;
  onReview: () => void;
}

// ─── Trophy SVG Icon ─────────────────────────────────────────────────────────
// Displayed in the win state header to celebrate the player's success.
function TrophyIcon({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

// ─── Refresh SVG Icon ────────────────────────────────────────────────────────
// Displayed in the loss state header to suggest trying again.
function RefreshIcon({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
    </svg>
  );
}

// ResultModal displays a full-screen overlay with a centered card that shows
// the outcome of the player's puzzle submission. Two distinct visual states:
//
// Win: Trophy icon, "Timeline Mastered!" heading, XP earned, list of any
//      newly unlocked achievements, and a "Review & Read Stories" button.
//
// Loss: Refresh icon, "Keep Trying!" heading, score fraction (e.g. 3/5),
//       and a "Keep Trying" retry button.
//
// The overlay is semi-transparent and prevents interaction with content
// behind it. Clicking outside the card does not dismiss — the player must
// use one of the action buttons.
export function ResultModal({
  result,
  totalEvents,
  onRetry,
  onReview,
}: ResultModalProps) {
  return (
    // Full-screen overlay with centered content. The backdrop is a
    // semi-transparent dark layer that dims the game board behind the modal.
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      {/* Modal card — max-width prevents it from stretching on wide screens */}
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {result.won ? (
          // ── Win State ──────────────────────────────────────────────────
          <div className="space-y-5 text-center">
            {/* Trophy icon in a lime-tinted circle */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-lime/20 text-lime-600">
              <TrophyIcon />
            </div>

            {/* Heading and XP display */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-navy">
                Timeline Mastered!
              </h2>
              <p className="text-gray-500">
                You placed all events in the correct order.
              </p>
            </div>

            {/* XP earned badge */}
            <div className="inline-block rounded-full bg-lime/20 px-4 py-2 text-lg font-bold text-navy">
              +{result.xpEarned} XP
            </div>

            {/* Achievements list (only if any were unlocked this game) */}
            {result.newAchievements.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                  Achievements Unlocked
                </h3>
                <div className="space-y-2">
                  {result.newAchievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="flex items-center gap-3 rounded-lg border border-lime/30 bg-lime/5 p-3"
                    >
                      {/* Achievement icon */}
                      <span className="text-xl">{achievement.icon}</span>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-navy">
                          {achievement.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {achievement.description}
                        </p>
                      </div>
                      {/* Achievement XP reward */}
                      <span className="ml-auto shrink-0 text-xs font-semibold text-navy">
                        +{achievement.xpReward} XP
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Primary action: review the timeline and read event stories */}
            <button
              type="button"
              onClick={onReview}
              className="w-full rounded-lg bg-lime px-5 py-3 text-sm font-semibold text-navy transition-colors hover:bg-lime/90"
            >
              Review &amp; Read Stories
            </button>
          </div>
        ) : (
          // ── Loss State ─────────────────────────────────────────────────
          <div className="space-y-5 text-center">
            {/* Refresh icon in a red-tinted circle */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-400">
              <RefreshIcon />
            </div>

            {/* Heading and score display */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-navy">Keep Trying!</h2>
              <p className="text-gray-500">
                You got{" "}
                <span className="font-semibold text-navy">
                  {result.score}/{totalEvents}
                </span>{" "}
                events in the right position.
              </p>
            </div>

            {/* Primary action: retry the same puzzle with a fresh shuffle */}
            <button
              type="button"
              onClick={onRetry}
              className="w-full rounded-lg bg-navy px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
            >
              Keep Trying
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
