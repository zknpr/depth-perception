"use client";

import { useEffect, useRef, useState } from "react";

// ─── Props ───────────────────────────────────────────────────────────────────
// `running` controls whether the timer is actively counting up.
// `onTimeUpdate` is called every tick (100ms) with the total elapsed ms,
// allowing the parent GameBoard to track solve time without owning the
// interval logic itself.

interface GameTimerProps {
  running: boolean;
  onTimeUpdate: (ms: number) => void;
}

export function GameTimer({ running, onTimeUpdate }: GameTimerProps) {
  // Total elapsed milliseconds — persists across start/stop cycles so the
  // timer can resume from where it left off if `running` toggles.
  const [elapsedMs, setElapsedMs] = useState(0);

  // Ref to the interval ID so we can clear it when `running` becomes false
  // or on unmount. Using a ref avoids stale closure issues in the cleanup.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timestamp (via performance.now()) when the current running session
  // started. Combined with elapsedMs at the time, this lets us compute
  // the current total without accumulating floating-point drift.
  const startTimeRef = useRef<number>(0);

  // Snapshot of elapsedMs at the moment `running` became true. This is
  // the baseline that the interval adds delta time onto.
  const baseElapsedRef = useRef<number>(0);

  useEffect(() => {
    if (running) {
      // Record the wall-clock start and the current elapsed baseline
      startTimeRef.current = performance.now();
      baseElapsedRef.current = elapsedMs;

      // Tick every 100ms. Each tick computes delta from start and adds
      // it to the baseline so the display is always accurate even if
      // setInterval drifts slightly.
      intervalRef.current = setInterval(() => {
        const now = performance.now();
        const delta = now - startTimeRef.current;
        const total = Math.round(baseElapsedRef.current + delta);
        setElapsedMs(total);
        onTimeUpdate(total);
      }, 100);
    } else {
      // Stop: clear the interval when running becomes false
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Cleanup on unmount or before the next effect run
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // We intentionally exclude `elapsedMs` and `onTimeUpdate` from deps:
    // - `elapsedMs` is captured via baseElapsedRef at start time
    // - `onTimeUpdate` is called inside the interval with the latest value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // ─── Format: M:SS.T ──────────────────────────────────────────────────────
  // Displays elapsed time as minutes, seconds (zero-padded), and tenths.
  // Example: 1:05.3 = 1 minute, 5 seconds, 300ms
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((elapsedMs % 1000) / 100);

  const formatted = `${minutes}:${seconds.toString().padStart(2, "0")}.${tenths}`;

  return (
    <div
      className="font-mono text-sm tabular-nums text-navy/70"
      aria-live="off"
      aria-label={`Elapsed time: ${minutes} minutes ${seconds} seconds`}
    >
      {formatted}
    </div>
  );
}
