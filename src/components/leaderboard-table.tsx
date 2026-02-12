"use client";

import type { LeaderboardEntry } from "@/types";

// ─── Wallet Truncation ───────────────────────────────────────────────────────
// Truncates an Ethereum wallet address to "0x1234...abcd" format for display.
// Takes the first 6 characters (including "0x" prefix) and the last 4
// characters, joining them with an ellipsis. This keeps addresses recognizable
// while fitting in table cells.
function truncateWallet(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ─── Sort Label Mapping ──────────────────────────────────────────────────────
// Maps the sort query parameter to the column header text displayed above the
// value column. This keeps the table header dynamic based on the active sort.
function getSortLabel(sortBy: string): string {
  switch (sortBy) {
    case "xp":
      return "XP";
    case "streak":
      return "Current Streak";
    case "best_streak":
      return "Best Streak";
    default:
      return "XP";
  }
}

// ─── Sort Value Extraction ───────────────────────────────────────────────────
// Extracts the relevant numeric value from a leaderboard entry based on the
// active sort mode. Formats XP with locale separators for readability.
function getSortValue(entry: LeaderboardEntry, sortBy: string): string {
  switch (sortBy) {
    case "xp":
      return entry.xp.toLocaleString();
    case "streak":
      return entry.currentStreak.toString();
    case "best_streak":
      return entry.bestStreak.toString();
    default:
      return entry.xp.toLocaleString();
  }
}

// ─── Props ───────────────────────────────────────────────────────────────────
// `entries` — array of LeaderboardEntry objects from the API, pre-sorted and
//             ranked by the server.
// `sortBy` — the current sort mode ("xp", "streak", or "best_streak") which
//            determines which value column to display.
interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  sortBy: string;
}

// ─── LeaderboardTable ────────────────────────────────────────────────────────
// Renders a ranked table of players with three columns: rank number, player
// identifier (ENS name or truncated wallet), and the value for the currently
// selected sort metric. The current user's row is highlighted with a lime
// background and a "You" badge for quick identification.
export function LeaderboardTable({ entries, sortBy }: LeaderboardTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        {/* ── Table Header ──────────────────────────────────────────────── */}
        <thead>
          <tr className="border-b border-border bg-gray-50">
            <th className="px-4 py-3 font-semibold text-gray-500">Rank</th>
            <th className="px-4 py-3 font-semibold text-gray-500">Player</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-500">
              {getSortLabel(sortBy)}
            </th>
          </tr>
        </thead>

        {/* ── Table Body ────────────────────────────────────────────────── */}
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.walletAddress}
              className={`
                border-b border-border last:border-b-0 transition-colors
                ${
                  entry.isCurrentUser
                    ? "bg-lime/15"
                    : "hover:bg-gray-50"
                }
              `}
            >
              {/* Rank column: numeric position with special styling for top 3 */}
              <td className="px-4 py-3 font-mono font-semibold text-navy">
                {entry.rank <= 3 ? (
                  // Top 3 ranks get a colored circle badge for emphasis
                  <span
                    className={`
                      inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold
                      ${entry.rank === 1 ? "bg-yellow-100 text-yellow-700" : ""}
                      ${entry.rank === 2 ? "bg-gray-200 text-gray-600" : ""}
                      ${entry.rank === 3 ? "bg-orange-100 text-orange-700" : ""}
                    `}
                  >
                    {entry.rank}
                  </span>
                ) : (
                  // Ranks 4+ displayed as plain text
                  <span className="text-gray-500">{entry.rank}</span>
                )}
              </td>

              {/* Player column: ENS name (preferred) or truncated wallet address */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-navy">
                    {entry.ensName || truncateWallet(entry.walletAddress)}
                  </span>

                  {/* "You" badge displayed next to the current user's name
                      for quick identification in the leaderboard */}
                  {entry.isCurrentUser && (
                    <span className="rounded-full bg-lime px-2 py-0.5 text-xs font-semibold text-navy">
                      You
                    </span>
                  )}
                </div>
              </td>

              {/* Value column: displays the metric corresponding to the active sort */}
              <td className="px-4 py-3 text-right font-semibold text-navy">
                {getSortValue(entry, sortBy)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
