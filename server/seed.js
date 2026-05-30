import "dotenv/config";

import { closeDb, ensureSchema, query } from "./db.js";

try {
  console.log("Connecting to PostgreSQL...");

  await ensureSchema();

  console.log("Resetting chores...");

  await query("delete from chores");
  await query(
    "insert into chores (text, done) values ($1, false), ($2, false)",
    ["Feed chickens", "Check water trough"],
  );

  console.log("Seeded farm_chores_dev.");
} catch (error) {
  console.error("Could not seed PostgreSQL.");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await closeDb();
}
