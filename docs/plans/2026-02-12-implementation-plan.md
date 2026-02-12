# Depth Perception Revamp — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform a static HTML game into a full-stack Next.js app with Web3 auth, persistent stats, and gamification.

**Architecture:** Next.js 15 App Router on Vercel, RainbowKit v2 + SIWE for wallet auth, Vercel Postgres + Drizzle ORM for persistence, @dnd-kit for cross-platform drag-and-drop.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, RainbowKit v2, wagmi v2, viem, next-auth v5, SIWE, Drizzle ORM, @vercel/postgres, @dnd-kit

**Design doc:** `docs/plans/2026-02-12-revamp-design.md`

---

## Phase 1: Next.js Scaffold + Tailwind + Deploy

### Task 1.1: Initialize Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, etc. (via create-next-app)
- Create: `.gitignore`

**Step 1: Scaffold Next.js in a temp directory and merge**

The repo already has files (`index.html`, image, docs/). We scaffold Next.js alongside them.

```bash
cd /Users/zero/dev/depth-perception
npx create-next-app@latest temp-next --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

When prompted: accept defaults (App Router = yes, src/ = yes, Turbopack = yes).

**Step 2: Move scaffold files into project root**

```bash
# Move all scaffold files from temp-next into project root
cp temp-next/package.json .
cp temp-next/tsconfig.json .
cp temp-next/next.config.ts .
cp temp-next/postcss.config.mjs .
cp temp-next/.gitignore .
cp -r temp-next/src .
cp -r temp-next/public .
rm -rf temp-next
```

**Step 3: Move existing assets into new structure**

```bash
mv leviathan-200x200-circle.png public/
# Keep index.html at root temporarily for reference, remove later
```

**Step 4: Install dependencies**

```bash
npm install
```

**Step 5: Verify dev server starts**

```bash
npm run dev
```

Expected: Next.js dev server runs on `http://localhost:3000`, shows default page.

**Step 6: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs src/ public/
git commit -m "feat: scaffold Next.js 15 with App Router and Tailwind"
```

---

### Task 1.2: Configure Tailwind with Leviathan brand theme

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Step 1: Replace globals.css with brand tokens**

Write `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-navy: #021f53;
  --color-lime: #c1ff72;
  --color-border: #d9d9d9;
}
```

**Step 2: Update layout.tsx with brand metadata**

Write `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Depth Perception",
  description: "Test your knowledge of chronological events",
  icons: { icon: "/leviathan-200x200-circle.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Step 3: Update page.tsx with a placeholder**

Write `src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-3xl font-bold text-navy">Depth Perception</h1>
    </div>
  );
}
```

**Step 4: Verify brand colors work**

```bash
npm run dev
```

Expected: Page shows "Depth Perception" in navy (#021f53).

**Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/app/page.tsx
git commit -m "feat: configure Tailwind with Leviathan brand theme"
```

---

### Task 1.3: Deploy to Vercel

**Step 1: Push to GitHub**

```bash
git push origin main
```

**Step 2: Connect Vercel to GitHub repo**

- Go to vercel.com → Import Project → select `zknpr/depth-perception`
- Framework preset: Next.js (auto-detected)
- Root directory: `.` (default)
- Deploy

**Step 3: Verify deployment**

Expected: Live URL shows the placeholder page with "Depth Perception" in navy.

**Step 4: Note the Vercel project URL for later env var setup**

No commit needed — this is an infrastructure step.

---

## Phase 2: Database Schema + Drizzle + Seed Data

### Task 2.1: Install Drizzle and Postgres dependencies

**Files:**
- Modify: `package.json`
- Create: `drizzle.config.ts`
- Create: `.env.local`

**Step 1: Install packages**

```bash
npm install drizzle-orm @vercel/postgres
npm install -D drizzle-kit
```

**Step 2: Create drizzle config**

Write `drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

// Drizzle Kit config for generating and running migrations
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
});
```

**Step 3: Create .env.local template**

Write `.env.local`:

```bash
# Database — get from Vercel Postgres dashboard
POSTGRES_URL=

# Auth — generate with: openssl rand -base64 32
AUTH_SECRET=

# WalletConnect — get from cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=

# Admin wallets — comma-separated checksummed addresses
ADMIN_WALLETS=
```

**Step 4: Add .env.local to .gitignore (verify it's already there)**

Check `.gitignore` includes `.env*.local`. Next.js scaffold should have added this.

**Step 5: Commit**

```bash
git add drizzle.config.ts package.json package-lock.json
git commit -m "feat: add Drizzle ORM and Vercel Postgres dependencies"
```

---

### Task 2.2: Define database schema

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`

**Step 1: Write the schema**

Write `src/db/schema.ts`:

```ts
import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  date,
  text,
  primaryKey,
} from "drizzle-orm/pg-core";

// Authenticated users identified by wallet address
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().unique(),
  ensName: varchar("ens_name", { length: 255 }),
  xp: integer("xp").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastPlayedAt: timestamp("last_played_at"),
});

// A puzzle is a set of events to be sorted chronologically
export const puzzles = pgTable("puzzles", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  isDaily: boolean("is_daily").notNull().default(false),
  dailyDate: date("daily_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Individual events within a puzzle, each with a correct chronological position
export const puzzleEvents = pgTable("puzzle_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  puzzleId: uuid("puzzle_id")
    .notNull()
    .references(() => puzzles.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  date: varchar("date", { length: 50 }).notNull(), // Display date string
  sortDate: timestamp("sort_date").notNull(), // Actual date for correctness checking
  url: varchar("url", { length: 2048 }),
  orderIndex: integer("order_index").notNull(), // Correct chronological position (0-based)
});

// Record of each game played by an authenticated user
export const gameResults = pgTable("game_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  puzzleId: uuid("puzzle_id")
    .notNull()
    .references(() => puzzles.id, { onDelete: "cascade" }),
  won: boolean("won").notNull(),
  score: integer("score").notNull(), // Number of correctly placed events (0-5)
  hintsUsed: integer("hints_used").notNull().default(0),
  solveTimeMs: integer("solve_time_ms").notNull(),
  playedAt: timestamp("played_at").defaultNow().notNull(),
});

// Achievement definitions — seeded on deploy, not user-created
export const achievements = pgTable("achievements", {
  id: varchar("id", { length: 50 }).primaryKey(), // Slug: "first_win", "streak_3", etc.
  title: varchar("title", { length: 100 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 10 }).notNull(), // Emoji
  xpReward: integer("xp_reward").notNull(),
});

// Join table tracking which achievements each user has unlocked
export const userAchievements = pgTable(
  "user_achievements",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementId: varchar("achievement_id", { length: 50 })
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.achievementId] }),
  ]
);
```

**Step 2: Write the DB client**

Write `src/db/index.ts`:

```ts
import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import * as schema from "./schema";

// Drizzle client configured for Vercel's serverless Postgres pool
export const db = drizzle(sql, { schema });
```

**Step 3: Commit**

```bash
git add src/db/schema.ts src/db/index.ts
git commit -m "feat: define database schema with Drizzle ORM"
```

---

### Task 2.3: Generate and run migrations

**Step 1: Create Vercel Postgres database**

In Vercel dashboard: Storage → Create → Postgres → name it `depth-perception-db`.
Copy the `POSTGRES_URL` connection string into `.env.local`.

**Step 2: Generate migration files**

```bash
npx drizzle-kit generate
```

Expected: Creates SQL migration files in `drizzle/` directory.

**Step 3: Push schema to database**

```bash
npx drizzle-kit push
```

Expected: Tables created in Vercel Postgres. Output shows each table created.

**Step 4: Commit migrations**

```bash
git add drizzle/
git commit -m "feat: generate initial database migrations"
```

---

### Task 2.4: Create seed script with existing game data

**Files:**
- Create: `src/db/seed.ts`
- Modify: `package.json` (add seed script)

**Step 1: Write seed script**

Write `src/db/seed.ts`:

```ts
import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";
import { puzzles, puzzleEvents, achievements } from "./schema";
import "dotenv/config";

// Seed script to populate the database with initial puzzles and achievement definitions.
// Run with: npm run db:seed

async function seed() {
  const db = drizzle(sql);

  console.log("Seeding puzzles...");

  // Puzzle 1: January 2026 Leviathan News
  const [puzzle1] = await db
    .insert(puzzles)
    .values({
      title: "January, 2026",
      category: "Leviathan News",
      isDaily: false,
    })
    .returning();

  await db.insert(puzzleEvents).values([
    {
      puzzleId: puzzle1.id,
      text: 'Vitalik brings back the milady, and shares his view on the Ethereum community\'s mission for 2026 - "To build the world computer that serves as a central infrastructure piece of a more free and open internet"',
      date: "1/1/2026",
      sortDate: new Date("2026-01-01"),
      url: "https://leviathannews.xyz/vitalik-brings-back-the-milady-and-shares-his-view-on-the-ethereum-communitys-mission-for-2026-to-build-the-world-computer-that-serves-as-a-central-infrastructure-piece-of-a-more-f",
      orderIndex: 0,
    },
    {
      puzzleId: puzzle1.id,
      text: "Japan's 30Y Government Bond Yield surges to a new record high of 3.52%.",
      date: "1/7/2026",
      sortDate: new Date("2026-01-07"),
      url: "https://leviathannews.xyz/japans-30y-government-bond-yield-surges-to-a-new-record-high-of-352",
      orderIndex: 1,
    },
    {
      puzzleId: puzzle1.id,
      text: "Yearn's yYB crosses 1 million YB locked",
      date: "1/12/2026",
      sortDate: new Date("2026-01-12"),
      url: "https://leviathannews.xyz/yearns-yyb-crosses-1-million-yb-locked",
      orderIndex: 2,
    },
    {
      puzzleId: puzzle1.id,
      text: "Caroline Ellison, former Alameda Research co-CEO and key FTX witness, to be released from New York federal halfway house after serving part of a two-year fraud sentence.",
      date: "1/21/2026",
      sortDate: new Date("2026-01-21"),
      url: "https://leviathannews.xyz/caroline-ellison-former-alameda-research-co-ceo-and-key-ftx-witness-to-be-released-wednesday-from-new-york-federal-halfway-house-after-serving-part-of-a-two-year-fraud-sentence",
      orderIndex: 3,
    },
    {
      puzzleId: puzzle1.id,
      text: "Introducing Polaris - a self-scaling stablecoin operating system",
      date: "1/27/2026",
      sortDate: new Date("2026-01-27"),
      url: "https://leviathannews.xyz/introducing-polaris-a-self-scaling-stablecoin-operating-system",
      orderIndex: 4,
    },
  ]);

  // Puzzle 2: Demo / Historical Events
  const [puzzle2] = await db
    .insert(puzzles)
    .values({
      title: "Demo Puzzle",
      category: "Historical Events",
      isDaily: false,
    })
    .returning();

  await db.insert(puzzleEvents).values([
    {
      puzzleId: puzzle2.id,
      text: "Apollo 11 lands on the Moon.",
      date: "1969",
      sortDate: new Date("1969-07-20"),
      url: "https://en.wikipedia.org/wiki/Apollo_11",
      orderIndex: 0,
    },
    {
      puzzleId: puzzle2.id,
      text: "The Berlin Wall falls.",
      date: "1989",
      sortDate: new Date("1989-11-09"),
      url: "https://en.wikipedia.org/wiki/Fall_of_the_Berlin_Wall",
      orderIndex: 1,
    },
    {
      puzzleId: puzzle2.id,
      text: "First iPod is released.",
      date: "2001",
      sortDate: new Date("2001-10-23"),
      url: "https://en.wikipedia.org/wiki/IPod",
      orderIndex: 2,
    },
    {
      puzzleId: puzzle2.id,
      text: "First iPhone is released.",
      date: "2007",
      sortDate: new Date("2007-06-29"),
      url: "https://en.wikipedia.org/wiki/IPhone",
      orderIndex: 3,
    },
    {
      puzzleId: puzzle2.id,
      text: "SpaceX launches first crewed mission.",
      date: "2020",
      sortDate: new Date("2020-05-30"),
      url: "https://en.wikipedia.org/wiki/SpaceX_Demo-2",
      orderIndex: 4,
    },
  ]);

  // Seed achievement definitions
  console.log("Seeding achievements...");

  await db.insert(achievements).values([
    { id: "first_win", title: "First Blood", description: "Win your first game", icon: "🏆", xpReward: 50 },
    { id: "streak_3", title: "Hat Trick", description: "Achieve a 3-game win streak", icon: "🔥", xpReward: 100 },
    { id: "streak_7", title: "On Fire", description: "Achieve a 7-game win streak", icon: "💥", xpReward: 250 },
    { id: "streak_15", title: "Unstoppable", description: "Achieve a 15-game win streak", icon: "⚡", xpReward: 500 },
    { id: "no_hints", title: "Purist", description: "Win a game without using any hints", icon: "🧠", xpReward: 75 },
    { id: "speed_demon", title: "Speed Demon", description: "Win a game in under 15 seconds", icon: "⏱️", xpReward: 150 },
    { id: "daily_5", title: "Dedicated", description: "Complete 5 daily challenges", icon: "📅", xpReward: 200 },
    { id: "daily_30", title: "Habitual", description: "Complete 30 daily challenges", icon: "🗓️", xpReward: 500 },
    { id: "games_50", title: "Veteran", description: "Play 50 games", icon: "🎮", xpReward: 300 },
    { id: "perfect_10", title: "Perfectionist", description: "Win 10 games with no hints", icon: "💎", xpReward: 400 },
  ]);

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
```

**Step 2: Add seed script to package.json**

Add to `scripts` in `package.json`:

```json
"db:seed": "npx tsx src/db/seed.ts",
"db:generate": "drizzle-kit generate",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio"
```

**Step 3: Install tsx for running TypeScript scripts**

```bash
npm install -D tsx dotenv
```

**Step 4: Run seed**

```bash
npm run db:seed
```

Expected: "Seeding puzzles... Seeding achievements... Seed complete."

**Step 5: Commit**

```bash
git add src/db/seed.ts package.json package-lock.json
git commit -m "feat: add database seed script with initial puzzles and achievements"
```

---

## Phase 3: Port Game UI to Next.js Components

### Task 3.1: Create shared types

**Files:**
- Create: `src/types/index.ts`

**Step 1: Write type definitions**

Write `src/types/index.ts`:

```ts
// Represents a single event within a puzzle that the player must sort
export interface PuzzleEvent {
  id: string;
  text: string;
  date: string; // Display date string shown after reveal
  url: string | null;
}

// A complete puzzle as returned by the API (events in shuffled order, no sort_date exposed)
export interface Puzzle {
  id: string;
  title: string;
  category: string;
  events: PuzzleEvent[];
}

// Result returned by the server after submitting an answer
export interface SubmitResult {
  won: boolean;
  score: number;
  correctOrder: string[]; // Event IDs in correct order
  xpEarned: number;
  newAchievements: Achievement[];
}

// Achievement definition
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
}

// User achievement with unlock timestamp
export interface UserAchievement extends Achievement {
  unlockedAt: string;
}

// Player stats computed from game history
export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  avgSolveTimeMs: number;
  fastestSolveTimeMs: number | null;
  xp: number;
  level: number;
}

// Guest stats stored in localStorage before wallet connection
export interface GuestStats {
  gamesPlayed: number;
  wins: number;
  currentStreak: number;
  bestStreak: number;
  results: GuestGameResult[];
}

// Minimal game result stored in localStorage for guest users
export interface GuestGameResult {
  puzzleId: string;
  won: boolean;
  score: number;
  hintsUsed: number;
  solveTimeMs: number;
  playedAt: string;
}

// Leaderboard entry for display
export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  ensName: string | null;
  xp: number;
  currentStreak: number;
  bestStreak: number;
  isCurrentUser: boolean;
}
```

**Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add shared TypeScript type definitions"
```

---

### Task 3.2: Create constants file

**Files:**
- Create: `src/lib/constants.ts`

**Step 1: Write constants**

Write `src/lib/constants.ts`:

```ts
// Leviathan brand palette — used across components and Tailwind config
export const BRAND = {
  navy: "#021f53",
  lime: "#c1ff72",
  border: "#d9d9d9",
  white: "#ffffff",
  black: "#000000",
} as const;

// XP thresholds: level N requires N * XP_PER_LEVEL total XP
export const XP_PER_LEVEL = 500;

// XP awards for various game actions
export const XP_AWARDS = {
  win: 100,
  perfectBonus: 50, // No hints used
  speedBonus: 30, // Under 30 seconds
  streakMultiplier: 20, // Multiplied by current streak length
  dailyChallenge: 75,
} as const;

// Maximum hints per game
export const MAX_HINTS = 3;

// Number of events per puzzle
export const EVENTS_PER_PUZZLE = 5;

// Speed bonus threshold in milliseconds (30 seconds)
export const SPEED_BONUS_THRESHOLD_MS = 30_000;

// Speed demon achievement threshold in milliseconds (15 seconds)
export const SPEED_DEMON_THRESHOLD_MS = 15_000;

// localStorage key for guest stats
export const GUEST_STATS_KEY = "depth_guest_stats";

// Leaderboard page size
export const LEADERBOARD_PAGE_SIZE = 50;
```

**Step 2: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat: add game constants and brand configuration"
```

---

### Task 3.3: Install @dnd-kit

**Step 1: Install packages**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add @dnd-kit for cross-platform drag-and-drop"
```

---

### Task 3.4: Build GameCard component

**Files:**
- Create: `src/components/game-card.tsx`

**Step 1: Write the component**

Write `src/components/game-card.tsx`:

```tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PuzzleEvent } from "@/types";

// SVG icon components used within game cards
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function GripIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UnlockIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

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

// Renders a single draggable event card within the game board.
// Uses @dnd-kit/sortable for cross-platform drag support (desktop + mobile).
// Visual state changes based on game phase: playing, hinted, won (correct/incorrect).
export default function GameCard({
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
  // dnd-kit sortable hook — disabled when game is won or card is locked
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: event.id,
    disabled: gameWon || isLocked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Determine visual state based on game phase and correctness
  const isDateRevealed = gameWon || isHinted;
  const showCorrect = gameWon ? status === "correct" : isHinted && status === "correct";
  const showIncorrect = gameWon && status === "incorrect";

  // Border and background color driven by card state
  let borderColor = "border-border";
  let bgColor = "bg-white";
  if (showCorrect) {
    borderColor = "border-lime";
    bgColor = "bg-lime/20";
  } else if (showIncorrect) {
    borderColor = "border-red-400";
    bgColor = "bg-red-50";
  }
  if (isLocked && !gameWon) {
    borderColor = "border-navy";
  }

  // Status icon shown on the right side after game ends
  let statusIcon = null;
  if (showCorrect) statusIcon = <CheckIcon className="w-5 h-5 text-navy" />;
  else if (showIncorrect) statusIcon = <XIcon className="w-5 h-5 text-red-500" />;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`
        relative flex items-center gap-4 p-4 mb-3 rounded-lg border-l-4 shadow-sm transition-all duration-200
        ${borderColor} ${bgColor}
        ${isDragging ? "opacity-50 scale-95" : "opacity-100 scale-100"}
        ${!gameWon && !isLocked ? "cursor-grab active:cursor-grabbing hover:shadow-md" : ""}
        ${isLocked && !gameWon ? "bg-gray-50" : ""}
        ${isSelected ? "ring-2 ring-navy ring-offset-2" : ""}
        ${gameWon && event.url ? "cursor-pointer hover:translate-x-1" : ""}
      `}
    >
      {/* Position number badge */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold font-serif text-sm
          ${isLocked ? "bg-navy text-white" : "bg-border text-navy"}
        `}
      >
        {index + 1}
      </div>

      {/* Event text and revealed date */}
      <div className="flex-grow">
        <div className="flex items-start justify-between gap-2">
          <p className="text-black font-medium leading-snug">{event.text}</p>
          {gameWon && event.url && (
            <ExternalLinkIcon className="w-4 h-4 text-navy flex-shrink-0 mt-1" />
          )}
        </div>
        <div
          className={`overflow-hidden transition-all duration-500 ease-out
            ${isDateRevealed ? "max-h-10 mt-1 opacity-100" : "max-h-0 opacity-0"}
          `}
        >
          <p className={`text-sm font-bold ${showCorrect ? "text-navy" : showIncorrect ? "text-red-600" : "text-navy"}`}>
            {event.date}
          </p>
        </div>
      </div>

      {/* Right side: lock toggle + drag handle or status icon */}
      <div className="flex-shrink-0 flex items-center gap-2 text-border">
        {!gameWon && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock(event.id);
            }}
            className={`p-1 rounded-md hover:bg-gray-100 transition-colors ${isLocked ? "text-navy" : "text-gray-400"}`}
            title={isLocked ? "Unlock card" : "Lock card in place"}
          >
            {isLocked ? <LockIcon className="w-4 h-4" /> : <UnlockIcon className="w-4 h-4" />}
          </button>
        )}
        {/* During play: drag handle. After game: correct/incorrect icon */}
        {gameWon ? (
          statusIcon
        ) : (
          <div {...attributes} {...listeners}>
            <GripIcon className={`w-5 h-5 ${isLocked ? "opacity-30" : ""}`} />
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/game-card.tsx
git commit -m "feat: create GameCard component with dnd-kit sortable support"
```

---

### Task 3.5: Build GameTimer component

**Files:**
- Create: `src/components/game-timer.tsx`

**Step 1: Write the component**

Write `src/components/game-timer.tsx`:

```tsx
"use client";

import { useState, useEffect, useRef } from "react";

interface GameTimerProps {
  running: boolean;
  onTimeUpdate: (ms: number) => void;
}

// Displays elapsed time since puzzle load. Updates every 100ms while running.
// Calls onTimeUpdate with current elapsed milliseconds so parent can record solve time.
export default function GameTimer({ running, onTimeUpdate }: GameTimerProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      // Capture start time on first run
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current!;
        setElapsedMs(elapsed);
        onTimeUpdate(elapsed);
      }, 100);
    } else if (intervalRef.current) {
      // Stop timer when game ends
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, onTimeUpdate]);

  // Format milliseconds as M:SS.T (minutes:seconds.tenths)
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((elapsedMs % 1000) / 100);

  return (
    <div className="font-mono text-sm text-navy/60 tabular-nums">
      {minutes}:{seconds.toString().padStart(2, "0")}.{tenths}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/game-timer.tsx
git commit -m "feat: create GameTimer component"
```

---

### Task 3.6: Build GameBoard component (core game logic)

**Files:**
- Create: `src/components/game-board.tsx`

**Step 1: Write the component**

Write `src/components/game-board.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import GameCard from "./game-card";
import GameTimer from "./game-timer";
import type { Puzzle, PuzzleEvent, SubmitResult } from "@/types";
import { MAX_HINTS } from "@/lib/constants";

// SVG icons used within the game board UI
function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2 1.5-3.5 0-2.2-1.8-4-4-4a4 4 0 0 0-4 4c0 1.5.5 2.5 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" /><path d="M10 22h4" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
    </svg>
  );
}

interface GameBoardProps {
  puzzle: Puzzle;
  onSubmit: (orderedIds: string[], hintsUsed: number, solveTimeMs: number) => Promise<SubmitResult>;
  onNextPuzzle: () => void;
}

// Shuffles an array using Fisher-Yates algorithm
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Core game component. Manages the sortable event list, hints, locking, timer,
// submission, and result display. Receives puzzle data from parent and delegates
// answer validation to the onSubmit callback (which calls the server API).
export default function GameBoard({ puzzle, onSubmit, onNextPuzzle }: GameBoardProps) {
  // Shuffle events on initial render for this puzzle
  const [items, setItems] = useState<PuzzleEvent[]>(() => shuffle(puzzle.events));
  const [gameWon, setGameWon] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(MAX_HINTS);
  const [hintedEventIds, setHintedEventIds] = useState<Set<string>>(new Set());
  const [hintMessage, setHintMessage] = useState("");
  const [lockedItems, setLockedItems] = useState<Record<string, number>>({});
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(true);
  const [solveTimeMs, setSolveTimeMs] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [correctOrder, setCorrectOrder] = useState<string[]>([]);

  // dnd-kit sensors for pointer (mouse/touch) and keyboard accessibility
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Stable reference for timer callback
  const handleTimeUpdate = useCallback((ms: number) => {
    setSolveTimeMs(ms);
  }, []);

  // Handle drag end — reorder items array
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  // Tap-to-swap: select first card, then tap second to swap positions
  const handleCardClick = (index: number) => {
    if (gameWon) {
      // After winning, clicking a card opens its source URL
      const item = items[index];
      if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (lockedItems[items[index].id] !== undefined) return;

    if (selectedIndex === null) {
      setSelectedIndex(index);
    } else if (selectedIndex === index) {
      setSelectedIndex(null);
    } else {
      if (lockedItems[items[index].id] !== undefined) {
        setSelectedIndex(null);
        return;
      }
      // Swap the two selected cards
      setItems((prev) => {
        const next = [...prev];
        [next[selectedIndex], next[index]] = [next[index], next[selectedIndex]];
        return next;
      });
      setSelectedIndex(null);
    }
  };

  // Lock/unlock a card at its current position
  const handleToggleLock = (itemId: string) => {
    setLockedItems((prev) => {
      const next = { ...prev };
      if (next[itemId] !== undefined) {
        delete next[itemId];
      } else {
        const idx = items.findIndex((i) => i.id === itemId);
        if (idx !== -1) next[itemId] = idx;
      }
      return next;
    });
  };

  // Hint: reveals the date of a correctly-placed card (if any exist)
  const handleHint = () => {
    if (hintsLeft <= 0 || gameWon) return;

    // We don't know the correct order client-side in the final version,
    // but during Phase 3 (before API integration) we use a local check.
    // This will be replaced in Phase 5 with server-validated hints.
    // For now, hints are disabled until API integration.
    setHintMessage("Hints available after server integration");
    setTimeout(() => setHintMessage(""), 2000);
  };

  // Submit the current order to the server for validation
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setTimerRunning(false);

    const orderedIds = items.map((i) => i.id);
    const submitResult = await onSubmit(orderedIds, MAX_HINTS - hintsLeft, solveTimeMs);

    setResult(submitResult);
    setCorrectOrder(submitResult.correctOrder);

    if (submitResult.won) {
      setGameWon(true);
    }
    setSubmitting(false);
  };

  // Determine card status by comparing against server-returned correct order
  const getCardStatus = (eventId: string, index: number): "correct" | "incorrect" | null => {
    if (correctOrder.length === 0) return null;
    return correctOrder[index] === eventId ? "correct" : "incorrect";
  };

  // Reset for retry (keep same puzzle, re-shuffle)
  const handleRetry = () => {
    setItems(shuffle(puzzle.events));
    setGameWon(false);
    setHintsLeft(MAX_HINTS);
    setHintedEventIds(new Set());
    setLockedItems({});
    setSelectedIndex(null);
    setTimerRunning(true);
    setSolveTimeMs(0);
    setResult(null);
    setCorrectOrder([]);
  };

  return (
    <div className="max-w-md mx-auto px-4">
      {/* Header with category, timer, and puzzle title */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm font-medium text-navy/70 uppercase tracking-widest">
          {puzzle.category}
        </p>
        <GameTimer running={timerRunning} onTimeUpdate={handleTimeUpdate} />
      </div>

      {/* Instructions shown only during active play */}
      {!gameWon && (
        <div className="bg-navy/5 border border-navy/10 rounded-lg p-4 mb-6 text-sm text-navy flex items-start gap-3">
          <InfoIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>Drag and drop the events to arrange them in chronological order, from earliest (top) to latest (bottom).</p>
        </div>
      )}

      {/* Sortable event card list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="relative space-y-2">
            <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-border -z-10" />
            {items.map((item, index) => (
              <GameCard
                key={item.id}
                event={item}
                index={index}
                gameWon={gameWon}
                isHinted={hintedEventIds.has(item.id)}
                isLocked={lockedItems[item.id] !== undefined}
                isSelected={selectedIndex === index}
                status={getCardStatus(item.id, index)}
                onToggleLock={handleToggleLock}
                onClick={() => handleCardClick(index)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Action area: hints + submit (during play) or review + next (after game) */}
      <div className="mt-8">
        {!gameWon && !result ? (
          <>
            {/* Hint section */}
            <div className="flex flex-col items-center mb-4">
              <div className="flex items-center gap-4 mb-2">
                <div className="flex gap-1">
                  {[...Array(MAX_HINTS)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-6 h-1.5 rounded-full transition-colors ${i < hintsLeft ? "bg-lime" : "bg-border"}`}
                    />
                  ))}
                </div>
                <button
                  onClick={handleHint}
                  disabled={hintsLeft === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all
                    ${hintsLeft > 0
                      ? "bg-white text-navy border border-navy hover:bg-navy/5"
                      : "bg-gray-100 text-gray-400 border border-transparent cursor-not-allowed"
                    }
                  `}
                >
                  <LightbulbIcon className="w-4 h-4" />
                  Hint
                </button>
              </div>
              {hintMessage && (
                <p className="text-sm text-red-500 font-medium animate-pulse">{hintMessage}</p>
              )}
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 bg-navy hover:opacity-90 text-white font-bold text-lg rounded-xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckIcon className="w-5 h-5" />
              {submitting ? "Checking..." : "Check Timeline"}
            </button>
          </>
        ) : result && !result.won ? (
          // Lost — show score and retry button
          <div className="text-center space-y-4">
            <div className="p-4 bg-white rounded-xl shadow-sm border border-border">
              <p className="text-lg font-bold text-navy">
                {result.score} out of {puzzle.events.length} correct
              </p>
              <p className="text-sm text-black/60 mt-1">Keep trying!</p>
            </div>
            <button
              onClick={handleRetry}
              className="w-full py-3 px-4 bg-navy hover:opacity-90 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <RefreshIcon className="w-5 h-5" />
              Try Again
            </button>
          </div>
        ) : (
          // Won — show results and next puzzle button
          <div className="space-y-4">
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-border">
              <p className="text-black/60 mb-2">Review your timeline results above</p>
              <p className="text-xs text-navy font-bold">Click any card to read the full story</p>
              {result && result.xpEarned > 0 && (
                <p className="text-sm text-lime font-bold mt-2">+{result.xpEarned} XP</p>
              )}
            </div>
            <button
              onClick={onNextPuzzle}
              className="w-full py-3 px-4 bg-border hover:bg-lime text-navy font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <RefreshIcon className="w-5 h-5" />
              Next Puzzle
            </button>
          </div>
        )}
      </div>

      {/* Mobile tip */}
      <div className="mt-12 text-center">
        <p className="text-xs text-navy bg-lime px-4 py-1.5 rounded-full inline-block shadow-sm">
          Tip: On desktop, drag to reorder. On mobile, tap to select and swap.
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/game-board.tsx
git commit -m "feat: create GameBoard component with dnd-kit, hints, locking, and timer"
```

---

### Task 3.7: Build Navbar component

**Files:**
- Create: `src/components/navbar.tsx`

**Step 1: Write the component**

Write `src/components/navbar.tsx`:

```tsx
"use client";

import Link from "next/link";
import Image from "next/image";

// Trophy SVG icon for streak display
function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

interface NavbarProps {
  streak?: number;
}

// Sticky top navigation bar. Shows Leviathan logo, title, nav links,
// streak counter, and a placeholder slot for the wallet connect button
// (added in Phase 4 when RainbowKit is integrated).
export default function Navbar({ streak = 0 }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Logo + Title */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/leviathan-200x200-circle.png"
            alt="Leviathan"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span className="text-lg font-serif font-bold text-navy tracking-tight hidden sm:inline">
            Depth Perception
          </span>
        </Link>

        {/* Center: Nav Links */}
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link href="/" className="text-navy/70 hover:text-navy transition-colors">
            Play
          </Link>
          <Link href="/leaderboard" className="text-navy/70 hover:text-navy transition-colors">
            Leaderboard
          </Link>
          <Link href="/profile" className="text-navy/70 hover:text-navy transition-colors">
            Profile
          </Link>
        </div>

        {/* Right: Streak + Wallet (wallet placeholder until Phase 4) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-lime px-3 py-1 rounded-full shadow-sm">
            <TrophyIcon className="w-3 h-3 text-navy" />
            <span className="text-xs font-bold text-navy">{streak}</span>
          </div>
          {/* Wallet connect button will be inserted here in Phase 4 */}
        </div>
      </div>
    </nav>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/navbar.tsx
git commit -m "feat: create Navbar component with logo, nav links, and streak display"
```

---

### Task 3.8: Wire up the game page with temporary local validation

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Update layout to include Navbar**

Update `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Depth Perception",
  description: "Test your knowledge of chronological events",
  icons: { icon: "/leviathan-200x200-circle.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black font-sans antialiased">
        <Navbar />
        <main className="pt-8 pb-12">{children}</main>
      </body>
    </html>
  );
}
```

**Step 2: Create a temporary local game page**

This version uses hardcoded puzzle data and local validation. It will be replaced
with server-fetched data in Phase 5. The purpose is to verify the UI works.

Update `src/app/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import GameBoard from "@/components/game-board";
import type { Puzzle, SubmitResult } from "@/types";

// Temporary hardcoded puzzles for Phase 3 UI verification.
// These will be replaced by API-fetched data in Phase 5.
const TEMP_PUZZLES: Puzzle[] = [
  {
    id: "temp-1",
    title: "January, 2026",
    category: "Leviathan News",
    events: [
      { id: "e1", date: "1/1/2026", text: 'Vitalik brings back the milady, and shares his view on the Ethereum community\'s mission for 2026', url: null },
      { id: "e2", date: "1/7/2026", text: "Japan's 30Y Government Bond Yield surges to a new record high of 3.52%.", url: null },
      { id: "e3", date: "1/12/2026", text: "Yearn's yYB crosses 1 million YB locked", url: null },
      { id: "e4", date: "1/21/2026", text: "Caroline Ellison to be released from New York federal halfway house", url: null },
      { id: "e5", date: "1/27/2026", text: "Introducing Polaris - a self-scaling stablecoin operating system", url: null },
    ],
  },
  {
    id: "temp-2",
    title: "Demo Puzzle",
    category: "Historical Events",
    events: [
      { id: "h1", date: "1969", text: "Apollo 11 lands on the Moon.", url: "https://en.wikipedia.org/wiki/Apollo_11" },
      { id: "h2", date: "1989", text: "The Berlin Wall falls.", url: "https://en.wikipedia.org/wiki/Fall_of_the_Berlin_Wall" },
      { id: "h3", date: "2001", text: "First iPod is released.", url: "https://en.wikipedia.org/wiki/IPod" },
      { id: "h4", date: "2007", text: "First iPhone is released.", url: "https://en.wikipedia.org/wiki/IPhone" },
      { id: "h5", date: "2020", text: "SpaceX launches first crewed mission.", url: "https://en.wikipedia.org/wiki/SpaceX_Demo-2" },
    ],
  },
];

// Correct order maps for temporary local validation (replaced by server in Phase 5)
const CORRECT_ORDERS: Record<string, string[]> = {
  "temp-1": ["e1", "e2", "e3", "e4", "e5"],
  "temp-2": ["h1", "h2", "h3", "h4", "h5"],
};

export default function HomePage() {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const puzzle = TEMP_PUZZLES[puzzleIndex];

  // Temporary local validation — simulates what the server will do in Phase 5
  const handleSubmit = async (
    orderedIds: string[],
    hintsUsed: number,
    solveTimeMs: number
  ): Promise<SubmitResult> => {
    const correct = CORRECT_ORDERS[puzzle.id];
    let score = 0;
    orderedIds.forEach((id, i) => {
      if (id === correct[i]) score++;
    });

    return {
      won: score === puzzle.events.length,
      score,
      correctOrder: correct,
      xpEarned: score === puzzle.events.length ? 100 : 0,
      newAchievements: [],
    };
  };

  const handleNextPuzzle = () => {
    setPuzzleIndex((prev) => (prev + 1) % TEMP_PUZZLES.length);
  };

  return (
    <div className="min-h-screen selection:bg-lime selection:text-navy">
      {/* Key forces remount on puzzle change to reset all game state */}
      <GameBoard
        key={puzzle.id + puzzleIndex}
        puzzle={puzzle}
        onSubmit={handleSubmit}
        onNextPuzzle={handleNextPuzzle}
      />
    </div>
  );
}
```

**Step 3: Verify the game works**

```bash
npm run dev
```

Expected: Full game UI at localhost:3000 — cards render, drag-and-drop works, tap-to-swap works, submit validates locally, win/loss states display correctly.

**Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx
git commit -m "feat: wire up game page with GameBoard, Navbar, and temporary local validation"
```

---

### Task 3.9: Remove old index.html

**Step 1: Delete the legacy file**

```bash
rm index.html
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "chore: remove legacy static HTML file"
```

---

---

## Phase 4: RainbowKit + SIWE + NextAuth

### Task 4.1: Install Web3 auth dependencies

**Step 1: Install packages**

```bash
npm install @rainbow-me/rainbowkit wagmi viem @tanstack/react-query next-auth siwe ethers
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add RainbowKit, wagmi, SIWE, and NextAuth dependencies"
```

---

### Task 4.2: Configure wagmi + RainbowKit

**Files:**
- Create: `src/lib/wagmi.ts`
- Create: `src/components/providers.tsx`

**Step 1: Write wagmi config with mainnet + Fraxtal**

Write `src/lib/wagmi.ts`:

```ts
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet } from "wagmi/chains";
import { http, type Chain } from "viem";

// Fraxtal L2 chain definition (chain ID 252)
// Fraxtal may be available as `fraxtal` from wagmi/chains.
// If not, this custom definition ensures compatibility.
export const fraxtal: Chain = {
  id: 252,
  name: "Fraxtal",
  nativeCurrency: { name: "Frax Ether", symbol: "frxETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.frax.com"] },
  },
  blockExplorers: {
    default: { name: "Fraxscan", url: "https://fraxscan.com" },
  },
};

// Wagmi + RainbowKit unified config.
// SSR: true required for Next.js App Router to prevent hydration mismatches.
export const wagmiConfig = getDefaultConfig({
  appName: "Depth Perception",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [mainnet, fraxtal],
  ssr: true,
  transports: {
    [mainnet.id]: http(),
    [fraxtal.id]: http("https://rpc.frax.com"),
  },
});
```

**Step 2: Write providers wrapper**

Write `src/components/providers.tsx`:

```tsx
"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { SessionProvider } from "next-auth/react";
import { wagmiConfig } from "@/lib/wagmi";
import "@rainbow-me/rainbowkit/styles.css";

// Root client-side provider tree.
// Wraps the entire app with wagmi (wallet state), RainbowKit (connect UI),
// TanStack Query (caching), and NextAuth (session management).
export default function Providers({ children }: { children: ReactNode }) {
  // QueryClient created in state to avoid sharing between SSR requests
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: "#c1ff72",
              accentColorForeground: "#021f53",
              borderRadius: "medium",
            })}
          >
            {children}
          </RainbowKitProvider>
        </SessionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

**Step 3: Update layout.tsx to use Providers**

Update `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import Providers from "@/components/providers";
import Navbar from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Depth Perception",
  description: "Test your knowledge of chronological events",
  icons: { icon: "/leviathan-200x200-circle.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black font-sans antialiased">
        <Providers>
          <Navbar />
          <main className="pt-8 pb-12">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
```

**Step 4: Commit**

```bash
git add src/lib/wagmi.ts src/components/providers.tsx src/app/layout.tsx
git commit -m "feat: configure RainbowKit + wagmi providers with mainnet and Fraxtal"
```

---

### Task 4.3: Configure NextAuth with SIWE

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`

**Step 1: Write NextAuth config with SIWE credentials provider**

Write `src/lib/auth.ts`:

```ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { SiweMessage } from "siwe";

// NextAuth configuration using SIWE (Sign-In with Ethereum).
// The CredentialsProvider handles SIWE message verification.
// On successful verification, the user's wallet address becomes their session identity.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      id: "siwe",
      name: "Ethereum",
      credentials: {
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.message || !credentials?.signature) return null;

        try {
          const siweMessage = new SiweMessage(
            credentials.message as string
          );

          // Verify the SIWE signature against the message
          const result = await siweMessage.verify({
            signature: credentials.signature as string,
          });

          if (!result.success) return null;

          // Return user object with wallet address as the unique identifier
          return {
            id: siweMessage.address,
            name: siweMessage.address,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    // Embed wallet address in the JWT token
    async jwt({ token, user }) {
      if (user) {
        token.address = user.id;
      }
      return token;
    },
    // Expose wallet address in the client-side session
    async session({ session, token }) {
      if (token.address) {
        session.user.id = token.address as string;
        session.user.name = token.address as string;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
});
```

**Step 2: Create the API route**

Write `src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/lib/auth";

// NextAuth API route handlers for sign-in, sign-out, session, and CSRF
export const { GET, POST } = handlers;
```

**Step 3: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/\[...nextauth\]/route.ts
git commit -m "feat: configure NextAuth with SIWE credentials provider"
```

---

### Task 4.4: Add SIWE authentication flow to RainbowKit

**Files:**
- Modify: `src/components/providers.tsx`
- Create: `src/lib/siwe-auth.ts`

**Step 1: Write SIWE auth adapter for RainbowKit**

Write `src/lib/siwe-auth.ts`:

```ts
import { createAuthenticationAdapter } from "@rainbow-me/rainbowkit";
import { SiweMessage } from "siwe";
import { signIn, signOut, getCsrfToken } from "next-auth/react";

// RainbowKit authentication adapter that bridges wallet signatures with NextAuth sessions.
// Flow: getNonce → createMessage → getMessageBody → verify (calls NextAuth signIn) → signOut
export const siweAuthAdapter = createAuthenticationAdapter({
  // Fetch a CSRF nonce from NextAuth to include in the SIWE message
  getNonce: async () => {
    const nonce = await getCsrfToken();
    if (!nonce) throw new Error("Failed to get CSRF token");
    return nonce;
  },

  // Construct the SIWE message the user will sign
  createMessage: ({ nonce, address, chainId }) => {
    return new SiweMessage({
      domain: window.location.host,
      address,
      statement: "Sign in to Depth Perception",
      uri: window.location.origin,
      version: "1",
      chainId,
      nonce,
    });
  },

  // Serialize the SIWE message to a human-readable string for the wallet
  getMessageBody: ({ message }) => {
    return message.prepareMessage();
  },

  // Verify the signature by passing it to NextAuth's SIWE credentials provider
  verify: async ({ message, signature }) => {
    const result = await signIn("siwe", {
      message: message.prepareMessage(),
      signature,
      redirect: false,
    });

    return result?.ok ?? false;
  },

  // Sign out of the NextAuth session
  signOut: async () => {
    await signOut({ redirect: false });
  },
});
```

**Step 2: Update providers.tsx to use authentication adapter**

Modify `src/components/providers.tsx` — add the `authenticationAdapter` prop to RainbowKitProvider and import the adapter:

Add import at top:
```tsx
import { RainbowKitAuthenticationProvider } from "@rainbow-me/rainbowkit";
import { useSession } from "next-auth/react";
import { siweAuthAdapter } from "@/lib/siwe-auth";
```

Replace the RainbowKitProvider section with:
```tsx
// Derive RainbowKit auth status from NextAuth session state
const { status } = useSession();
const authStatus = status === "loading"
  ? "loading"
  : status === "authenticated"
    ? "authenticated"
    : "unauthenticated";

return (
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
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
      </SessionProvider>
    </QueryClientProvider>
  </WagmiProvider>
);
```

Note: The `useSession` hook requires the component to be inside `SessionProvider`. Split into an inner component:

Full updated `src/components/providers.tsx`:

```tsx
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

// Inner component that can access useSession (must be inside SessionProvider)
function RainbowKitWithAuth({ children }: { children: ReactNode }) {
  const { status } = useSession();

  // Map NextAuth session status to RainbowKit's expected auth status
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

// Root client-side provider tree
export default function Providers({ children }: { children: ReactNode }) {
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
```

**Step 3: Commit**

```bash
git add src/lib/siwe-auth.ts src/components/providers.tsx
git commit -m "feat: integrate SIWE authentication flow with RainbowKit"
```

---

### Task 4.5: Add ConnectButton to Navbar

**Files:**
- Modify: `src/components/navbar.tsx`

**Step 1: Add RainbowKit ConnectButton**

Add import at top of `src/components/navbar.tsx`:
```tsx
import { ConnectButton } from "@rainbow-me/rainbowkit";
```

Replace the comment `{/* Wallet connect button will be inserted here in Phase 4 */}` with:
```tsx
<ConnectButton
  chainStatus="icon"
  showBalance={false}
  accountStatus="avatar"
/>
```

**Step 2: Verify wallet connection works**

```bash
npm run dev
```

Expected: Navbar shows Connect Wallet button. Clicking opens RainbowKit modal. Wallet connection + SIWE signing creates a session.

**Step 3: Commit**

```bash
git add src/components/navbar.tsx
git commit -m "feat: add wallet ConnectButton to Navbar"
```

---

## Phase 5: API Routes — Submit, Stats, Puzzle Fetching

### Task 5.1: Create puzzle fetching API routes

**Files:**
- Create: `src/app/api/puzzles/today/route.ts`
- Create: `src/app/api/puzzles/[id]/route.ts`
- Create: `src/app/api/puzzles/archive/route.ts`

**Step 1: Write today's puzzle route**

Write `src/app/api/puzzles/today/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { puzzles, puzzleEvents } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// GET /api/puzzles/today
// Returns today's daily puzzle if one exists, otherwise a random puzzle.
// Events are shuffled and stripped of sort_date/orderIndex to prevent cheating.
export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Try to find today's daily puzzle
    let puzzle = await db.query.puzzles.findFirst({
      where: eq(puzzles.dailyDate, today),
    });

    // Fallback to a random puzzle if no daily is set
    if (!puzzle) {
      puzzle = await db.query.puzzles.findFirst({
        orderBy: sql`RANDOM()`,
      });
    }

    if (!puzzle) {
      return NextResponse.json({ error: "No puzzles available" }, { status: 404 });
    }

    // Fetch events for this puzzle, ordered by orderIndex for consistent IDs
    const events = await db
      .select({
        id: puzzleEvents.id,
        text: puzzleEvents.text,
        date: puzzleEvents.date,
        url: puzzleEvents.url,
      })
      .from(puzzleEvents)
      .where(eq(puzzleEvents.puzzleId, puzzle.id));

    // Shuffle events so client receives them in random order
    const shuffled = events.sort(() => Math.random() - 0.5);

    return NextResponse.json({
      id: puzzle.id,
      title: puzzle.title,
      category: puzzle.category,
      events: shuffled,
    });
  } catch (error) {
    console.error("Failed to fetch today's puzzle:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Write puzzle by ID route**

Write `src/app/api/puzzles/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { puzzles, puzzleEvents } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/puzzles/[id]
// Returns a specific puzzle by ID with shuffled events (no correct order exposed).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const puzzle = await db.query.puzzles.findFirst({
      where: eq(puzzles.id, id),
    });

    if (!puzzle) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    const events = await db
      .select({
        id: puzzleEvents.id,
        text: puzzleEvents.text,
        date: puzzleEvents.date,
        url: puzzleEvents.url,
      })
      .from(puzzleEvents)
      .where(eq(puzzleEvents.puzzleId, puzzle.id));

    const shuffled = events.sort(() => Math.random() - 0.5);

    return NextResponse.json({
      id: puzzle.id,
      title: puzzle.title,
      category: puzzle.category,
      events: shuffled,
    });
  } catch (error) {
    console.error("Failed to fetch puzzle:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 3: Write puzzle archive route**

Write `src/app/api/puzzles/archive/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { puzzles } from "@/db/schema";
import { desc } from "drizzle-orm";

// GET /api/puzzles/archive
// Returns a list of all available puzzles (metadata only, no events).
export async function GET() {
  try {
    const allPuzzles = await db
      .select({
        id: puzzles.id,
        title: puzzles.title,
        category: puzzles.category,
        isDaily: puzzles.isDaily,
        dailyDate: puzzles.dailyDate,
        createdAt: puzzles.createdAt,
      })
      .from(puzzles)
      .orderBy(desc(puzzles.createdAt));

    return NextResponse.json(allPuzzles);
  } catch (error) {
    console.error("Failed to fetch puzzle archive:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 4: Commit**

```bash
git add src/app/api/puzzles/
git commit -m "feat: add puzzle fetching API routes (today, by ID, archive)"
```

---

### Task 5.2: Create game submission API route

**Files:**
- Create: `src/app/api/game/submit/route.ts`
- Create: `src/lib/xp.ts`
- Create: `src/lib/achievements.ts`

**Step 1: Write XP calculation logic**

Write `src/lib/xp.ts`:

```ts
import { XP_AWARDS, SPEED_BONUS_THRESHOLD_MS } from "./constants";

interface XpCalcInput {
  won: boolean;
  hintsUsed: number;
  solveTimeMs: number;
  currentStreak: number; // Streak AFTER this game (1 if first win in a row)
  isDaily: boolean;
}

// Calculates total XP earned for a single game based on performance.
// Only winning games earn XP. Bonuses stack additively.
export function calculateXp(input: XpCalcInput): number {
  if (!input.won) return 0;

  let xp = XP_AWARDS.win;

  // Bonus for not using any hints
  if (input.hintsUsed === 0) {
    xp += XP_AWARDS.perfectBonus;
  }

  // Bonus for solving quickly (under 30 seconds)
  if (input.solveTimeMs < SPEED_BONUS_THRESHOLD_MS) {
    xp += XP_AWARDS.speedBonus;
  }

  // Streak multiplier — increases with consecutive wins
  if (input.currentStreak > 1) {
    xp += XP_AWARDS.streakMultiplier * input.currentStreak;
  }

  // Daily challenge bonus
  if (input.isDaily) {
    xp += XP_AWARDS.dailyChallenge;
  }

  return xp;
}
```

**Step 2: Write achievement checking logic**

Write `src/lib/achievements.ts`:

```ts
import { SPEED_DEMON_THRESHOLD_MS } from "./constants";

interface AchievementCheckInput {
  totalWins: number;
  totalGames: number;
  currentStreak: number;
  bestStreak: number;
  hintsUsedThisGame: number;
  solveTimeMsThisGame: number;
  totalPerfectWins: number; // Wins with 0 hints
  totalDailies: number;
  won: boolean;
  alreadyUnlocked: Set<string>; // Achievement IDs the user already has
}

// Returns an array of newly unlocked achievement IDs based on the user's updated stats.
// Each achievement is checked only if not already unlocked.
export function checkAchievements(input: AchievementCheckInput): string[] {
  const newlyUnlocked: string[] = [];

  const check = (id: string, condition: boolean) => {
    if (!input.alreadyUnlocked.has(id) && condition) {
      newlyUnlocked.push(id);
    }
  };

  check("first_win", input.won && input.totalWins >= 1);
  check("streak_3", input.currentStreak >= 3);
  check("streak_7", input.currentStreak >= 7);
  check("streak_15", input.currentStreak >= 15);
  check("no_hints", input.won && input.hintsUsedThisGame === 0);
  check("speed_demon", input.won && input.solveTimeMsThisGame < SPEED_DEMON_THRESHOLD_MS);
  check("daily_5", input.totalDailies >= 5);
  check("daily_30", input.totalDailies >= 30);
  check("games_50", input.totalGames >= 50);
  check("perfect_10", input.totalPerfectWins >= 10);

  return newlyUnlocked;
}
```

**Step 3: Write the submit route**

Write `src/app/api/game/submit/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  puzzles,
  puzzleEvents,
  gameResults,
  users,
  userAchievements,
  achievements,
} from "@/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { calculateXp } from "@/lib/xp";
import { checkAchievements } from "@/lib/achievements";

// POST /api/game/submit
// Validates the player's submitted event order against the correct order stored in DB.
// Records the game result, updates XP, and checks for newly unlocked achievements.
// Works for both authenticated users (persisted) and guests (returns result only).
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { puzzleId, orderedEventIds, hintsUsed, solveTimeMs } = body;

    // Validate required fields
    if (!puzzleId || !Array.isArray(orderedEventIds) || orderedEventIds.length === 0) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    if (typeof hintsUsed !== "number" || typeof solveTimeMs !== "number") {
      return NextResponse.json({ error: "hintsUsed and solveTimeMs must be numbers" }, { status: 400 });
    }

    // Fetch correct order from database
    const correctEvents = await db
      .select({ id: puzzleEvents.id, orderIndex: puzzleEvents.orderIndex })
      .from(puzzleEvents)
      .where(eq(puzzleEvents.puzzleId, puzzleId))
      .orderBy(puzzleEvents.orderIndex);

    if (correctEvents.length === 0) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    // Build correct order array and compute score
    const correctOrder = correctEvents.map((e) => e.id);
    let score = 0;
    orderedEventIds.forEach((id: string, i: number) => {
      if (i < correctOrder.length && id === correctOrder[i]) score++;
    });

    const won = score === correctOrder.length;

    // Check if this is a daily puzzle
    const puzzle = await db.query.puzzles.findFirst({
      where: eq(puzzles.id, puzzleId),
    });
    const isDaily = puzzle?.isDaily ?? false;

    // Try to get authenticated session
    const session = await auth();
    let xpEarned = 0;
    let newAchievementsList: { id: string; title: string; description: string; icon: string; xpReward: number }[] = [];

    if (session?.user?.id) {
      const walletAddress = session.user.id.toLowerCase();

      // Upsert user record
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress));

      if (!user) {
        [user] = await db
          .insert(users)
          .values({ walletAddress, lastPlayedAt: new Date() })
          .returning();
      }

      // Record the game result
      await db.insert(gameResults).values({
        userId: user.id,
        puzzleId,
        won,
        score,
        hintsUsed,
        solveTimeMs,
      });

      // Update last played timestamp
      await db
        .update(users)
        .set({ lastPlayedAt: new Date() })
        .where(eq(users.id, user.id));

      // Calculate current streak from game history
      const recentGames = await db
        .select({ won: gameResults.won })
        .from(gameResults)
        .where(eq(gameResults.userId, user.id))
        .orderBy(desc(gameResults.playedAt));

      let currentStreak = 0;
      for (const g of recentGames) {
        if (g.won) currentStreak++;
        else break;
      }

      // Gather stats for achievement checking
      const [statsRow] = await db
        .select({
          totalGames: count(),
          totalWins: sql<number>`COUNT(*) FILTER (WHERE ${gameResults.won} = true)`,
        })
        .from(gameResults)
        .where(eq(gameResults.userId, user.id));

      // Count perfect wins (won with 0 hints)
      const [perfectRow] = await db
        .select({ cnt: count() })
        .from(gameResults)
        .where(
          and(
            eq(gameResults.userId, user.id),
            eq(gameResults.won, true),
            eq(gameResults.hintsUsed, 0)
          )
        );

      // Count daily challenge completions
      const [dailyRow] = await db
        .select({ cnt: count() })
        .from(gameResults)
        .innerJoin(puzzles, eq(gameResults.puzzleId, puzzles.id))
        .where(
          and(
            eq(gameResults.userId, user.id),
            eq(puzzles.isDaily, true),
            eq(gameResults.won, true)
          )
        );

      // Best streak (longest consecutive wins ever)
      // Computed by iterating all games chronologically
      const allGames = await db
        .select({ won: gameResults.won })
        .from(gameResults)
        .where(eq(gameResults.userId, user.id))
        .orderBy(gameResults.playedAt);

      let bestStreak = 0;
      let tempStreak = 0;
      for (const g of allGames) {
        if (g.won) { tempStreak++; bestStreak = Math.max(bestStreak, tempStreak); }
        else tempStreak = 0;
      }

      // Get already unlocked achievements
      const existingAchievements = await db
        .select({ achievementId: userAchievements.achievementId })
        .from(userAchievements)
        .where(eq(userAchievements.userId, user.id));
      const alreadyUnlocked = new Set(existingAchievements.map((a) => a.achievementId));

      // Check for new achievements
      const newIds = checkAchievements({
        totalWins: Number(statsRow.totalWins),
        totalGames: Number(statsRow.totalGames),
        currentStreak,
        bestStreak,
        hintsUsedThisGame: hintsUsed,
        solveTimeMsThisGame: solveTimeMs,
        totalPerfectWins: perfectRow.cnt,
        totalDailies: dailyRow.cnt,
        won,
        alreadyUnlocked,
      });

      // Insert newly unlocked achievements and fetch their details
      if (newIds.length > 0) {
        await db.insert(userAchievements).values(
          newIds.map((achievementId) => ({
            userId: user.id,
            achievementId,
          }))
        );

        // Fetch achievement details for the response
        const achievementDetails = await db
          .select()
          .from(achievements)
          .where(sql`${achievements.id} IN (${sql.join(newIds.map((id) => sql`${id}`), sql`, `)})`);

        newAchievementsList = achievementDetails;
      }

      // Calculate XP
      xpEarned = calculateXp({
        won,
        hintsUsed,
        solveTimeMs,
        currentStreak,
        isDaily,
      });

      // Add achievement XP rewards
      for (const a of newAchievementsList) {
        xpEarned += a.xpReward;
      }

      // Update user XP
      if (xpEarned > 0) {
        await db
          .update(users)
          .set({ xp: sql`${users.xp} + ${xpEarned}` })
          .where(eq(users.id, user.id));
      }
    }

    return NextResponse.json({
      won,
      score,
      correctOrder,
      xpEarned,
      newAchievements: newAchievementsList,
    });
  } catch (error) {
    console.error("Submit failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 4: Commit**

```bash
git add src/lib/xp.ts src/lib/achievements.ts src/app/api/game/submit/route.ts
git commit -m "feat: add game submission API with server-side validation, XP, and achievements"
```

---

### Task 5.3: Create stats API route

**Files:**
- Create: `src/app/api/stats/me/route.ts`

**Step 1: Write the stats route**

Write `src/app/api/stats/me/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, gameResults, userAchievements, achievements, puzzles } from "@/db/schema";
import { eq, and, desc, sql, count, avg, min } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { XP_PER_LEVEL } from "@/lib/constants";

// GET /api/stats/me
// Returns the authenticated user's complete stats: games, wins, streaks, times, XP, achievements.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const walletAddress = session.user.id.toLowerCase();

    const user = await db.query.users.findFirst({
      where: eq(users.walletAddress, walletAddress),
    });

    if (!user) {
      // User exists in session but not in DB yet (no games played)
      return NextResponse.json({
        gamesPlayed: 0,
        wins: 0,
        winRate: 0,
        currentStreak: 0,
        bestStreak: 0,
        avgSolveTimeMs: 0,
        fastestSolveTimeMs: null,
        xp: 0,
        level: 0,
        achievements: [],
        recentGames: [],
      });
    }

    // Aggregate stats from game_results
    const [stats] = await db
      .select({
        totalGames: count(),
        totalWins: sql<number>`COUNT(*) FILTER (WHERE ${gameResults.won} = true)`,
        avgTime: avg(gameResults.solveTimeMs),
        fastestTime: min(gameResults.solveTimeMs),
      })
      .from(gameResults)
      .where(eq(gameResults.userId, user.id));

    // Compute current streak (consecutive wins from most recent game backwards)
    const recentGames = await db
      .select({ won: gameResults.won })
      .from(gameResults)
      .where(eq(gameResults.userId, user.id))
      .orderBy(desc(gameResults.playedAt));

    let currentStreak = 0;
    for (const g of recentGames) {
      if (g.won) currentStreak++;
      else break;
    }

    // Compute best streak ever
    const allGames = await db
      .select({ won: gameResults.won })
      .from(gameResults)
      .where(eq(gameResults.userId, user.id))
      .orderBy(gameResults.playedAt);

    let bestStreak = 0;
    let tempStreak = 0;
    for (const g of allGames) {
      if (g.won) { tempStreak++; bestStreak = Math.max(bestStreak, tempStreak); }
      else tempStreak = 0;
    }

    // Fetch user's achievements with details
    const userAchievementsList = await db
      .select({
        id: achievements.id,
        title: achievements.title,
        description: achievements.description,
        icon: achievements.icon,
        xpReward: achievements.xpReward,
        unlockedAt: userAchievements.unlockedAt,
      })
      .from(userAchievements)
      .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(eq(userAchievements.userId, user.id));

    // Recent game history (last 20)
    const recentHistory = await db
      .select({
        puzzleTitle: puzzles.title,
        won: gameResults.won,
        score: gameResults.score,
        hintsUsed: gameResults.hintsUsed,
        solveTimeMs: gameResults.solveTimeMs,
        playedAt: gameResults.playedAt,
      })
      .from(gameResults)
      .innerJoin(puzzles, eq(gameResults.puzzleId, puzzles.id))
      .where(eq(gameResults.userId, user.id))
      .orderBy(desc(gameResults.playedAt))
      .limit(20);

    const gamesPlayed = Number(stats.totalGames);
    const wins = Number(stats.totalWins);

    return NextResponse.json({
      gamesPlayed,
      wins,
      winRate: gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0,
      currentStreak,
      bestStreak,
      avgSolveTimeMs: Math.round(Number(stats.avgTime) || 0),
      fastestSolveTimeMs: stats.fastestTime ? Number(stats.fastestTime) : null,
      xp: user.xp,
      level: Math.floor(user.xp / XP_PER_LEVEL),
      achievements: userAchievementsList,
      recentGames: recentHistory,
    });
  } catch (error) {
    console.error("Stats fetch failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/stats/me/route.ts
git commit -m "feat: add user stats API route with streaks, XP, and achievements"
```

---

### Task 5.4: Create leaderboard API route

**Files:**
- Create: `src/app/api/stats/leaderboard/route.ts`

**Step 1: Write the leaderboard route**

Write `src/app/api/stats/leaderboard/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, gameResults } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { LEADERBOARD_PAGE_SIZE } from "@/lib/constants";

// GET /api/stats/leaderboard?sort=xp|streak|best_streak
// Returns top 50 players sorted by the requested metric.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "xp";

    const session = await auth();
    const currentWallet = session?.user?.id?.toLowerCase();

    // For XP sorting, we can use the denormalized xp column directly
    if (sort === "xp") {
      const topUsers = await db
        .select({
          walletAddress: users.walletAddress,
          ensName: users.ensName,
          xp: users.xp,
        })
        .from(users)
        .orderBy(desc(users.xp))
        .limit(LEADERBOARD_PAGE_SIZE);

      const entries = topUsers.map((u, i) => ({
        rank: i + 1,
        walletAddress: u.walletAddress,
        ensName: u.ensName,
        xp: u.xp,
        currentStreak: 0, // Not computed for XP sort to save queries
        bestStreak: 0,
        isCurrentUser: u.walletAddress.toLowerCase() === currentWallet,
      }));

      return NextResponse.json(entries);
    }

    // For streak-based sorting, compute streaks per user
    // This is more expensive — consider caching in production
    const allUsers = await db.select().from(users);

    const leaderboard = await Promise.all(
      allUsers.map(async (user) => {
        const games = await db
          .select({ won: gameResults.won })
          .from(gameResults)
          .where(eq(gameResults.userId, user.id))
          .orderBy(desc(gameResults.playedAt));

        let currentStreak = 0;
        for (const g of games) {
          if (g.won) currentStreak++;
          else break;
        }

        // Best streak from chronological order
        const chronGames = await db
          .select({ won: gameResults.won })
          .from(gameResults)
          .where(eq(gameResults.userId, user.id))
          .orderBy(gameResults.playedAt);

        let bestStreak = 0;
        let temp = 0;
        for (const g of chronGames) {
          if (g.won) { temp++; bestStreak = Math.max(bestStreak, temp); }
          else temp = 0;
        }

        return {
          walletAddress: user.walletAddress,
          ensName: user.ensName,
          xp: user.xp,
          currentStreak,
          bestStreak,
          isCurrentUser: user.walletAddress.toLowerCase() === currentWallet,
        };
      })
    );

    // Sort by requested metric
    const sortKey = sort === "streak" ? "currentStreak" : "bestStreak";
    leaderboard.sort((a, b) => b[sortKey] - a[sortKey]);

    const entries = leaderboard.slice(0, LEADERBOARD_PAGE_SIZE).map((u, i) => ({
      ...u,
      rank: i + 1,
    }));

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Leaderboard fetch failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/stats/leaderboard/route.ts
git commit -m "feat: add leaderboard API route with XP and streak sorting"
```

---

### Task 5.5: Update game page to use server API

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Replace temporary local data with API calls**

Rewrite `src/app/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import GameBoard from "@/components/game-board";
import type { Puzzle, SubmitResult } from "@/types";

// Main game page. Fetches puzzle from API and delegates submission to server.
export default function HomePage() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [puzzleKey, setPuzzleKey] = useState(0); // Forces GameBoard remount on new puzzle

  // Fetch today's puzzle on mount
  const fetchPuzzle = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/puzzles/today");
      if (!res.ok) throw new Error("Failed to fetch puzzle");
      const data = await res.json();
      setPuzzle(data);
      setPuzzleKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPuzzle();
  }, []);

  // Submit answer to server for validation
  const handleSubmit = async (
    orderedIds: string[],
    hintsUsed: number,
    solveTimeMs: number
  ): Promise<SubmitResult> => {
    const res = await fetch("/api/game/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        puzzleId: puzzle!.id,
        orderedEventIds: orderedIds,
        hintsUsed,
        solveTimeMs,
      }),
    });

    if (!res.ok) {
      throw new Error("Submission failed");
    }

    return res.json();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-navy/60 text-lg">Loading puzzle...</div>
      </div>
    );
  }

  if (error || !puzzle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "No puzzle available"}</p>
          <button
            onClick={fetchPuzzle}
            className="px-4 py-2 bg-navy text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen selection:bg-lime selection:text-navy">
      <GameBoard
        key={puzzleKey}
        puzzle={puzzle}
        onSubmit={handleSubmit}
        onNextPuzzle={fetchPuzzle}
      />
    </div>
  );
}
```

**Step 2: Verify end-to-end flow**

```bash
npm run dev
```

Expected: Page loads puzzle from API, drag/drop works, submit sends to server, server validates and returns result.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: connect game page to server API for puzzle fetching and submission"
```

---

## Phase 6: Guest Mode + localStorage + Migration

### Task 6.1: Create GuestBanner component

**Files:**
- Create: `src/components/guest-banner.tsx`

**Step 1: Write the component**

Write `src/components/guest-banner.tsx`:

```tsx
"use client";

import { useSession } from "next-auth/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

// Banner shown below the navbar for unauthenticated users.
// Prompts them to connect a wallet to persist their game stats permanently.
export default function GuestBanner() {
  const { status } = useSession();

  // Only show for unauthenticated users
  if (status !== "unauthenticated") return null;

  return (
    <div className="bg-navy/5 border-b border-navy/10">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <p className="text-sm text-navy/70">
          Playing as guest — connect a wallet to save your progress permanently.
        </p>
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <button
              onClick={openConnectModal}
              className="text-sm font-bold text-navy bg-lime px-3 py-1 rounded-full hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Connect Wallet
            </button>
          )}
        </ConnectButton.Custom>
      </div>
    </div>
  );
}
```

**Step 2: Add GuestBanner to layout**

In `src/app/layout.tsx`, add `<GuestBanner />` after `<Navbar />`:

```tsx
import GuestBanner from "@/components/guest-banner";
```

And in the body:
```tsx
<Navbar />
<GuestBanner />
```

**Step 3: Commit**

```bash
git add src/components/guest-banner.tsx src/app/layout.tsx
git commit -m "feat: add GuestBanner prompting unauthenticated users to connect wallet"
```

---

### Task 6.2: Create guest stats localStorage utility

**Files:**
- Create: `src/lib/guest-stats.ts`

**Step 1: Write the utility**

Write `src/lib/guest-stats.ts`:

```ts
import type { GuestStats, GuestGameResult } from "@/types";
import { GUEST_STATS_KEY } from "./constants";

// Reads guest stats from localStorage. Returns empty stats if none exist.
export function getGuestStats(): GuestStats {
  if (typeof window === "undefined") {
    return { gamesPlayed: 0, wins: 0, currentStreak: 0, bestStreak: 0, results: [] };
  }

  try {
    const raw = localStorage.getItem(GUEST_STATS_KEY);
    if (!raw) return { gamesPlayed: 0, wins: 0, currentStreak: 0, bestStreak: 0, results: [] };
    return JSON.parse(raw) as GuestStats;
  } catch {
    return { gamesPlayed: 0, wins: 0, currentStreak: 0, bestStreak: 0, results: [] };
  }
}

// Records a game result to guest localStorage stats.
// Updates streak counters and appends the result to history.
export function recordGuestResult(result: GuestGameResult): GuestStats {
  const stats = getGuestStats();

  stats.gamesPlayed++;
  if (result.won) {
    stats.wins++;
    stats.currentStreak++;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
  } else {
    stats.currentStreak = 0;
  }

  stats.results.push(result);
  localStorage.setItem(GUEST_STATS_KEY, JSON.stringify(stats));

  return stats;
}

// Clears guest stats from localStorage (called after migration to DB)
export function clearGuestStats(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(GUEST_STATS_KEY);
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/guest-stats.ts
git commit -m "feat: add guest stats localStorage utility"
```

---

### Task 6.3: Create migration API route

**Files:**
- Create: `src/app/api/game/migrate/route.ts`

**Step 1: Write the migration route**

Write `src/app/api/game/migrate/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, gameResults, puzzles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import type { GuestGameResult } from "@/types";

// POST /api/game/migrate
// Migrates guest localStorage game results to the authenticated user's DB record.
// Called once on first wallet connection when guest stats exist.
// Body: { results: GuestGameResult[] }
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { results } = (await request.json()) as { results: GuestGameResult[] };
    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ migrated: 0 });
    }

    const walletAddress = session.user.id.toLowerCase();

    // Upsert user
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress));

    if (!user) {
      [user] = await db
        .insert(users)
        .values({ walletAddress })
        .returning();
    }

    // Insert each guest result as a game_results row
    let migrated = 0;
    for (const r of results) {
      // Verify the puzzle exists before inserting
      const puzzle = await db.query.puzzles.findFirst({
        where: eq(puzzles.id, r.puzzleId),
      });

      if (puzzle) {
        await db.insert(gameResults).values({
          userId: user.id,
          puzzleId: r.puzzleId,
          won: r.won,
          score: r.score,
          hintsUsed: r.hintsUsed,
          solveTimeMs: r.solveTimeMs,
          playedAt: new Date(r.playedAt),
        });
        migrated++;
      }
    }

    return NextResponse.json({ migrated });
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/game/migrate/route.ts
git commit -m "feat: add guest stats migration API route"
```

---

### Task 6.4: Add migration trigger on auth

**Files:**
- Create: `src/components/migration-handler.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Write the migration handler**

Write `src/components/migration-handler.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { getGuestStats, clearGuestStats } from "@/lib/guest-stats";

// Invisible component that triggers migration of guest localStorage stats
// to the server when a user first authenticates. Runs once per session transition
// from unauthenticated to authenticated.
export default function MigrationHandler() {
  const { status } = useSession();
  const hasMigrated = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || hasMigrated.current) return;
    hasMigrated.current = true;

    const stats = getGuestStats();
    if (stats.results.length === 0) return;

    // Fire-and-forget migration — non-blocking
    fetch("/api/game/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: stats.results }),
    })
      .then((res) => {
        if (res.ok) {
          clearGuestStats();
          console.log("Guest stats migrated successfully");
        }
      })
      .catch((err) => console.error("Migration failed:", err));
  }, [status]);

  return null; // Renders nothing — pure side-effect component
}
```

**Step 2: Add MigrationHandler to layout**

In `src/app/layout.tsx`, add:
```tsx
import MigrationHandler from "@/components/migration-handler";
```

And in the body, after GuestBanner:
```tsx
<MigrationHandler />
```

**Step 3: Commit**

```bash
git add src/components/migration-handler.tsx src/app/layout.tsx
git commit -m "feat: add automatic guest stats migration on wallet connection"
```

---

## Phase 7: Gamification — XP, Achievements, Timer

### Task 7.1: Create AchievementToast component

**Files:**
- Create: `src/components/achievement-toast.tsx`

**Step 1: Write the component**

Write `src/components/achievement-toast.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { Achievement } from "@/types";

interface AchievementToastProps {
  achievement: Achievement;
  onDismiss: () => void;
}

// Animated toast notification that slides in from the top-right when
// the player unlocks a new achievement. Auto-dismisses after 4 seconds.
export default function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in animation on next frame
    requestAnimationFrame(() => setVisible(true));

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // Wait for slide-out animation
    }, 4000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`
        fixed top-16 right-4 z-50 max-w-sm
        transform transition-all duration-300 ease-out
        ${visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
    >
      <div className="bg-white border border-lime rounded-xl shadow-lg p-4 flex items-center gap-3">
        <div className="text-2xl">{achievement.icon}</div>
        <div>
          <p className="text-xs text-navy/60 uppercase tracking-wide font-bold">Achievement Unlocked!</p>
          <p className="text-sm font-bold text-navy">{achievement.title}</p>
          <p className="text-xs text-black/60">{achievement.description}</p>
          <p className="text-xs text-lime font-bold mt-1">+{achievement.xpReward} XP</p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/achievement-toast.tsx
git commit -m "feat: create AchievementToast notification component"
```

---

### Task 7.2: Integrate achievement toasts into game flow

**Files:**
- Modify: `src/components/game-board.tsx`

**Step 1: Add achievement toast rendering to GameBoard**

Add import at top of `src/components/game-board.tsx`:
```tsx
import AchievementToast from "./achievement-toast";
import type { Achievement } from "@/types";
```

Add state for achievement queue:
```tsx
const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);
```

In the `handleSubmit` function, after `setResult(submitResult)`, add:
```tsx
if (submitResult.newAchievements.length > 0) {
  setAchievementQueue(submitResult.newAchievements);
}
```

Add toast rendering at the end of the component return, before the closing `</div>`:
```tsx
{achievementQueue.length > 0 && (
  <AchievementToast
    achievement={achievementQueue[0]}
    onDismiss={() => setAchievementQueue((q) => q.slice(1))}
  />
)}
```

**Step 2: Commit**

```bash
git add src/components/game-board.tsx
git commit -m "feat: integrate achievement toast notifications into game flow"
```

---

### Task 7.3: Update ResultModal with XP display

**Files:**
- Create: `src/components/result-modal.tsx`

**Step 1: Write the component**

Write `src/components/result-modal.tsx`:

```tsx
"use client";

import type { SubmitResult } from "@/types";

// Trophy SVG icon
function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

interface ResultModalProps {
  result: SubmitResult;
  totalEvents: number;
  onRetry: () => void;
  onReview: () => void;
}

// Modal displayed after game submission showing win/loss state,
// score breakdown, XP earned, and any newly unlocked achievements.
export default function ResultModal({ result, totalEvents, onRetry, onReview }: ResultModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center border border-border">
        {/* Icon */}
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${result.won ? "bg-lime/30" : "bg-border/30"}`}>
          {result.won ? (
            <TrophyIcon className="w-8 h-8 text-navy" />
          ) : (
            <span className="text-2xl">🔄</span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-navy mb-2">
          {result.won ? "Timeline Mastered!" : "Keep Trying!"}
        </h2>

        {/* Score */}
        <p className="text-black/70 mb-2">
          {result.won
            ? "Perfect! You've unlocked the timeline."
            : `You got ${result.score} out of ${totalEvents} events in the correct position.`}
        </p>

        {/* XP earned (only for authenticated users who won) */}
        {result.xpEarned > 0 && (
          <p className="text-lg font-bold text-lime mb-2">+{result.xpEarned} XP</p>
        )}

        {/* New achievements */}
        {result.newAchievements.length > 0 && (
          <div className="mb-4 space-y-1">
            {result.newAchievements.map((a) => (
              <div key={a.id} className="text-sm text-navy flex items-center justify-center gap-1">
                <span>{a.icon}</span>
                <span className="font-bold">{a.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action button */}
        {result.won ? (
          <button
            onClick={onReview}
            className="w-full py-3 px-4 bg-navy hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-lg"
          >
            Review & Read Stories
          </button>
        ) : (
          <button
            onClick={onRetry}
            className="w-full py-3 px-4 bg-navy hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-lg"
          >
            Keep Trying
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Integrate ResultModal into GameBoard**

In `src/components/game-board.tsx`, add import:
```tsx
import ResultModal from "./result-modal";
```

Add state:
```tsx
const [showModal, setShowModal] = useState(false);
```

In `handleSubmit`, after setting result and gameWon:
```tsx
if (submitResult.won) {
  setGameWon(true);
  setTimeout(() => setShowModal(true), 1000); // Delay to show card animations first
} else {
  setShowModal(true);
}
```

Add modal rendering before the achievement toast:
```tsx
{showModal && result && (
  <ResultModal
    result={result}
    totalEvents={puzzle.events.length}
    onRetry={() => { setShowModal(false); handleRetry(); }}
    onReview={() => setShowModal(false)}
  />
)}
```

**Step 3: Commit**

```bash
git add src/components/result-modal.tsx src/components/game-board.tsx
git commit -m "feat: add ResultModal with XP display and achievement summary"
```

---

---

## Phase 8: Profile + Leaderboard Pages

### Task 8.1: Create StatsGrid component

**Files:**
- Create: `src/components/stats-grid.tsx`

**Step 1: Write the component**

Write `src/components/stats-grid.tsx`:

```tsx
// Renders a responsive grid of stat cards. Each card shows a label and value.
// Used on the profile page to display player performance metrics.

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
}

function StatCard({ label, value, subtext }: StatCardProps) {
  return (
    <div className="bg-white border border-border rounded-xl p-4 text-center">
      <p className="text-2xl font-bold text-navy">{value}</p>
      <p className="text-xs text-black/60 uppercase tracking-wide mt-1">{label}</p>
      {subtext && <p className="text-xs text-navy/50 mt-0.5">{subtext}</p>}
    </div>
  );
}

interface StatsGridProps {
  stats: {
    gamesPlayed: number;
    wins: number;
    winRate: number;
    currentStreak: number;
    bestStreak: number;
    avgSolveTimeMs: number;
    fastestSolveTimeMs: number | null;
    xp: number;
    level: number;
  };
}

// Formats milliseconds into a human-readable time string (e.g. "1:23")
function formatTime(ms: number): string {
  if (ms === 0) return "-";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return minutes > 0 ? `${minutes}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
}

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="Games Played" value={stats.gamesPlayed} />
      <StatCard label="Wins" value={stats.wins} subtext={`${stats.winRate}% win rate`} />
      <StatCard label="Current Streak" value={stats.currentStreak} />
      <StatCard label="Best Streak" value={stats.bestStreak} />
      <StatCard label="Avg Solve Time" value={formatTime(stats.avgSolveTimeMs)} />
      <StatCard label="Fastest Solve" value={stats.fastestSolveTimeMs ? formatTime(stats.fastestSolveTimeMs) : "-"} />
      <StatCard label="Total XP" value={stats.xp.toLocaleString()} />
      <StatCard label="Level" value={stats.level} />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/stats-grid.tsx
git commit -m "feat: create StatsGrid component for player stats display"
```

---

### Task 8.2: Create AchievementGrid component

**Files:**
- Create: `src/components/achievement-grid.tsx`

**Step 1: Write the component**

Write `src/components/achievement-grid.tsx`:

```tsx
import type { Achievement, UserAchievement } from "@/types";

interface AchievementGridProps {
  allAchievements: Achievement[];
  unlockedAchievements: UserAchievement[];
}

// Displays all achievements in a grid. Unlocked achievements show full color and details.
// Locked achievements are greyed out with a "?" placeholder.
export default function AchievementGrid({
  allAchievements,
  unlockedAchievements,
}: AchievementGridProps) {
  const unlockedIds = new Set(unlockedAchievements.map((a) => a.id));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {allAchievements.map((achievement) => {
        const isUnlocked = unlockedIds.has(achievement.id);

        return (
          <div
            key={achievement.id}
            className={`
              border rounded-xl p-4 text-center transition-all
              ${isUnlocked
                ? "border-lime bg-lime/10"
                : "border-border bg-gray-50 opacity-60"
              }
            `}
          >
            <div className="text-2xl mb-2">
              {isUnlocked ? achievement.icon : "🔒"}
            </div>
            <p className="text-sm font-bold text-navy">
              {isUnlocked ? achievement.title : "???"}
            </p>
            <p className="text-xs text-black/60 mt-1">
              {isUnlocked ? achievement.description : "Keep playing to unlock"}
            </p>
            {isUnlocked && (
              <p className="text-xs text-lime font-bold mt-1">
                +{achievement.xpReward} XP
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/achievement-grid.tsx
git commit -m "feat: create AchievementGrid component with locked/unlocked states"
```

---

### Task 8.3: Create Profile page

**Files:**
- Create: `src/app/profile/page.tsx`

**Step 1: Write the page**

Write `src/app/profile/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import StatsGrid from "@/components/stats-grid";
import AchievementGrid from "@/components/achievement-grid";
import type { PlayerStats, Achievement, UserAchievement } from "@/types";
import { XP_PER_LEVEL } from "@/lib/constants";

// All achievement definitions for displaying locked/unlocked grid
const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: "first_win", title: "First Blood", description: "Win your first game", icon: "🏆", xpReward: 50 },
  { id: "streak_3", title: "Hat Trick", description: "Achieve a 3-game win streak", icon: "🔥", xpReward: 100 },
  { id: "streak_7", title: "On Fire", description: "Achieve a 7-game win streak", icon: "💥", xpReward: 250 },
  { id: "streak_15", title: "Unstoppable", description: "Achieve a 15-game win streak", icon: "⚡", xpReward: 500 },
  { id: "no_hints", title: "Purist", description: "Win without using hints", icon: "🧠", xpReward: 75 },
  { id: "speed_demon", title: "Speed Demon", description: "Win in under 15 seconds", icon: "⏱️", xpReward: 150 },
  { id: "daily_5", title: "Dedicated", description: "Complete 5 daily challenges", icon: "📅", xpReward: 200 },
  { id: "daily_30", title: "Habitual", description: "Complete 30 daily challenges", icon: "🗓️", xpReward: 500 },
  { id: "games_50", title: "Veteran", description: "Play 50 games", icon: "🎮", xpReward: 300 },
  { id: "perfect_10", title: "Perfectionist", description: "Win 10 games with no hints", icon: "💎", xpReward: 400 },
];

// Profile page displaying player stats, XP progress, achievements, and recent game history.
// Requires wallet authentication — redirects to home if not connected.
export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/stats/me")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setAchievements(data.achievements || []);
        setRecentGames(data.recentGames || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status, router]);

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-navy/60">Loading profile...</p>
      </div>
    );
  }

  if (!stats) return null;

  // XP progress within current level
  const currentLevelXp = stats.xp % XP_PER_LEVEL;
  const progressPercent = (currentLevelXp / XP_PER_LEVEL) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4">
      <h1 className="text-2xl font-serif font-bold text-navy mb-6">Your Profile</h1>

      {/* XP Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-navy">Level {stats.level}</span>
          <span className="text-xs text-navy/60">
            {currentLevelXp} / {XP_PER_LEVEL} XP to next level
          </span>
        </div>
        <div className="w-full h-3 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-lime rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-navy mb-3">Stats</h2>
        <StatsGrid stats={stats} />
      </div>

      {/* Achievements */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-navy mb-3">
          Achievements ({achievements.length}/{ALL_ACHIEVEMENTS.length})
        </h2>
        <AchievementGrid
          allAchievements={ALL_ACHIEVEMENTS}
          unlockedAchievements={achievements}
        />
      </div>

      {/* Recent Games */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-navy mb-3">Recent Games</h2>
        {recentGames.length === 0 ? (
          <p className="text-sm text-black/60">No games played yet.</p>
        ) : (
          <div className="space-y-2">
            {recentGames.map((game: any, i: number) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  game.won ? "border-lime bg-lime/5" : "border-border"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-navy">{game.puzzleTitle}</p>
                  <p className="text-xs text-black/50">
                    {new Date(game.playedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${game.won ? "text-navy" : "text-red-500"}`}>
                    {game.won ? "Won" : "Lost"} ({game.score}/5)
                  </p>
                  <p className="text-xs text-black/50">
                    {Math.round(game.solveTimeMs / 1000)}s | {game.hintsUsed} hints
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat: create Profile page with stats, XP bar, achievements, and game history"
```

---

### Task 8.4: Create LeaderboardTable component

**Files:**
- Create: `src/components/leaderboard-table.tsx`

**Step 1: Write the component**

Write `src/components/leaderboard-table.tsx`:

```tsx
import type { LeaderboardEntry } from "@/types";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  sortBy: string;
}

// Truncates a wallet address to 0x1234...abcd format
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Renders the leaderboard table with rank, player identity, and stats.
// Highlights the current user's row for visibility.
export default function LeaderboardTable({ entries, sortBy }: LeaderboardTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-3 px-2 text-navy/60 font-medium">#</th>
            <th className="py-3 px-2 text-navy/60 font-medium">Player</th>
            <th className="py-3 px-2 text-navy/60 font-medium text-right">
              {sortBy === "xp" ? "XP" : sortBy === "streak" ? "Current Streak" : "Best Streak"}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.walletAddress}
              className={`border-b border-border/50 ${
                entry.isCurrentUser ? "bg-lime/10" : ""
              }`}
            >
              <td className="py-3 px-2 font-bold text-navy">{entry.rank}</td>
              <td className="py-3 px-2">
                <span className="font-medium text-navy">
                  {entry.ensName || truncateAddress(entry.walletAddress)}
                </span>
                {entry.isCurrentUser && (
                  <span className="ml-2 text-xs bg-lime text-navy px-2 py-0.5 rounded-full font-bold">
                    You
                  </span>
                )}
              </td>
              <td className="py-3 px-2 text-right font-bold text-navy">
                {sortBy === "xp"
                  ? entry.xp.toLocaleString()
                  : sortBy === "streak"
                    ? entry.currentStreak
                    : entry.bestStreak}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/leaderboard-table.tsx
git commit -m "feat: create LeaderboardTable component"
```

---

### Task 8.5: Create Leaderboard page

**Files:**
- Create: `src/app/leaderboard/page.tsx`

**Step 1: Write the page**

Write `src/app/leaderboard/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import LeaderboardTable from "@/components/leaderboard-table";
import type { LeaderboardEntry } from "@/types";

type SortOption = "xp" | "streak" | "best_streak";

// Public leaderboard page. Displays top 50 players sorted by XP, current streak,
// or best streak. Sort option toggles between three views.
export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("xp");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats/leaderboard?sort=${sortBy}`)
      .then((res) => res.json())
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sortBy]);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "xp", label: "Top XP" },
    { value: "streak", label: "Current Streak" },
    { value: "best_streak", label: "Best Streak" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4">
      <h1 className="text-2xl font-serif font-bold text-navy mb-6">Leaderboard</h1>

      {/* Sort toggle buttons */}
      <div className="flex gap-2 mb-6">
        {sortOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all
              ${sortBy === opt.value
                ? "bg-navy text-white"
                : "bg-border/30 text-navy hover:bg-border/50"
              }
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-navy/60 text-center py-12">Loading leaderboard...</p>
      ) : entries.length === 0 ? (
        <p className="text-black/60 text-center py-12">No players yet. Be the first!</p>
      ) : (
        <LeaderboardTable entries={entries} sortBy={sortBy} />
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/leaderboard/page.tsx
git commit -m "feat: create Leaderboard page with sortable views"
```

---

## Phase 9: Admin Puzzle Management

### Task 9.1: Create admin middleware utility

**Files:**
- Create: `src/lib/admin.ts`

**Step 1: Write the admin check utility**

Write `src/lib/admin.ts`:

```ts
import { auth } from "./auth";

// Returns the list of admin wallet addresses from environment variable.
// Addresses are lowercased for case-insensitive comparison.
function getAdminWallets(): string[] {
  const raw = process.env.ADMIN_WALLETS || "";
  return raw
    .split(",")
    .map((addr) => addr.trim().toLowerCase())
    .filter(Boolean);
}

// Checks if the currently authenticated user is an admin.
// Returns the wallet address if admin, null otherwise.
export async function requireAdmin(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const wallet = session.user.id.toLowerCase();
  const admins = getAdminWallets();

  return admins.includes(wallet) ? wallet : null;
}
```

**Step 2: Commit**

```bash
git add src/lib/admin.ts
git commit -m "feat: add admin wallet verification utility"
```

---

### Task 9.2: Create admin puzzle API routes

**Files:**
- Create: `src/app/api/admin/puzzles/route.ts`
- Create: `src/app/api/admin/puzzles/[id]/route.ts`

**Step 1: Write list/create route**

Write `src/app/api/admin/puzzles/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { puzzles, puzzleEvents } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";

// GET /api/admin/puzzles — list all puzzles with their events
// POST /api/admin/puzzles — create a new puzzle with events
// Both routes require admin wallet authentication.

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const allPuzzles = await db.query.puzzles.findMany({
    orderBy: [desc(puzzles.createdAt)],
  });

  // Fetch events for each puzzle
  const result = await Promise.all(
    allPuzzles.map(async (puzzle) => {
      const events = await db
        .select()
        .from(puzzleEvents)
        .where(require("drizzle-orm").eq(puzzleEvents.puzzleId, puzzle.id))
        .orderBy(puzzleEvents.orderIndex);

      return { ...puzzle, events };
    })
  );

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { title, category, isDaily, dailyDate, events } = body;

  // Validate required fields
  if (!title || !category || !Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Create puzzle
  const [puzzle] = await db
    .insert(puzzles)
    .values({
      title,
      category,
      isDaily: isDaily || false,
      dailyDate: dailyDate || null,
    })
    .returning();

  // Create events
  await db.insert(puzzleEvents).values(
    events.map((event: any, index: number) => ({
      puzzleId: puzzle.id,
      text: event.text,
      date: event.date,
      sortDate: new Date(event.sortDate),
      url: event.url || null,
      orderIndex: index,
    }))
  );

  return NextResponse.json(puzzle, { status: 201 });
}
```

**Step 2: Write edit/delete route**

Write `src/app/api/admin/puzzles/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { puzzles, puzzleEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";

// PUT /api/admin/puzzles/[id] — update puzzle metadata and replace all events
// DELETE /api/admin/puzzles/[id] — delete puzzle and all its events (cascade)

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { title, category, isDaily, dailyDate, events } = body;

  // Update puzzle metadata
  await db
    .update(puzzles)
    .set({ title, category, isDaily: isDaily || false, dailyDate: dailyDate || null })
    .where(eq(puzzles.id, id));

  // Replace all events (delete existing, insert new)
  if (Array.isArray(events)) {
    await db.delete(puzzleEvents).where(eq(puzzleEvents.puzzleId, id));
    await db.insert(puzzleEvents).values(
      events.map((event: any, index: number) => ({
        puzzleId: id,
        text: event.text,
        date: event.date,
        sortDate: new Date(event.sortDate),
        url: event.url || null,
        orderIndex: index,
      }))
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  // Cascade delete handles puzzle_events via FK constraint
  await db.delete(puzzles).where(eq(puzzles.id, id));

  return NextResponse.json({ success: true });
}
```

**Step 3: Commit**

```bash
git add src/app/api/admin/puzzles/
git commit -m "feat: add admin puzzle CRUD API routes"
```

---

### Task 9.3: Create Admin page

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin-puzzle-form.tsx`

**Step 1: Write AdminPuzzleForm component**

Write `src/components/admin-puzzle-form.tsx`:

```tsx
"use client";

import { useState } from "react";

interface EventInput {
  text: string;
  date: string;
  sortDate: string;
  url: string;
}

interface AdminPuzzleFormProps {
  onSubmit: (data: {
    title: string;
    category: string;
    isDaily: boolean;
    dailyDate: string;
    events: EventInput[];
  }) => Promise<void>;
  initial?: {
    title: string;
    category: string;
    isDaily: boolean;
    dailyDate: string;
    events: EventInput[];
  };
}

// Form for creating or editing a puzzle. Allows adding/removing event rows
// and setting puzzle metadata (title, category, daily flag).
export default function AdminPuzzleForm({ onSubmit, initial }: AdminPuzzleFormProps) {
  const [title, setTitle] = useState(initial?.title || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [isDaily, setIsDaily] = useState(initial?.isDaily || false);
  const [dailyDate, setDailyDate] = useState(initial?.dailyDate || "");
  const [events, setEvents] = useState<EventInput[]>(
    initial?.events || [{ text: "", date: "", sortDate: "", url: "" }]
  );
  const [submitting, setSubmitting] = useState(false);

  const addEvent = () => {
    setEvents([...events, { text: "", date: "", sortDate: "", url: "" }]);
  };

  const removeEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  const updateEvent = (index: number, field: keyof EventInput, value: string) => {
    const updated = [...events];
    updated[index] = { ...updated[index], [field]: value };
    setEvents(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ title, category, isDaily, dailyDate, events });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Puzzle metadata */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-navy mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border border-border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-navy mb-1">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full border border-border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isDaily}
            onChange={(e) => setIsDaily(e.target.checked)}
          />
          <span className="text-navy font-medium">Daily Challenge</span>
        </label>
        {isDaily && (
          <input
            type="date"
            value={dailyDate}
            onChange={(e) => setDailyDate(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm"
          />
        )}
      </div>

      {/* Events — listed in correct chronological order (index = orderIndex) */}
      <div>
        <h3 className="text-sm font-bold text-navy mb-3">
          Events (in correct chronological order, earliest first)
        </h3>
        {events.map((event, i) => (
          <div key={i} className="border border-border rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-navy/60">Event {i + 1}</span>
              {events.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEvent(i)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            <textarea
              value={event.text}
              onChange={(e) => updateEvent(i, "text", e.target.value)}
              placeholder="Event description"
              required
              className="w-full border border-border rounded-lg px-3 py-2 text-sm mb-2"
              rows={2}
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={event.date}
                onChange={(e) => updateEvent(i, "date", e.target.value)}
                placeholder="Display date (e.g. 1/7/2026)"
                required
                className="border border-border rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={event.sortDate}
                onChange={(e) => updateEvent(i, "sortDate", e.target.value)}
                placeholder="Sort date (YYYY-MM-DD)"
                required
                className="border border-border rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="url"
                value={event.url}
                onChange={(e) => updateEvent(i, "url", e.target.value)}
                placeholder="Source URL (optional)"
                className="border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addEvent}
          className="text-sm text-navy font-bold hover:underline"
        >
          + Add Event
        </button>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-navy text-white font-bold rounded-xl disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Save Puzzle"}
      </button>
    </form>
  );
}
```

**Step 2: Write Admin page**

Write `src/app/admin/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminPuzzleForm from "@/components/admin-puzzle-form";

// Admin page for managing puzzles. Gated to wallet addresses in ADMIN_WALLETS env var.
// Shows existing puzzles and a form to create new ones.
export default function AdminPage() {
  const { status } = useSession();
  const router = useRouter();
  const [puzzles, setPuzzles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/admin/puzzles")
      .then((res) => {
        if (res.status === 403) throw new Error("Not authorized as admin");
        if (!res.ok) throw new Error("Failed to load puzzles");
        return res.json();
      })
      .then(setPuzzles)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status, router]);

  const handleCreate = async (data: any) => {
    const res = await fetch("/api/admin/puzzles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error("Failed to create puzzle");

    const puzzle = await res.json();
    setPuzzles([puzzle, ...puzzles]);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this puzzle?")) return;

    const res = await fetch(`/api/admin/puzzles/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPuzzles(puzzles.filter((p) => p.id !== id));
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-navy/60">Loading admin panel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold text-navy">Admin: Puzzles</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-lime text-navy font-bold rounded-lg text-sm"
        >
          {showForm ? "Cancel" : "+ New Puzzle"}
        </button>
      </div>

      {showForm && (
        <div className="mb-8 border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-navy mb-4">Create New Puzzle</h2>
          <AdminPuzzleForm onSubmit={handleCreate} />
        </div>
      )}

      {/* Existing puzzles list */}
      <div className="space-y-3">
        {puzzles.map((puzzle) => (
          <div
            key={puzzle.id}
            className="border border-border rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-bold text-navy">{puzzle.title}</p>
              <p className="text-xs text-black/50">{puzzle.category} | {puzzle.events?.length || 0} events</p>
              {puzzle.isDaily && (
                <span className="text-xs bg-lime text-navy px-2 py-0.5 rounded-full font-bold">
                  Daily: {puzzle.dailyDate}
                </span>
              )}
            </div>
            <button
              onClick={() => handleDelete(puzzle.id)}
              className="text-xs text-red-500 hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/admin-puzzle-form.tsx src/app/admin/page.tsx
git commit -m "feat: create Admin page with puzzle creation and management"
```

---

## Phase 10: Daily Challenge System

### Task 10.1: Update puzzle fetching to prioritize daily challenges

The daily challenge system is already supported by the existing schema (`is_daily`, `daily_date` columns) and the `/api/puzzles/today` route already checks for a daily puzzle first. This phase focuses on:

1. Ensuring the admin can flag puzzles as daily via the admin form (already done in Task 9.3)
2. Adding a visual indicator on the game page when playing a daily challenge
3. Enforcing one-attempt-per-daily for authenticated users

**Files:**
- Modify: `src/app/api/game/submit/route.ts`
- Modify: `src/components/game-board.tsx`

**Step 1: Add daily duplicate check to submit route**

In `src/app/api/game/submit/route.ts`, after fetching the puzzle and before recording the result, add a check:

```ts
// Enforce one submission per daily challenge per user
if (isDaily && session?.user?.id) {
  const existingDaily = await db
    .select({ id: gameResults.id })
    .from(gameResults)
    .where(
      and(
        eq(gameResults.userId, user.id),
        eq(gameResults.puzzleId, puzzleId)
      )
    )
    .limit(1);

  if (existingDaily.length > 0) {
    return NextResponse.json(
      { error: "You have already completed today's daily challenge" },
      { status: 409 }
    );
  }
}
```

**Step 2: Add daily indicator to GameBoard**

Add an optional `isDaily` prop to `GameBoardProps`:

```ts
interface GameBoardProps {
  puzzle: Puzzle;
  isDaily?: boolean;
  onSubmit: (orderedIds: string[], hintsUsed: number, solveTimeMs: number) => Promise<SubmitResult>;
  onNextPuzzle: () => void;
}
```

In the header section of GameBoard, add a daily badge:

```tsx
{isDaily && (
  <span className="text-xs bg-navy text-white px-2 py-0.5 rounded-full font-bold">
    Daily Challenge
  </span>
)}
```

**Step 3: Commit**

```bash
git add src/app/api/game/submit/route.ts src/components/game-board.tsx
git commit -m "feat: add daily challenge enforcement and visual indicator"
```

---

### Task 10.2: Final deployment and environment variable setup

**Step 1: Set all environment variables in Vercel dashboard**

Go to Vercel → Project → Settings → Environment Variables:

- `POSTGRES_URL` — from Vercel Postgres (should already be linked)
- `AUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — from cloud.walletconnect.com
- `ADMIN_WALLETS` — comma-separated checksummed admin wallet addresses

**Step 2: Run seed on production database**

```bash
POSTGRES_URL="<production-url>" npm run db:seed
```

**Step 3: Push all changes and trigger deploy**

```bash
git push origin main
```

**Step 4: Verify production deployment**

- Visit deployed URL
- Play a game as guest
- Connect wallet via RainbowKit
- Verify SIWE sign-in works
- Submit a game and check that stats persist
- Check `/profile` page shows stats
- Check `/leaderboard` page loads
- Verify admin panel at `/admin` (with admin wallet)

**Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "chore: final deployment fixes"
```

---

## Summary: All Tasks

| Phase | Tasks | Description |
|-------|-------|-------------|
| **1** | 1.1–1.3 | Next.js scaffold, Tailwind brand theme, Vercel deploy |
| **2** | 2.1–2.4 | Drizzle setup, schema, migrations, seed data |
| **3** | 3.1–3.9 | Types, constants, dnd-kit, GameCard, GameTimer, GameBoard, Navbar, game page, remove old HTML |
| **4** | 4.1–4.5 | Web3 deps, wagmi config, providers, NextAuth SIWE, ConnectButton |
| **5** | 5.1–5.5 | Puzzle API routes, submit route (with XP + achievements), stats route, leaderboard route, connect game page to API |
| **6** | 6.1–6.4 | GuestBanner, localStorage utility, migration route, migration trigger |
| **7** | 7.1–7.3 | AchievementToast, toast integration, ResultModal with XP |
| **8** | 8.1–8.5 | StatsGrid, AchievementGrid, Profile page, LeaderboardTable, Leaderboard page |
| **9** | 9.1–9.3 | Admin utility, admin API routes, Admin page with puzzle form |
| **10** | 10.1–10.2 | Daily challenge enforcement, final deployment |

**Total tasks: 30**
