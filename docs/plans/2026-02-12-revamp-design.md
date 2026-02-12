# Depth Perception — Full Revamp Design

**Date:** 2026-02-12
**Status:** Approved

---

## 1. Architecture Overview

**Stack:**
- **Next.js 15 (App Router)** — hosted on Vercel
- **RainbowKit v2 + wagmi v2 + viem** — wallet connection (ETH mainnet + Fraxtal)
- **SIWE (Sign-In with Ethereum)** — session-based auth via `next-auth` with SIWE adapter
- **Vercel Postgres + Drizzle ORM** — all persistent data
- **Tailwind CSS v4** — styling (Leviathan brand palette preserved)
- **TypeScript** — everything typed
- **@dnd-kit/core + @dnd-kit/sortable** — cross-platform drag-and-drop (replaces broken HTML5 drag on mobile)

**Auth Flow:**
1. User lands on site → plays immediately as guest (stats in `localStorage`)
2. "Connect Wallet" (RainbowKit modal) → user signs SIWE message → `next-auth` creates server session tied to wallet address
3. On first authenticated session, guest stats from `localStorage` migrate to DB via `/api/game/migrate`
4. Subsequent visits with same wallet auto-restore full profile

**Chains:**
- RainbowKit configured with `mainnet` (chain ID 1) and `fraxtal` (chain ID 252)
- SIWE works regardless of connected chain — signature proves wallet ownership

**Deployment:**
- Vercel project linked to GitHub repo
- Environment variables: DB connection string, `NEXTAUTH_SECRET`, WalletConnect project ID, `ADMIN_WALLETS`

---

## 2. Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Auto-generated |
| `wallet_address` | `varchar(42)` | Unique, checksummed, indexed |
| `ens_name` | `varchar` | Cached ENS (nullable) |
| `xp` | `integer` | Total XP, default 0 |
| `created_at` | `timestamp` | First login |
| `last_played_at` | `timestamp` | Updated on each game |

### `game_results`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → users | |
| `puzzle_id` | `uuid` FK → puzzles | |
| `won` | `boolean` | |
| `score` | `integer` | Correct placements (0-5) |
| `hints_used` | `integer` | 0-3 |
| `solve_time_ms` | `integer` | Milliseconds from puzzle load to submit |
| `played_at` | `timestamp` | |

### `puzzles`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `title` | `varchar` | e.g. "January, 2026" |
| `category` | `varchar` | e.g. "Leviathan News" |
| `is_daily` | `boolean` | Daily challenge flag |
| `daily_date` | `date` | Which day this puzzle is for (nullable) |
| `created_at` | `timestamp` | |

### `puzzle_events`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `puzzle_id` | `uuid` FK → puzzles | |
| `text` | `text` | Event description |
| `date` | `varchar` | Display date string |
| `sort_date` | `timestamp` | Actual date for sorting correctness |
| `url` | `varchar` | Source link (nullable) |
| `order_index` | `integer` | Correct position |

### `achievements`
| Column | Type | Notes |
|---|---|---|
| `id` | `varchar` PK | Slug, e.g. `first_win`, `streak_10` |
| `title` | `varchar` | "First Blood" |
| `description` | `varchar` | "Win your first game" |
| `icon` | `varchar` | Emoji or icon identifier |
| `xp_reward` | `integer` | XP granted on unlock |

### `user_achievements`
| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` FK | |
| `achievement_id` | `varchar` FK | |
| `unlocked_at` | `timestamp` | |
| PK | composite | `(user_id, achievement_id)` |

Derived stats (current streak, best streak, win rate, fastest solve) are computed from `game_results` via queries — no denormalized counters.

---

## 3. Gamification System

### XP Awards
| Action | XP |
|---|---|
| Win a puzzle | +100 |
| Perfect (no hints used) | +50 bonus |
| Win under 30 seconds | +30 bonus |
| Maintain streak (per consecutive win) | +20 × streak multiplier |
| Daily challenge completed | +75 |
| Achievement unlocked | varies per achievement |

### Achievements
| Slug | Title | Condition | XP |
|---|---|---|---|
| `first_win` | First Blood | Win 1 game | 50 |
| `streak_3` | Hat Trick | 3 win streak | 100 |
| `streak_7` | On Fire | 7 win streak | 250 |
| `streak_15` | Unstoppable | 15 win streak | 500 |
| `no_hints` | Purist | Win without hints | 75 |
| `speed_demon` | Speed Demon | Win under 15 seconds | 150 |
| `daily_5` | Dedicated | 5 daily challenges | 200 |
| `daily_30` | Habitual | 30 daily challenges | 500 |
| `games_50` | Veteran | Play 50 games | 300 |
| `perfect_10` | Perfectionist | 10 perfect wins | 400 |

### Daily Challenges
- One puzzle flagged `is_daily = true` with `daily_date = today`
- Available for 24 hours (UTC boundary)
- User can only submit a daily once (unique constraint: `user_id + puzzle_id` for dailies)
- Results feed into streak and XP like normal games

### Leaderboard
- Computed server-side via API route
- Three views: Top XP, Longest Current Streak, Best Streak All-Time
- Shows top 50 players, wallet truncated (`0x1234...abcd`) or ENS if available
- Current user's rank highlighted

### Profile Page (`/profile`)
- Stats dashboard: games played, wins, win rate, current streak, best streak, avg solve time, fastest solve
- XP bar with level indicator (every 500 XP = 1 level)
- Achievement grid — unlocked full color, locked greyed with "?" description
- Recent game history (last 20 games)

---

## 4. Page Structure & API Routes

### Pages
| Route | Purpose |
|---|---|
| `/` | Main game page — puzzle play, guest or authenticated |
| `/profile` | User stats, achievements, history (wallet required) |
| `/leaderboard` | Public leaderboard |
| `/admin` | Puzzle management (wallet-gated to admin addresses) |

### API Routes
| Route | Method | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth SIWE handlers |
| `/api/puzzles/today` | GET | Today's daily puzzle or random fallback |
| `/api/puzzles/[id]` | GET | Specific puzzle with events |
| `/api/puzzles/archive` | GET | All puzzles (paginated) |
| `/api/game/submit` | POST | Submit result — server validates answer, records stats, checks achievements, awards XP |
| `/api/game/migrate` | POST | Migrate guest localStorage stats to DB |
| `/api/stats/me` | GET | Current user's full stats |
| `/api/stats/leaderboard` | GET | Top 50, accepts `?sort=xp\|streak\|best_streak` |
| `/api/admin/puzzles` | GET/POST | List/create puzzles (admin-gated) |
| `/api/admin/puzzles/[id]` | PUT/DELETE | Edit/delete puzzles (admin-gated) |

### Server-side validation (`/api/game/submit`)
- Client sends: `puzzle_id`, `ordered_event_ids[]`, `hints_used`, `solve_time_ms`
- Server fetches correct order from DB, compares, computes score
- Prevents client-side cheating — client never knows correct order until after submission
- Returns: `{ won, score, correctOrder, xpEarned, newAchievements[] }`

### Admin gating
- `ADMIN_WALLETS` env var — comma-separated list of checksummed addresses
- Middleware checks session wallet against this list

---

## 5. Component Architecture

### Layout
```
src/app/
├── layout.tsx            ← RainbowKit + wagmi providers, global nav
├── page.tsx              ← Game page
├── profile/page.tsx
├── leaderboard/page.tsx
├── admin/page.tsx
└── api/...
```

### Components
| Component | Responsibility |
|---|---|
| `providers.tsx` | Client wrapper: WagmiConfig, RainbowKitProvider, SessionProvider |
| `navbar.tsx` | Logo, Connect Wallet button, nav links, XP/level badge |
| `game-board.tsx` | Core game logic — dnd-kit sortable, hints, lock, timer |
| `game-card.tsx` | Individual draggable event card |
| `game-timer.tsx` | Visible timer, starts on puzzle load |
| `result-modal.tsx` | Win/loss — shows XP earned, achievements unlocked |
| `achievement-toast.tsx` | Pop-up on achievement unlock |
| `stats-grid.tsx` | Reusable stat cards |
| `achievement-grid.tsx` | Achievement display (locked/unlocked) |
| `leaderboard-table.tsx` | Sortable table with wallet/ENS, rank, stats |
| `guest-banner.tsx` | "Connect wallet to save progress" banner |
| `admin-puzzle-form.tsx` | Create/edit puzzle with event rows |

### UI Decisions
- Leviathan brand palette preserved: `#021f53`, `#c1ff72`, white
- Sticky navbar replaces inline header
- Timer visible during gameplay (top-right of game area)
- XP/level badge next to wallet in navbar
- Achievement toast slides in from top-right
- Mobile-first: tap-to-swap preserved, dnd-kit handles both touch and pointer

### Guest Mode
- `game-board.tsx` checks session — if none, reads/writes `localStorage` key `depth_guest_stats`
- `guest-banner.tsx` shown below navbar for unauthenticated users
- On wallet connect + SIWE, `useEffect` fires migration to `/api/game/migrate`
- After migration, `localStorage` cleared

---

## 6. Project Structure

```
depth-perception/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── profile/page.tsx
│   │   ├── leaderboard/page.tsx
│   │   ├── admin/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── puzzles/
│   │       ├── game/
│   │       ├── stats/
│   │       └── admin/
│   ├── components/
│   │   ├── providers.tsx
│   │   ├── navbar.tsx
│   │   ├── game-board.tsx
│   │   ├── game-card.tsx
│   │   ├── game-timer.tsx
│   │   ├── result-modal.tsx
│   │   ├── achievement-toast.tsx
│   │   ├── stats-grid.tsx
│   │   ├── achievement-grid.tsx
│   │   ├── leaderboard-table.tsx
│   │   ├── guest-banner.tsx
│   │   └── admin-puzzle-form.tsx
│   ├── db/
│   │   ├── schema.ts
│   │   ├── index.ts
│   │   └── migrations/
│   ├── lib/
│   │   ├── achievements.ts
│   │   ├── xp.ts
│   │   ├── auth.ts
│   │   ├── admin.ts
│   │   └── constants.ts
│   └── types/
│       └── index.ts
├── public/
│   └── leviathan-200x200-circle.png
├── drizzle.config.ts
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── .env.local
```

---

## 7. Implementation Phases

| Phase | What | Why This Order |
|---|---|---|
| **1** | Next.js scaffold + Tailwind + Vercel deploy | Confirm infra works end-to-end |
| **2** | DB schema + Drizzle migrations + seed data | Data layer before anything reads from it |
| **3** | Port game UI to Next.js components + `@dnd-kit` | Core product — playable without auth |
| **4** | RainbowKit + SIWE + NextAuth integration | Auth layer on top of working game |
| **5** | API routes: submit, stats, puzzle fetching | Backend connecting game to DB |
| **6** | Guest mode + localStorage + migration flow | UX for unauthenticated users |
| **7** | Gamification: XP, achievements, timer | Layer on top of working submit flow |
| **8** | Profile + leaderboard pages | Display surfaces for accumulated data |
| **9** | Admin puzzle management | Content management last — seed data covers early use |
| **10** | Daily challenge system | Cron or date-based puzzle selection |

---

## Key Dependencies

```
next, react, react-dom
@rainbow-me/rainbowkit, wagmi, viem
next-auth, siwe
drizzle-orm, @vercel/postgres
@dnd-kit/core, @dnd-kit/sortable
tailwindcss
```
