import "dotenv/config";
import cors from "cors";
import express from "express";

import { ensureSchema, query } from "./db.js";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function asyncHandler(handler) {
  return async (request, response, next) => {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}

function formatChore(chore) {
  return {
    id: chore.id.toString(),
    text: chore.text,
    done: Boolean(chore.done),
  };
}

let schemaReady = false;

async function ensureReady() {
  if (schemaReady) {
    return;
  }

  await ensureSchema();
  schemaReady = true;
}

ensureReady().catch((error) => {
  console.error("Could not initialize database schema.", error);
});

app.get("/api/health", asyncHandler(async (request, response) => {
  try {
    await ensureReady();
    response.json({ ok: true, database: true });
  } catch (error) {
    console.error("Health check failed.", error);
    response.status(503).json({
      ok: false,
      database: false,
      error: error.message || "Database unavailable.",
    });
  }
}));

app.get("/api/chores", asyncHandler(async (request, response) => {
  await ensureReady();
  const result = await query(
    "select id, text, done from chores order by created_at asc, id asc",
  );

  response.json(result.rows.map(formatChore));
}));

app.post("/api/chores", asyncHandler(async (request, response) => {
  await ensureReady();
  const text = request.body?.text?.trim();

  if (!text) {
    response.status(400).json({ error: "Chore text is required." });
    return;
  }

  const result = await query(
    "insert into chores (text) values ($1) returning id, text, done",
    [text],
  );

  response.status(201).json(formatChore(result.rows[0]));
}));

app.patch("/api/chores/:id", asyncHandler(async (request, response) => {
  await ensureReady();
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id < 1) {
    response.status(400).json({ error: "Invalid chore id." });
    return;
  }

  const updates = [];
  const values = [];

  if (typeof request.body?.text === "string") {
    const text = request.body.text.trim();
    if (!text) {
      response.status(400).json({ error: "Chore text is required." });
      return;
    }
    values.push(text);
    updates.push(`text = $${values.length}`);
  }

  if (typeof request.body?.done === "boolean") {
    values.push(request.body.done);
    updates.push(`done = $${values.length}`);
  }

  if (!updates.length) {
    response.status(400).json({ error: "No updates provided." });
    return;
  }

  values.push(id);
  const result = await query(
    `update chores set ${updates.join(", ")} where id = $${values.length} returning id, text, done`,
    values,
  );

  if (!result.rows[0]) {
    response.status(404).json({ error: "Chore not found." });
    return;
  }

  response.json(formatChore(result.rows[0]));
}));

app.delete("/api/chores/:id", asyncHandler(async (request, response) => {
  await ensureReady();
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id < 1) {
    response.status(400).json({ error: "Invalid chore id." });
    return;
  }

  await query("delete from chores where id = $1", [id]);

  response.status(204).end();
}));

app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).json({ error: "Something went wrong." });
});

app.listen(port, () => {
  console.log(`Farm Chores API listening on http://127.0.0.1:${port}`);
});
