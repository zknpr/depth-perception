"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

// ─── Inline SVG Icon ─────────────────────────────────────────────────────────
// Trophy icon used in the streak badge to the right of the navbar.

function TrophyIcon({ size = 16 }: { size?: number }) {
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
      {/* Trophy cup with handles and base */}
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

// ─── Navigation links ────────────────────────────────────────────────────────
// Each entry maps a label to its route path. The active link is highlighted
// based on the current pathname from Next.js' usePathname hook.
const NAV_LINKS = [
  { label: "Play", href: "/" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Profile", href: "/profile" },
] as const;

// ─── Props ───────────────────────────────────────────────────────────────────
// `streak` — the player's current win streak count, displayed in a badge.
// Defaults to 0 if not provided (e.g., for unauthenticated users).

interface NavbarProps {
  streak?: number;
}

export function Navbar({ streak = 0 }: NavbarProps) {
  // Current route path used to highlight the active nav link
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* ── Left: Logo + Title ──────────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-2">
          {/* Leviathan logo — circular 200x200 image scaled down to 32px
              for the navbar. next/image handles responsive optimization. */}
          <Image
            src="/leviathan-200x200-circle.png"
            alt="Leviathan logo"
            width={32}
            height={32}
            className="rounded-full"
          />
          {/* Title text hidden on mobile to save horizontal space.
              Shown on sm+ breakpoints as a bold navy heading. */}
          <span className="hidden text-lg font-bold text-navy sm:block">
            Depth Perception
          </span>
        </Link>

        {/* ── Center: Navigation links ────────────────────────────────── */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            // Exact match for root "/", startsWith for nested routes
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "bg-navy/10 text-navy"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  }
                `}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* ── Right: Streak badge + Wallet placeholder ────────────────── */}
        <div className="flex items-center gap-3">
          {/* Streak badge: shows trophy icon with current streak count.
              Highlighted in lime when streak > 0, muted when at zero. */}
          <div
            className={`
              flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold
              ${
                streak > 0
                  ? "bg-lime/20 text-navy"
                  : "bg-gray-100 text-gray-400"
              }
            `}
            title={`Current streak: ${streak}`}
          >
            <TrophyIcon size={14} />
            <span>{streak}</span>
          </div>

          {/* RainbowKit ConnectButton — renders a wallet connect/disconnect
              button. `chainStatus="icon"` shows the chain logo instead of text,
              `showBalance={false}` hides the ETH balance to save space, and
              `accountStatus="avatar"` shows the ENS avatar or identicon. */}
          <ConnectButton
            chainStatus="icon"
            showBalance={false}
            accountStatus="avatar"
          />
        </div>
      </div>
    </nav>
  );
}
