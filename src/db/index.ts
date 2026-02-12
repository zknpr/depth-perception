import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import * as schema from "./schema";

// Drizzle client configured for Vercel's serverless Postgres pool
export const db = drizzle(sql, { schema });
