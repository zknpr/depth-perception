"use client";

import { useEffect, useState } from "react";
import { LeaderboardTable } from "@/components/leaderboard-table";
import type { LeaderboardEntry } from "@/types";

// ─── Sort Options ────────────────────────────────────────────────────────────
// Defines the three available sort modes for the leaderboard. Each option has
// a `value` matching the API query parameter and a `label` for the toggle
// button text.
const SORT_OPTIONS = [
  { value: "xp", label: "Top XP" },
  { value: "streak", label: "Current Streak" },
  { value: "best_streak", label: "Best Streak" },
] as const;

// Type alias for valid sort values extracted from the SORT_OPTIONS constant
type SortValue = (typeof SORT_OPTIONS)[number]["value"];

// ─── Leaderboard Page ────────────────────────────────────────────────────────
// Public page (no auth required) displaying ranked player standings. Players
// can toggle between three sort modes: Top XP, Current Streak, and Best
// Streak. Data is fetched from GET /api/stats/leaderboard?sort={mode}.
//
// The page handles loading, empty, and error states gracefully.
export default function LeaderboardPage() {
  // Active sort mode, defaults to "xp" (Top XP)
  const [sortBy, setSortBy] = useState<SortValue>("xp");

  // Leaderboard entries fetched from the API
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  // Loading state tracks the API fetch
  const [loading, setLoading] = useState(true);

  // Error message displayed when the API call fails
  const [error, setError] = useState<string | null>(null);

  // Counter incremented to force a re-fetch (used by the retry button when
  // the sortBy value hasn't changed, since React skips state updates when
  // the new value equals the current value for primitives)
  const [fetchKey, setFetchKey] = useState(0);

  // ─── Fetch Leaderboard Data ──────────────────────────────────────────────
  // Re-fetches whenever sortBy or fetchKey changes. Uses a cancelled flag to
  // prevent state updates after unmount or when a newer fetch supersedes a
  // stale one (e.g., rapid sort toggling).
  useEffect(() => {
    let cancelled = false;

    async function doFetch() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/stats/leaderboard?sort=${sortBy}`);

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.error || `Failed to load leaderboard (${res.status})`
          );
        }

        const json: LeaderboardEntry[] = await res.json();

        if (!cancelled) {
          setEntries(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load leaderboard"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    doFetch();

    return () => {
      cancelled = true;
    };
  }, [sortBy, fetchKey]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <h1 className="text-2xl font-bold text-navy">Leaderboard</h1>

      {/* ── Sort Toggle Buttons ──────────────────────────────────────────── */}
      {/* Three buttons for switching between sort modes. The active button
          gets a navy background with white text; inactive buttons are
          outlined with navy/10 background on hover. */}
      <div className="flex gap-2">
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSortBy(option.value)}
            className={`
              rounded-lg px-4 py-2 text-sm font-medium transition-colors
              ${
                sortBy === option.value
                  ? "bg-navy text-white"
                  : "border border-border bg-white text-gray-600 hover:bg-gray-50"
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* ── Loading State ────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy/20 border-t-navy" />
          <p className="mt-4 text-sm text-gray-500">Loading leaderboard...</p>
        </div>
      )}

      {/* ── Error State ──────────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => setFetchKey((k) => k + 1)}
            className="mt-4 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy/90"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── Empty State ──────────────────────────────────────────────────── */}
      {!loading && !error && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-lg font-semibold text-navy">No rankings yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Be the first to play and claim the top spot!
          </p>
        </div>
      )}

      {/* ── Leaderboard Table ────────────────────────────────────────────── */}
      {!loading && !error && entries.length > 0 && (
        <LeaderboardTable entries={entries} sortBy={sortBy} />
      )}
    </div>
  );
}
