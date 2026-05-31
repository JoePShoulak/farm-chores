import { ensureSchema, query } from "./db.js";

const dataMode = process.env.FARM_CHORES_DATA_MODE || "postgres";

let mockChores = [
  { id: 1, text: "Feed chickens", done: false },
  { id: 2, text: "Check water trough", done: false },
  { id: 3, text: "Walk the fence line", done: true },
];
let nextMockId = 4;

function formatChore(chore) {
  return {
    id: chore.id.toString(),
    text: chore.text,
    done: Boolean(chore.done),
  };
}

export function storeMode() {
  return dataMode;
}

export function usesDatabase() {
  return dataMode !== "mock";
}

export async function ensureStore() {
  if (dataMode === "mock") {
    return;
  }

  await ensureSchema();
}

export async function listChores() {
  if (dataMode === "mock") {
    return mockChores.map(formatChore);
  }

  const result = await query(
    "select id, text, done from chores order by created_at asc, id asc",
  );

  return result.rows.map(formatChore);
}

export async function createChore(text) {
  if (dataMode === "mock") {
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

export async function updateChore(id, updates) {
  if (dataMode === "mock") {
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

export async function deleteChore(id) {
  if (dataMode === "mock") {
    mockChores = mockChores.filter((chore) => chore.id !== id);
    return;
  }

  await query("delete from chores where id = $1", [id]);
}

export async function resetSeedChores() {
  if (dataMode === "mock") {
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
