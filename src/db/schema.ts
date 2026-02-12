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
  date: varchar("date", { length: 50 }).notNull(),
  sortDate: timestamp("sort_date").notNull(),
  url: varchar("url", { length: 2048 }),
  orderIndex: integer("order_index").notNull(),
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
  score: integer("score").notNull(),
  hintsUsed: integer("hints_used").notNull().default(0),
  solveTimeMs: integer("solve_time_ms").notNull(),
  playedAt: timestamp("played_at").defaultNow().notNull(),
});

// Achievement definitions — seeded on deploy, not user-created
export const achievements = pgTable("achievements", {
  id: varchar("id", { length: 50 }).primaryKey(),
  title: varchar("title", { length: 100 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 10 }).notNull(),
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
