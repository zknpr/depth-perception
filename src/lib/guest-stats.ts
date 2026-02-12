import { GUEST_STATS_KEY } from "@/lib/constants";
import type { GuestStats, GuestGameResult } from "@/types";

// ─── Default empty guest stats ───────────────────────────────────────────────
// Used when no localStorage entry exists or when running on the server (SSR).
const EMPTY_GUEST_STATS: GuestStats = {
  gamesPlayed: 0,
  wins: 0,
  currentStreak: 0,
  bestStreak: 0,
  results: [],
};

// ─── SSR Guard ───────────────────────────────────────────────────────────────
// Returns true when running in a browser environment. All localStorage
// operations must be gated behind this check to avoid ReferenceError during
// server-side rendering or static generation.
function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// ─── getGuestStats ───────────────────────────────────────────────────────────
// Reads the guest stats object from localStorage. Returns the default empty
// stats if the key does not exist, the data is corrupt, or we are running
// on the server. Parsing errors are caught and fall through to the empty
// default to prevent a broken UI from bad localStorage data.
export function getGuestStats(): GuestStats {
  if (!isBrowser()) return { ...EMPTY_GUEST_STATS, results: [] };

  try {
    const raw = localStorage.getItem(GUEST_STATS_KEY);
    if (!raw) return { ...EMPTY_GUEST_STATS, results: [] };

    const parsed = JSON.parse(raw) as GuestStats;

    // Basic shape validation: ensure `results` is an array
    if (!Array.isArray(parsed.results)) {
      return { ...EMPTY_GUEST_STATS, results: [] };
    }

    return parsed;
  } catch {
    // Corrupt or unreadable data — treat as empty
    return { ...EMPTY_GUEST_STATS, results: [] };
  }
}

// ─── recordGuestResult ───────────────────────────────────────────────────────
// Appends a new game result to the guest stats, updates aggregate counters
// (gamesPlayed, wins, currentStreak, bestStreak), and persists the updated
// stats back to localStorage. This is the primary write path for guest users
// after each game submission.
export function recordGuestResult(result: GuestGameResult): void {
  if (!isBrowser()) return;

  const stats = getGuestStats();

  // Append the new result to the history
  stats.results.push(result);

  // Update aggregate counters
  stats.gamesPlayed += 1;

  if (result.won) {
    stats.wins += 1;
    stats.currentStreak += 1;
    // Update best streak if the current streak exceeds it
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak;
    }
  } else {
    // A loss resets the current streak to zero
    stats.currentStreak = 0;
  }

  try {
    localStorage.setItem(GUEST_STATS_KEY, JSON.stringify(stats));
  } catch {
    // localStorage may be full or blocked — fail silently since this is
    // a non-critical operation for guest users
    console.warn("Failed to persist guest stats to localStorage");
  }
}

// ─── clearGuestStats ─────────────────────────────────────────────────────────
// Removes the guest stats key from localStorage. Called after a successful
// migration of guest results to the server (i.e. after the user connects
// a wallet and the migration API confirms the import).
export function clearGuestStats(): void {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(GUEST_STATS_KEY);
  } catch {
    // Removal failure is non-critical — log and continue
    console.warn("Failed to clear guest stats from localStorage");
  }
}
