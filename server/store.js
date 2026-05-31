import { ensureSchema, query } from "./db.js";

// Mock data
//
// This in-memory list backs `npm run dev:api:mock`. It resets whenever the API
// process restarts and deliberately does not touch local or remote Postgres.
let mockChores = [
  { id: 1, text: "Feed chickens", done: false },
  { id: 2, text: "Check water trough", done: false },
  { id: 3, text: "Walk the fence line", done: true },
];
let nextMockId = 4;

// Converts database/mock records into the API shape consumed by the React app.
function formatChore(chore) {
  return {
    id: chore.id.toString(),
    text: chore.text,
    done: Boolean(chore.done),
  };
}

// Mode helpers
//
// The store reads mode dynamically so `server/index.js --mock` can set it before
// the first request without needing a separate server entry file.

// Returns the active data mode: `postgres` by default, or `mock` for no-db dev.
export function storeMode() {
  return process.env.FARM_CHORES_DATA_MODE || "postgres";
}

// Tells health checks whether this process expects a real database.
export function usesDatabase() {
  return storeMode() !== "mock";
}

// Store lifecycle

// Prepares the selected data store before routes use it.
export async function ensureStore() {
  if (storeMode() === "mock") {
    return;
  }

  await ensureSchema();
}

// Chore operations
//
// Each exported operation mirrors one API capability and hides the storage
// choice from `index.js`.

// Returns every chore in stable display order.
export async function listChores() {
  if (storeMode() === "mock") {
    return mockChores.map(formatChore);
  }

  const result = await query(
    "select id, text, done from chores order by created_at asc, id asc",
  );

  return result.rows.map(formatChore);
}

// Creates a new undone chore and returns it in API format.
export async function createChore(text) {
  if (storeMode() === "mock") {
    const chore = { id: nextMockId, text, done: false };
    nextMockId += 1;
    mockChores.push(chore);
    return formatChore(chore);
  }

  const result = await query(
    "insert into chores (text) values ($1) returning id, text, done",
    [text],
  );

  return formatChore(result.rows[0]);
}

// Applies text and/or done changes to an existing chore.
export async function updateChore(id, updates) {
  if (storeMode() === "mock") {
    const chore = mockChores.find((item) => item.id === id);

    if (!chore) {
      return null;
    }

    if (typeof updates.text === "string") {
      chore.text = updates.text;
    }

    if (typeof updates.done === "boolean") {
      chore.done = updates.done;
    }

    return formatChore(chore);
  }

  const clauses = [];
  const values = [];

  if (typeof updates.text === "string") {
    values.push(updates.text);
    clauses.push(`text = $${values.length}`);
  }

  if (typeof updates.done === "boolean") {
    values.push(updates.done);
    clauses.push(`done = $${values.length}`);
  }

  values.push(id);
  const result = await query(
    `update chores set ${clauses.join(", ")} where id = $${values.length} returning id, text, done`,
    values,
  );

  return result.rows[0] ? formatChore(result.rows[0]) : null;
}

// Removes a chore. Deleting a missing id is treated as a successful no-op.
export async function deleteChore(id) {
  if (storeMode() === "mock") {
    mockChores = mockChores.filter((chore) => chore.id !== id);
    return;
  }

  await query("delete from chores where id = $1", [id]);
}

// Resets chores to starter dev data for `npm run seed`.
export async function resetSeedChores() {
  if (storeMode() === "mock") {
    mockChores = [
      { id: 1, text: "Feed chickens", done: false },
      { id: 2, text: "Check water trough", done: false },
    ];
    nextMockId = 3;
    return;
  }

  await query("delete from chores");
  await query(
    "insert into chores (text, done) values ($1, false), ($2, false)",
    ["Feed chickens", "Check water trough"],
  );
}
