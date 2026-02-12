import "dotenv/config";
import { sql } from "@vercel/postgres";

// ── Seed Script ─────────────────────────────────────────────────────────────
// Seeds the database with the two original puzzles from the Depth Perception
// game and all 10 achievement definitions. Uses direct @vercel/postgres SQL
// queries rather than Drizzle ORM so it can run standalone via `npm run db:seed`.
//
// This script is idempotent: it uses ON CONFLICT DO NOTHING to skip rows that
// already exist. Running it multiple times is safe.

// ── Achievement definitions ─────────────────────────────────────────────────
// These match the IDs and conditions defined in src/lib/achievements.ts.
const ACHIEVEMENTS = [
  {
    id: "first_win",
    title: "First Victory",
    description: "Win your first game",
    icon: "🏆",
    xpReward: 50,
  },
  {
    id: "streak_3",
    title: "On a Roll",
    description: "Win 3 games in a row",
    icon: "🔥",
    xpReward: 100,
  },
  {
    id: "streak_7",
    title: "Unstoppable",
    description: "Win 7 games in a row",
    icon: "⚡",
    xpReward: 250,
  },
  {
    id: "streak_15",
    title: "Legendary Streak",
    description: "Win 15 games in a row",
    icon: "👑",
    xpReward: 500,
  },
  {
    id: "no_hints",
    title: "No Help Needed",
    description: "Win a game without using any hints",
    icon: "🧠",
    xpReward: 75,
  },
  {
    id: "speed_demon",
    title: "Speed Demon",
    description: "Win a game in under 15 seconds",
    icon: "⏱️",
    xpReward: 150,
  },
  {
    id: "daily_5",
    title: "Daily Devotee",
    description: "Complete 5 daily challenges",
    icon: "📅",
    xpReward: 200,
  },
  {
    id: "daily_30",
    title: "Monthly Master",
    description: "Complete 30 daily challenges",
    icon: "🗓️",
    xpReward: 500,
  },
  {
    id: "games_50",
    title: "Veteran",
    description: "Play 50 total games",
    icon: "🎮",
    xpReward: 300,
  },
  {
    id: "perfect_10",
    title: "Perfectionist",
    description: "Win 10 games with a perfect score (no hints)",
    icon: "💎",
    xpReward: 400,
  },
];

// ── Puzzle data ─────────────────────────────────────────────────────────────
// Two puzzles from the original single-page game: one Leviathan News puzzle
// covering January 2026 events, and one historical demo puzzle.
const PUZZLES = [
  {
    title: "January, 2026",
    category: "Leviathan News",
    isDaily: true,
    dailyDate: "2026-01-27",
    events: [
      {
        text: 'Vitalik brings back the milady, and shares his view on the Ethereum community\'s mission for 2026 - "To build the world computer that serves as a central infrastructure piece of a more free and open internet"',
        date: "1/1/2026",
        sortDate: "2026-01-01",
        url: "https://leviathannews.xyz/vitalik-brings-back-the-milady-and-shares-his-view-on-the-ethereum-communitys-mission-for-2026-to-build-the-world-computer-that-serves-as-a-central-infrastructure-piece-of-a-more-f",
      },
      {
        text: "Japan's 30Y Government Bond Yield surges to a new record high of 3.52%.",
        date: "1/7/2026",
        sortDate: "2026-01-07",
        url: "https://leviathannews.xyz/japans-30y-government-bond-yield-surges-to-a-new-record-high-of-352",
      },
      {
        text: "Yearn's yYB crosses 1 million YB locked",
        date: "1/12/2026",
        sortDate: "2026-01-12",
        url: "https://leviathannews.xyz/yearns-yyb-crosses-1-million-yb-locked",
      },
      {
        text: "Caroline Ellison, former Alameda Research co-CEO and key FTX witness, to be released from New York federal halfway house after serving part of a two-year fraud sentence.",
        date: "1/21/2026",
        sortDate: "2026-01-21",
        url: "https://leviathannews.xyz/caroline-ellison-former-alameda-research-co-ceo-and-key-ftx-witness-to-be-released-wednesday-from-new-york-federal-halfway-house-after-serving-part-of-a-two-year-fraud-sentence",
      },
      {
        text: "Introducing Polaris - a self-scaling stablecoin operating system",
        date: "1/27/2026",
        sortDate: "2026-01-27",
        url: "https://leviathannews.xyz/introducing-polaris-a-self-scaling-stablecoin-operating-system",
      },
    ],
  },
  {
    title: "Demo Puzzle",
    category: "Historical Events",
    isDaily: false,
    dailyDate: null,
    events: [
      {
        text: "Apollo 11 lands on the Moon.",
        date: "1969",
        sortDate: "1969-07-20",
        url: "https://en.wikipedia.org/wiki/Apollo_11",
      },
      {
        text: "The Berlin Wall falls.",
        date: "1989",
        sortDate: "1989-11-09",
        url: "https://en.wikipedia.org/wiki/Fall_of_the_Berlin_Wall",
      },
      {
        text: "First iPod is released.",
        date: "2001",
        sortDate: "2001-10-23",
        url: "https://en.wikipedia.org/wiki/IPod",
      },
      {
        text: "First iPhone is released.",
        date: "2007",
        sortDate: "2007-06-29",
        url: "https://en.wikipedia.org/wiki/IPhone",
      },
      {
        text: "SpaceX launches first crewed mission.",
        date: "2020",
        sortDate: "2020-05-30",
        url: "https://en.wikipedia.org/wiki/SpaceX_Demo-2",
      },
    ],
  },
];

// ── Main seed function ──────────────────────────────────────────────────────
async function seed() {
  console.log("Starting database seed...");

  // ── Seed achievements ─────────────────────────────────────────────────
  console.log(`Seeding ${ACHIEVEMENTS.length} achievements...`);
  for (const achievement of ACHIEVEMENTS) {
    await sql`
      INSERT INTO achievements (id, title, description, icon, xp_reward)
      VALUES (
        ${achievement.id},
        ${achievement.title},
        ${achievement.description},
        ${achievement.icon},
        ${achievement.xpReward}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log("Achievements seeded.");

  // ── Seed puzzles ──────────────────────────────────────────────────────
  console.log(`Seeding ${PUZZLES.length} puzzles...`);
  for (const puzzle of PUZZLES) {
    // Insert the puzzle and retrieve its generated UUID. Uses a CTE with
    // ON CONFLICT to handle idempotency: if a puzzle with the same title
    // already exists, we fall back to a SELECT to get its existing ID.
    const puzzleResult = await sql`
      WITH inserted AS (
        INSERT INTO puzzles (title, category, is_daily, daily_date)
        VALUES (
          ${puzzle.title},
          ${puzzle.category},
          ${puzzle.isDaily},
          ${puzzle.dailyDate}
        )
        ON CONFLICT DO NOTHING
        RETURNING id
      )
      SELECT id FROM inserted
      UNION ALL
      SELECT id FROM puzzles WHERE title = ${puzzle.title}
      LIMIT 1
    `;

    const puzzleId = puzzleResult.rows[0].id;
    console.log(`  Puzzle "${puzzle.title}" => ${puzzleId}`);

    // Insert events for this puzzle. Each event's orderIndex is derived
    // from its position in the array (chronological order).
    for (let i = 0; i < puzzle.events.length; i++) {
      const event = puzzle.events[i];
      await sql`
        INSERT INTO puzzle_events (puzzle_id, text, date, sort_date, url, order_index)
        VALUES (
          ${puzzleId},
          ${event.text},
          ${event.date},
          ${event.sortDate}::timestamp,
          ${event.url},
          ${i}
        )
        ON CONFLICT DO NOTHING
      `;
    }
    console.log(`    Seeded ${puzzle.events.length} events.`);
  }

  console.log("Database seed complete.");
}

// ── Execute ─────────────────────────────────────────────────────────────────
seed()
  .then(() => {
    console.log("Seed script finished successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed script failed:", error);
    process.exit(1);
  });
