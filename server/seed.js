import "dotenv/config";

import { closeDb } from "./db.js";
import { logEvent, serializeError } from "./logger.js";
import { ensureStore, resetSeedChores } from "./store.js";

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
