"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { getGuestStats, clearGuestStats } from "@/lib/guest-stats";

// MigrationHandler is an invisible component (renders no DOM) that
// monitors the NextAuth session status. When the user transitions from
// unauthenticated to authenticated (i.e. connects a wallet), it checks
// for guest stats in localStorage. If any guest game results exist, it
// POSTs them to the /api/game/migrate endpoint to persist them under the
// newly authenticated user, then clears localStorage.
//
// Design decisions:
// - Fire-and-forget: the migration is non-blocking. Failures are logged
//   but do not interrupt the user experience.
// - Run-once guard: a useRef flag prevents duplicate migration attempts
//   during React strict-mode double-renders or rapid re-renders.
// - Render nothing: this component is purely a side-effect hook wrapper.
export function MigrationHandler() {
  const { status } = useSession();

  // Guard ref to ensure migration runs at most once per mount cycle.
  // Without this, React StrictMode's double-effect or rapid session
  // status transitions could trigger duplicate POSTs.
  const hasMigrated = useRef(false);

  useEffect(() => {
    // Only proceed when the session is definitively authenticated
    // and we haven't already attempted migration this mount cycle
    if (status !== "authenticated" || hasMigrated.current) return;

    // Mark as migrated immediately to prevent concurrent attempts
    hasMigrated.current = true;

    const guestStats = getGuestStats();

    // No results to migrate — nothing to do
    if (guestStats.results.length === 0) return;

    // Fire-and-forget: POST guest results to the migration endpoint.
    // We intentionally do not await this — it runs in the background
    // and should not block rendering or navigation.
    fetch("/api/game/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: guestStats.results }),
    })
      .then((res) => {
        if (res.ok) {
          // Migration succeeded — clear localStorage to prevent
          // re-migration on future sessions
          clearGuestStats();
        } else {
          // Non-OK response — log but do not retry automatically.
          // The guest stats remain in localStorage so a future
          // session can attempt migration again.
          console.warn("Guest stats migration failed with status:", res.status);
          // Reset the guard so migration can be re-attempted on the
          // next session status transition
          hasMigrated.current = false;
        }
      })
      .catch((err) => {
        // Network error — log and preserve localStorage for retry
        console.warn("Guest stats migration request failed:", err);
        hasMigrated.current = false;
      });
  }, [status]);

  // This component renders nothing — it exists solely for the side effect
  return null;
}
