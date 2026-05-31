import "dotenv/config";

import { closeDb } from "./db.js";
import { logEvent, serializeError } from "./logger.js";
import { ensureStore, resetSeedChores } from "./store.js";

// Seed script
//
// This is a one-shot dev helper, not part of the running API. It prepares the
// selected store, replaces chores with starter data, and closes the DB pool.
try {
  logEvent("seed.connecting");

  await ensureStore();

  logEvent("seed.resetting");

  await resetSeedChores();

  logEvent("seed.complete");
} catch (error) {
  logEvent("seed.error", { error: serializeError(error) });
  process.exitCode = 1;
} finally {
  await closeDb();
}
