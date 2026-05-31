import "dotenv/config";
import cors from "cors";
import express from "express";

// Data and logging dependencies live outside the route file so this server can
// stay focused on HTTP concerns: parsing, validation, status codes, and routing.
import { logEvent, serializeError } from "./logger.js";
import {
  createChore,
  deleteChore,
  ensureStore,
  listChores,
  storeMode,
  updateChore,
  usesDatabase,
} from "./store.js";

// Runtime mode
//
// `npm run dev:api:mock` starts this same server with `--mock`. The flag keeps
// the command simple while letting `store.js` swap Postgres for in-memory data.
if (process.argv.includes("--mock")) {
  process.env.FARM_CHORES_DATA_MODE = "mock";
}

// Main server setup
//
// Express owns the HTTP lifecycle. The store owns chore persistence.
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Request logging middleware
//
// Every API request emits one structured line for local logs and rack/Hermes
// service tracking.
app.use((request, response, next) => {
  const startedAt = process.hrtime.bigint();

  response.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logEvent("http.request", {
      method: request.method,
      path: request.path,
      status_code: response.statusCode,
      duration_ms: Math.round(durationMs),
      remote_addr: request.ip,
    });
  });

  next();
});

// Wraps async route handlers so thrown errors land in the shared error handler.
function asyncHandler(handler) {
  return async (request, response, next) => {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}

let schemaReady = false;

// Ensures the selected store is ready once per server process.
//
// In Postgres mode this creates the chores table if needed. In mock mode it is
// intentionally a no-op because the sample chores already live in memory.
async function ensureReady() {
  if (schemaReady) {
    return;
  }

  await ensureStore();
  schemaReady = true;
}

// Try to initialize early so startup logs show database problems quickly, while
// still allowing `/api/health` to report the failure with a useful response.
ensureReady().catch((error) => {
  logEvent("database.schema_error", { error: serializeError(error) });
});

// Routes
//
// Route handlers validate HTTP input, then call store functions for actual data
// work. They should not care whether the backing store is Postgres or mock data.

// Reports whether the API is up and which data mode is currently active.
app.get("/api/health", asyncHandler(async (request, response) => {
  try {
    await ensureReady();
    response.json({ ok: true, database: usesDatabase(), dataMode: storeMode() });
  } catch (error) {
    logEvent("health.database_error", { error: serializeError(error) });
    response.status(503).json({
      ok: false,
      database: usesDatabase(),
      dataMode: storeMode(),
      error: error.message || "Database unavailable.",
    });
  }
}));

// Lists chores in display order.
app.get("/api/chores", asyncHandler(async (request, response) => {
  await ensureReady();
  response.json(await listChores());
}));

// Creates one chore from the submitted text.
app.post("/api/chores", asyncHandler(async (request, response) => {
  await ensureReady();
  const text = request.body?.text?.trim();

  if (!text) {
    response.status(400).json({ error: "Chore text is required." });
    return;
  }

  response.status(201).json(await createChore(text));
}));

// Updates chore text, done state, or both.
app.patch("/api/chores/:id", asyncHandler(async (request, response) => {
  await ensureReady();
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id < 1) {
    response.status(400).json({ error: "Invalid chore id." });
    return;
  }

  const updates = {};

  if (typeof request.body?.text === "string") {
    const text = request.body.text.trim();
    if (!text) {
      response.status(400).json({ error: "Chore text is required." });
      return;
    }
    updates.text = text;
  }

  if (typeof request.body?.done === "boolean") {
    updates.done = request.body.done;
  }

  if (!Object.keys(updates).length) {
    response.status(400).json({ error: "No updates provided." });
    return;
  }

  const updatedChore = await updateChore(id, updates);

  if (!updatedChore) {
    response.status(404).json({ error: "Chore not found." });
    return;
  }

  response.json(updatedChore);
}));

// Deletes one chore by id.
app.delete("/api/chores/:id", asyncHandler(async (request, response) => {
  await ensureReady();
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id < 1) {
    response.status(400).json({ error: "Invalid chore id." });
    return;
  }

  await deleteChore(id);

  response.status(204).end();
}));

// Shared error handling
//
// Route-specific validation returns 4xx responses above. Anything that reaches
// here is unexpected and gets a generic 500 response plus structured details.
app.use((error, request, response, next) => {
  logEvent("http.error", {
    method: request.method,
    path: request.path,
    error: serializeError(error),
  });
  response.status(500).json({ error: "Something went wrong." });
});

// Start listening after routes and error handling are registered.
app.listen(port, () => {
  logEvent("server.started", { url: `http://127.0.0.1:${port}` });
});
