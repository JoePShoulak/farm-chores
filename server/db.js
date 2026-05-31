import pg from "pg";

// Connection setup
//
// Local development defaults to the Postgres instance started by
// `npm run dev:db`. Production supplies DATABASE_URL through the deployed env.
const connectionString =
  process.env.DATABASE_URL ||
  "postgres://farm_chores_dev:farm_chores_dev@127.0.0.1:55432/farm_chores_dev";

const pool = new pg.Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
});

// Runs one SQL statement through the shared connection pool.
export function query(text, params) {
  return pool.query(text, params);
}

// Creates the minimal schema this app needs. This is intentionally tiny until
// the app needs a real migrations framework.
export async function ensureSchema() {
  await query(`
    create table if not exists chores (
      id bigserial primary key,
      text text not null,
      done boolean not null default false,
      created_at timestamptz not null default now()
    )
  `);
}

// Closes the pool for one-shot scripts like `npm run seed`.
export async function closeDb() {
  await pool.end();
}
