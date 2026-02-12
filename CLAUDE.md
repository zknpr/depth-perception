# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server (Turbopack, port 3000)
npm run build        # Production build
npm run lint         # ESLint (next core-web-vitals + TypeScript)
npm run db:seed      # Seed achievements + puzzles (idempotent, ON CONFLICT DO NOTHING)
npx tsc --noEmit     # Type-check without emitting
npx drizzle-kit push # Push schema changes to Postgres (reads POSTGRES_URL from dotenv)
```

No test runner is configured yet.

## Architecture

Next.js 16 App Router with SIWE (Sign-In with Ethereum) authentication. Chronological event-sorting game where players drag events into correct order.

**Stack:** Next.js 16 · React 19 · Tailwind CSS v4 · Drizzle ORM · Vercel Postgres · RainbowKit v2 · wagmi v2 · next-auth v4 (JWT) · @dnd-kit · siwe

**Path alias:** `@/*` maps to `./src/*`

### Provider tree (`src/components/providers.tsx`)

```
WagmiProvider → QueryClientProvider → SessionProvider → RainbowKitAuthenticationProvider → RainbowKitProvider
```

Order matters: SessionProvider must wrap RainbowKit so `useSession()` works inside the SIWE adapter bridge.

### Auth flow (SIWE)

1. RainbowKit calls `getNonce()` → fetches CSRF token from `/api/auth/csrf`
2. `createMessage()` → builds EIP-4361 SiweMessage with address, chain, nonce
3. User signs in wallet → `verify()` calls `signIn("siwe", { message, signature })`
4. NextAuth CredentialsProvider (`src/lib/auth.ts`) verifies signature via `siwe` library
5. JWT created with `token.address` = wallet address, exposed as `session.user.id`
6. Server routes use `getServerSession(authOptions)` — wallet address is `session.user.id`

Type augmentation in `src/types/next-auth.d.ts` adds `id` to `Session.user` and `address` to JWT.

### Game submission pipeline (`/api/game/submit`)

Client sends `{ puzzleId, orderedEventIds[], hintsUsed, solveTimeMs }` → server fetches correct order from `puzzle_events.order_index` → computes score → records `game_results` → checks achievements (`src/lib/achievements.ts`) → calculates XP (`src/lib/xp.ts`) → updates user XP → returns `{ won, score, correctOrder, xpEarned, newAchievements[] }`.

Guest users: same flow but XP/achievements skipped, stats stored in `localStorage` key `depth_guest_stats`, migrated to DB via `/api/game/migrate` on wallet connect.

### Admin gating

`ADMIN_WALLETS` env var (comma-separated checksummed addresses). Checked via `requireAdmin()` in `src/lib/admin.ts`. All `/api/admin/*` routes return 403 if wallet not in list.

## Database

Drizzle ORM with `@vercel/postgres`. Schema in `src/db/schema.ts`, client in `src/db/index.ts`.

**Tables:** `users` (wallet-based), `puzzles`, `puzzle_events` (with `order_index` for correct sort), `game_results`, `achievements`, `user_achievements` (composite PK).

**Migration strategy:** No auto-migrations. Use `npx drizzle-kit push` to sync schema to DB. Seed data via `npm run db:seed`.

Derived stats (streaks, win rate, fastest solve) are computed from `game_results` queries — no denormalized counters.

## Styling

Tailwind CSS v4 with `@theme` directive in `src/app/globals.css`. Brand tokens:
- `navy` = `#021f53`, `lime` = `#c1ff72`, `border` = `#d9d9d9`

Use utility classes only (no CSS modules or CSS-in-JS).

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `POSTGRES_URL` | Neon/Vercel Postgres connection string |
| `AUTH_SECRET` | NextAuth JWT signing key |
| `NEXTAUTH_SECRET` | Same value as AUTH_SECRET (NextAuth v4 reads this) |
| `NEXTAUTH_URL` | Base URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID (client-side) |
| `ADMIN_WALLETS` | Comma-separated admin wallet addresses |

## Key Conventions

- API routes return `NextResponse.json({ error }, { status })` on failure — never silent
- All components needing browser APIs must have `"use client"` directive
- Shared types in `src/types/index.ts`, constants in `src/lib/constants.ts`
- XP: 500 XP per level, computed as `Math.floor(totalXP / 500)`
- Daily puzzles: `is_daily=true` + `daily_date`, one submission per user per daily (409 on duplicate)
