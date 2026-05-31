import "dotenv/config";
import cors from "cors";
import express from "express";

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

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
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

async function ensureReady() {
  if (schemaReady) {
    return;
  }

  await ensureStore();
  schemaReady = true;
}

ensureReady().catch((error) => {
  logEvent("database.schema_error", { error: serializeError(error) });
});

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

app.get("/api/chores", asyncHandler(async (request, response) => {
  await ensureReady();
  response.json(await listChores());
}));

app.post("/api/chores", asyncHandler(async (request, response) => {
  await ensureReady();
  const text = request.body?.text?.trim();

  if (!text) {
    response.status(400).json({ error: "Chore text is required." });
    return;
  }

  response.status(201).json(await createChore(text));
}));

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

app.use((error, request, response, next) => {
  logEvent("http.error", {
    method: request.method,
    path: request.path,
    error: serializeError(error),
  });
  response.status(500).json({ error: "Something went wrong." });
});

app.listen(port, () => {
  logEvent("server.started", { url: `http://127.0.0.1:${port}` });
});
