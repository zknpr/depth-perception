"use client";

import { useSession } from "next-auth/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

// GuestBanner renders a slim banner below the navbar when the user is not
// authenticated. It informs the player that they are in guest mode and
// their progress will only be persisted locally. A "Connect Wallet" button
// (via RainbowKit's custom renderer) is provided so they can authenticate
// and migrate their local stats to the server.
//
// The component is a no-op (returns null) when the session is loading or
// authenticated, preventing flash-of-banner on page load.
export function GuestBanner() {
  const { status } = useSession();

  // Only render when the user is definitively unauthenticated.
  // "loading" is excluded to avoid a layout shift on initial page load.
  if (status !== "unauthenticated") return null;

  return (
    <div className="border-b border-border bg-navy/5">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
        {/* Informational text explaining guest mode limitations */}
        <p className="text-xs text-navy/70 sm:text-sm">
          Playing as guest &mdash; connect a wallet to save your progress
          permanently.
        </p>

        {/* RainbowKit custom connect button that only renders the trigger.
            ConnectButton.Custom provides render props with the current
            connection state and an openConnectModal callback. We render
            a compact styled button that opens the RainbowKit modal. */}
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <button
              type="button"
              onClick={openConnectModal}
              className="shrink-0 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy/90 sm:text-sm"
            >
              Connect Wallet
            </button>
          )}
        </ConnectButton.Custom>
      </div>
    </div>
  );
}
