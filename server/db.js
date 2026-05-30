import pg from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://farm_chores_dev:farm_chores_dev@127.0.0.1:55432/farm_chores_dev";

const pool = new pg.Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
});

export function query(text, params) {
  return pool.query(text, params);
}

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

export async function closeDb() {
  await pool.end();
}
