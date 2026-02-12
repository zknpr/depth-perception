"use client";

import { useEffect, useState } from "react";
import type { Achievement } from "@/types";

// ─── Props ───────────────────────────────────────────────────────────────────
// `achievement` — the achievement data to display (icon, title, description, XP)
// `onDismiss` — callback fired when the toast should be removed from the queue,
//   either via auto-dismiss timer or manual close
interface AchievementToastProps {
  achievement: Achievement;
  onDismiss: () => void;
}

// ─── Star SVG Icon ───────────────────────────────────────────────────────────
// Decorative star icon rendered next to the "Achievement Unlocked!" label.
// Used as a fallback visual element alongside the achievement's own icon string.
function StarIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

// ─── Close (X) Icon ──────────────────────────────────────────────────────────
// Small X icon for the manual dismiss button in the top-right corner.
function CloseIcon({ size = 14 }: { size?: number }) {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// AchievementToast slides in from the right side of the screen to notify
// the player that they've unlocked an achievement. It auto-dismisses after
// 4 seconds and can also be manually closed.
//
// Animation approach: The component mounts with `translate-x-full` (off-screen
// right) and transitions to `translate-x-0` on the next frame via a state
// toggle. This avoids needing CSS keyframe animations or a third-party
// animation library. The `visible` state is toggled after a 50ms delay to
// ensure the initial off-screen position is painted before the transition
// begins (otherwise the browser may batch the paint and skip the animation).
export function AchievementToast({
  achievement,
  onDismiss,
}: AchievementToastProps) {
  // Controls the slide-in animation. Starts false (off-screen) and
  // transitions to true (on-screen) after mount.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay to ensure the initial off-screen transform is painted
    // before transitioning to on-screen. Without this, the browser may
    // batch the layout and skip the animation entirely.
    const showTimer = setTimeout(() => setVisible(true), 50);

    // Auto-dismiss after 4 seconds. Slides out first, then calls onDismiss
    // after the exit animation completes.
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      // Wait for the slide-out transition (300ms) to complete before
      // removing the component from the DOM via onDismiss
      setTimeout(onDismiss, 300);
    }, 4000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  // Manual dismiss handler: triggers slide-out then removal
  const handleClose = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`
        fixed top-20 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]
        rounded-lg border-2 border-lime bg-white shadow-lg
        transition-transform duration-300 ease-out
        ${visible ? "translate-x-0" : "translate-x-[calc(100%+1rem)]"}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="relative p-4">
        {/* Manual close button positioned in the top-right corner */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-2 right-2 rounded p-1 text-gray-400 transition-colors hover:text-gray-600"
          aria-label="Dismiss achievement notification"
        >
          <CloseIcon />
        </button>

        <div className="flex items-start gap-3 pr-6">
          {/* Achievement icon — rendered as a text emoji/character string
              from the database. Displayed in a lime-tinted circle. */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lime/20 text-lg">
            {achievement.icon}
          </div>

          <div className="min-w-0 space-y-1">
            {/* Header line with star icon and "Achievement Unlocked!" label */}
            <div className="flex items-center gap-1 text-lime-600">
              <StarIcon size={14} />
              <span className="text-xs font-bold uppercase tracking-wide">
                Achievement Unlocked!
              </span>
            </div>

            {/* Achievement title */}
            <p className="text-sm font-semibold text-navy">
              {achievement.title}
            </p>

            {/* Achievement description */}
            <p className="text-xs text-gray-500">{achievement.description}</p>

            {/* XP reward badge */}
            <span className="inline-block rounded-full bg-lime/20 px-2 py-0.5 text-xs font-semibold text-navy">
              +{achievement.xpReward} XP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
