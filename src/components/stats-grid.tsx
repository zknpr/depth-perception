"use client";

import type { PlayerStats } from "@/types";

// ─── Time Formatting ────────────────────────────────────────────────────────
// Converts milliseconds to a human-readable string.
// - Under 60 seconds: "45s"
// - 60 seconds and over: "1:23" (minutes:seconds with zero-padded seconds)
// - Null/zero input returns "--" as a placeholder for missing data
function formatTime(ms: number | null): string {
  if (ms === null || ms === 0) return "--";

  const totalSeconds = Math.round(ms / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Zero-pad seconds to always show two digits (e.g. "1:03" not "1:3")
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// ─── StatCard ────────────────────────────────────────────────────────────────
// Displays a single stat with a large value, small label, and optional subtext.
// Used internally by StatsGrid to render each metric consistently.
interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
}

function StatCard({ label, value, subtext }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
      {/* Primary value displayed large and bold */}
      <p className="text-2xl font-bold text-navy">{value}</p>

      {/* Metric label in small muted text */}
      <p className="mt-1 text-sm text-gray-500">{label}</p>

      {/* Optional subtext for additional context (e.g. win rate percentage) */}
      {subtext && (
        <p className="mt-0.5 text-xs text-gray-400">{subtext}</p>
      )}
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────
// Accepts a PlayerStats object containing all computed metrics from the API.
interface StatsGridProps {
  stats: PlayerStats;
}

// ─── StatsGrid ───────────────────────────────────────────────────────────────
// Renders a responsive grid of stat cards summarizing the player's performance.
// Layout: 2 columns on mobile, 4 columns on desktop (md+ breakpoint).
// Displays 8 metrics: Games Played, Wins, Current Streak, Best Streak,
// Avg Solve Time, Fastest Solve, Total XP, and Level.
export function StatsGrid({ stats }: StatsGridProps) {
  // Format win rate as a percentage string (e.g. "75.0%")
  const winRateText = `${(stats.winRate * 100).toFixed(1)}% win rate`;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard label="Games Played" value={stats.gamesPlayed} />

      {/* Wins card includes win rate as subtext for context */}
      <StatCard label="Wins" value={stats.wins} subtext={winRateText} />

      <StatCard label="Current Streak" value={stats.currentStreak} />
      <StatCard label="Best Streak" value={stats.bestStreak} />

      {/* Solve times are stored in ms and formatted to human-readable strings */}
      <StatCard
        label="Avg Solve Time"
        value={formatTime(stats.avgSolveTimeMs)}
      />
      <StatCard
        label="Fastest Solve"
        value={formatTime(stats.fastestSolveTimeMs)}
      />

      <StatCard label="Total XP" value={stats.xp.toLocaleString()} />
      <StatCard label="Level" value={stats.level} />
    </div>
  );
}
