"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PuzzleEvent } from "@/types";

// ─── Inline SVG Icons ────────────────────────────────────────────────────────
// Each icon is a pure functional component returning an SVG element sized at
// the specified width/height (default 16x16). Stroke-based icons use
// currentColor so they inherit the parent's text color via Tailwind classes.

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
      {/* Simple checkmark polyline */}
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon({ size = 16 }: { size?: number }) {
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
      {/* Two diagonal lines forming an X */}
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function GripVerticalIcon({ size = 16 }: { size?: number }) {
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
      {/* Six dots arranged in two vertical columns — the universal drag handle */}
      <circle cx="9" cy="4" r="1" fill="currentColor" />
      <circle cx="9" cy="12" r="1" fill="currentColor" />
      <circle cx="9" cy="20" r="1" fill="currentColor" />
      <circle cx="15" cy="4" r="1" fill="currentColor" />
      <circle cx="15" cy="12" r="1" fill="currentColor" />
      <circle cx="15" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}

function LockIcon({ size = 16 }: { size?: number }) {
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
      {/* Closed padlock: rectangle body + closed shackle arc */}
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UnlockIcon({ size = 16 }: { size?: number }) {
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
      {/* Open padlock: rectangle body + open shackle arc (shifted up) */}
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

function ExternalLinkIcon({ size = 16 }: { size?: number }) {
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
      {/* Arrow pointing out of a box — standard external-link icon */}
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────
// The parent GameBoard passes these down. `status` is null during play and set
// to "correct"/"incorrect" after submission when the server returns correctOrder.

interface GameCardProps {
  event: PuzzleEvent;
  index: number;
  gameWon: boolean;
  isHinted: boolean;
  isLocked: boolean;
  isSelected: boolean;
  status: "correct" | "incorrect" | null;
  onToggleLock: (eventId: string) => void;
  onClick: () => void;
}

export function GameCard({
  event,
  index,
  gameWon,
  isHinted,
  isLocked,
  isSelected,
  status,
  onToggleLock,
  onClick,
}: GameCardProps) {
  // ─── Sortable hook ──────────────────────────────────────────────────────
  // `disabled` prevents dragging when the game is won or the card is locked.
  // `setActivatorNodeRef` is applied to the drag handle so only the grip icon
  // initiates a drag — the rest of the card surface remains clickable for
  // tap-to-swap selection.
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: event.id,
    disabled: gameWon || isLocked,
  });

  // Inline transform style used by @dnd-kit to animate the card during drag
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Raise the card above siblings while dragging so it doesn't clip
    zIndex: isDragging ? 50 : undefined,
    // Slight opacity reduction while actively dragging for visual feedback
    opacity: isDragging ? 0.85 : 1,
  };

  // ─── Dynamic border/background classes ──────────────────────────────────
  // Priority: correct > incorrect > locked > selected > default.
  // Each state maps to a specific border color and optional background tint.
  const borderClasses = (() => {
    if (status === "correct") return "border-lime bg-lime/10";
    if (status === "incorrect") return "border-red-500 bg-red-500/10";
    if (isLocked) return "border-navy";
    return "border-border";
  })();

  // Selection ring shown when the user taps a card in tap-to-swap mode
  const ringClass = isSelected ? "ring-2 ring-lime ring-offset-2" : "";

  // Whether to reveal the event date — shown when a hint was used on this
  // card or after the game has been won so the player can see the timeline
  const showDate = isHinted || gameWon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      // Card click handler for tap-to-swap or URL opening (handled by parent)
      onClick={onClick}
      className={`
        relative flex items-center gap-3 rounded-xl border-2 bg-white p-3
        shadow-sm transition-all duration-200 select-none
        ${borderClasses} ${ringClass}
        ${isDragging ? "shadow-lg" : "hover:shadow-md"}
        cursor-pointer
      `}
    >
      {/* ── Position badge ─────────────────────────────────────────────── */}
      {/* Numbered circle (1-5) showing the card's current position.
          Changes color to match correct/incorrect status after submission. */}
      <div
        className={`
          flex h-8 w-8 shrink-0 items-center justify-center rounded-full
          text-sm font-bold
          ${status === "correct"
            ? "bg-lime text-navy"
            : status === "incorrect"
              ? "bg-red-500 text-white"
              : "bg-navy/10 text-navy"
          }
        `}
      >
        {index + 1}
      </div>

      {/* ── Card body: event text + optional date reveal ────────────── */}
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium text-gray-800">
          {event.text}
        </p>

        {/* Date reveal with slide-down animation. Uses a max-height transition
            so the element smoothly expands from 0 to its natural height. */}
        <div
          className={`
            overflow-hidden transition-all duration-500 ease-out
            ${showDate ? "mt-1 max-h-8 opacity-100" : "max-h-0 opacity-0"}
          `}
        >
          <span className="text-xs font-mono text-gray-500">{event.date}</span>
        </div>
      </div>

      {/* ── External link icon (visible only after winning, if URL exists) */}
      {gameWon && event.url && (
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          // Prevent the link click from also triggering the card's onClick
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 text-navy/60 transition-colors hover:text-navy"
          aria-label={`Read more about: ${event.text}`}
        >
          <ExternalLinkIcon size={16} />
        </a>
      )}

      {/* ── Lock/unlock toggle ─────────────────────────────────────────── */}
      {/* Only shown during play. Clicking locks the card in its current
          position (disabling drag) or unlocks it to allow repositioning. */}
      {!gameWon && (
        <button
          type="button"
          onClick={(e) => {
            // Stop propagation so locking doesn't also trigger tap-to-swap
            e.stopPropagation();
            onToggleLock(event.id);
          }}
          className={`
            shrink-0 rounded-md p-1.5 transition-colors
            ${isLocked
              ? "text-navy hover:text-navy/70"
              : "text-gray-400 hover:text-gray-600"
            }
          `}
          aria-label={isLocked ? "Unlock card" : "Lock card in position"}
        >
          {isLocked ? <LockIcon size={16} /> : <UnlockIcon size={16} />}
        </button>
      )}

      {/* ── Drag handle / Status icon ──────────────────────────────────── */}
      {/* During play: a GripVertical icon that serves as the drag activator.
          After game ends: a Check or X icon indicating correctness. */}
      {!gameWon ? (
        <div
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className={`
            shrink-0 rounded-md p-1.5 transition-colors
            ${isLocked
              ? "cursor-not-allowed text-gray-300"
              : "cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
            }
          `}
          aria-label="Drag to reorder"
        >
          <GripVerticalIcon size={18} />
        </div>
      ) : (
        <div
          className={`
            shrink-0 rounded-md p-1.5
            ${status === "correct" ? "text-green-600" : "text-red-500"}
          `}
        >
          {status === "correct" ? (
            <CheckIcon size={18} />
          ) : (
            <XIcon size={18} />
          )}
        </div>
      )}
    </div>
  );
}
