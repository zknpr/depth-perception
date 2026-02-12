"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { StatsGrid } from "@/components/stats-grid";
import { AchievementGrid } from "@/components/achievement-grid";
import { XP_PER_LEVEL } from "@/lib/constants";
import type { PlayerStats, UserAchievement } from "@/types";

// ─── RecentGame Type ─────────────────────────────────────────────────────────
// Represents a single game result in the recent history list. Matches the
// shape returned by GET /api/stats/me in the `recentGames` array.
interface RecentGame {
  id: string;
  puzzleId: string;
  won: boolean;
  score: number;
  hintsUsed: number;
  solveTimeMs: number;
  playedAt: string;
}

// ─── API Response Shape ──────────────────────────────────────────────────────
// Full response from GET /api/stats/me, combining PlayerStats fields with
// the achievements array and recent game history.
interface StatsResponse extends PlayerStats {
  achievements: UserAchievement[];
  recentGames: RecentGame[];
}

// ─── Time Formatting ─────────────────────────────────────────────────────────
// Converts milliseconds to a short human-readable string for the recent games
// list. Same format as StatsGrid: "45s" for under 60s, "1:23" for 60s+.
function formatTime(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// ─── Date Formatting ─────────────────────────────────────────────────────────
// Formats an ISO date string into a short locale-aware date (e.g. "Feb 12").
// Uses the browser's locale for internationalization.
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ─── Profile Page ────────────────────────────────────────────────────────────
// Authenticated-only page displaying the player's complete profile:
// - XP progress bar with level indicator
// - Stats grid (games, wins, streaks, times, XP, level)
// - Achievement grid (unlocked vs. locked)
// - Recent games list (last 20 games with outcome and details)
//
// Redirects unauthenticated users to the home page.
export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();

  // Stats data fetched from the API, null while loading
  const [data, setData] = useState<StatsResponse | null>(null);

  // Loading state tracks the API fetch
  const [loading, setLoading] = useState(true);

  // Error message displayed when the API call fails
  const [error, setError] = useState<string | null>(null);

  // ─── Auth Guard ──────────────────────────────────────────────────────────
  // Redirect unauthenticated users to the home page. The check runs
  // whenever the session status changes. During "loading" state we wait
  // to avoid premature redirects.
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // ─── Fetch Stats ─────────────────────────────────────────────────────────
  // Once authenticated, fetch the player's stats from the API. Uses an
  // abort controller for cleanup on unmount to prevent state updates on
  // an unmounted component.
  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;

    async function fetchStats() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/stats/me");

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || `Failed to load stats (${res.status})`);
        }

        const json: StatsResponse = await res.json();

        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load stats"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, [status]);

  // ─── Auth Loading State ──────────────────────────────────────────────────
  // Show a spinner while NextAuth resolves the session to avoid flashing
  // content or triggering a premature redirect.
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy/20 border-t-navy" />
          <p className="mt-4 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // ─── Data Loading State ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy/20 border-t-navy" />
          <p className="mt-4 text-sm text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  // ─── Error State ─────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm text-red-600">{error || "No data available"}</p>
        </div>
      </div>
    );
  }

  // ─── XP Progress Calculation ─────────────────────────────────────────────
  // Level N requires N * XP_PER_LEVEL total XP. The progress bar shows
  // how far the player is toward the next level.
  const currentLevelXp = data.level * XP_PER_LEVEL;
  const nextLevelXp = (data.level + 1) * XP_PER_LEVEL;
  const xpIntoLevel = data.xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const progressPercent = Math.min((xpIntoLevel / xpNeeded) * 100, 100);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <h1 className="text-2xl font-bold text-navy">Your Profile</h1>

      {/* ── XP Progress Bar ──────────────────────────────────────────────── */}
      {/* Shows the current level, XP progress toward next level, and a
          visual bar. The bar fills from left to right proportional to the
          XP earned within the current level bracket. */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-lg font-bold text-navy">
            Level {data.level}
          </span>
          <span className="text-sm text-gray-500">
            {xpIntoLevel} / {xpNeeded} XP to next level
          </span>
        </div>

        {/* Progress bar track (gray) with fill (lime) */}
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-lime transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Total XP display below the progress bar */}
        <p className="mt-2 text-xs text-gray-400">
          Total XP: {data.xp.toLocaleString()}
        </p>
      </div>

      {/* ── Stats Grid ───────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-navy">Statistics</h2>
        <StatsGrid stats={data} />
      </div>

      {/* ── Achievement Grid ─────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-navy">Achievements</h2>
        <AchievementGrid unlockedAchievements={data.achievements} />
      </div>

      {/* ── Recent Games ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-navy">Recent Games</h2>

        {data.recentGames.length === 0 ? (
          // Empty state when no games have been played yet
          <p className="text-sm text-gray-500">
            No games played yet. Start playing to see your history!
          </p>
        ) : (
          <div className="space-y-2">
            {data.recentGames.map((game) => (
              <div
                key={game.id}
                className="flex items-center justify-between rounded-lg border border-border bg-white p-3 shadow-sm"
              >
                {/* Left side: puzzle ID, win/loss badge */}
                <div className="flex items-center gap-3">
                  {/* Win/Loss badge — green for wins, red for losses */}
                  <span
                    className={`
                      rounded-full px-2 py-0.5 text-xs font-semibold
                      ${
                        game.won
                          ? "bg-lime/20 text-green-700"
                          : "bg-red-50 text-red-600"
                      }
                    `}
                  >
                    {game.won ? "Won" : "Lost"}
                  </span>

                  {/* Puzzle identifier — truncated to avoid overflow */}
                  <span className="text-sm font-medium text-navy">
                    Puzzle {game.puzzleId.slice(0, 8)}
                  </span>
                </div>

                {/* Right side: score, time, hints, date */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {/* Score out of total events */}
                  <span>Score: {game.score}/5</span>

                  {/* Solve time formatted as human-readable */}
                  <span>{formatTime(game.solveTimeMs)}</span>

                  {/* Hints used count */}
                  <span>
                    {game.hintsUsed} hint{game.hintsUsed !== 1 ? "s" : ""}
                  </span>

                  {/* Date of the game */}
                  <span className="hidden sm:inline">
                    {formatDate(game.playedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
