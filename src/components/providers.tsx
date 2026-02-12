"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  RainbowKitAuthenticationProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { SessionProvider, useSession } from "next-auth/react";
import { wagmiConfig } from "@/lib/wagmi";
import { siweAuthAdapter } from "@/lib/siwe-auth";
import "@rainbow-me/rainbowkit/styles.css";

// Inner component that reads the NextAuth session status and maps it to
// RainbowKit's authentication state.  Must be rendered inside SessionProvider
// so `useSession()` has access to the session context.
function RainbowKitWithAuth({ children }: { children: ReactNode }) {
  const { status } = useSession();

  // Map NextAuth session status to RainbowKit's expected auth status string.
  // "loading" keeps the connect button in a spinner state until session is
  // resolved, preventing flash-of-unauthenticated.
  const authStatus =
    status === "loading"
      ? "loading"
      : status === "authenticated"
        ? "authenticated"
        : "unauthenticated";

  return (
    <RainbowKitAuthenticationProvider
      adapter={siweAuthAdapter}
      status={authStatus}
    >
      <RainbowKitProvider
        theme={darkTheme({
          accentColor: "#c1ff72",
          accentColorForeground: "#021f53",
          borderRadius: "medium",
        })}
      >
        {children}
      </RainbowKitProvider>
    </RainbowKitAuthenticationProvider>
  );
}

// Root client-side provider tree.
// Nesting order matters:
// 1. WagmiProvider — manages wallet connection state (accounts, chains)
// 2. QueryClientProvider — react-query cache used internally by wagmi
// 3. SessionProvider — next-auth session context for useSession()
// 4. RainbowKitWithAuth — SIWE auth bridge + wallet UI theme
export default function Providers({ children }: { children: ReactNode }) {
  // Lazily initialize QueryClient so it is created once per component mount
  // and not recreated on every render (avoids cache loss).
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RainbowKitWithAuth>{children}</RainbowKitWithAuth>
        </SessionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
