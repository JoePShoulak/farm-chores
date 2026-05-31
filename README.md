# Farm Chores

Small PERN chore tracker used to exercise three development/deploy contexts:
no database, full local, and full rack deploy.

## What Is Here

- React frontend
- Express API
- PostgreSQL database
- No-db mock API mode for UI and logic work
- Add, edit, complete, and delete chores
- Rack deploy scripts for HP1 and HP2
- HP4-backed Shoulak styling from `/hp4-assets/shoulak-ui/v1/all.css`

## What Is Not Here

- Auth
- Routing
- Migrations framework
- Docker
- Complex state management

## Env

Use one local `.env` file for both local dev defaults and deploy settings:

```bash
cp .env.example .env
npm run init:env
```

Keep `.env` out of git. It contains the local `DATABASE_URL` and the stable `APP_PASSWORD` used to configure HP2 and HP1.

## Local Development

### No DB

Use this when you want the web app and API running without local or remote
PostgreSQL. The API stores chores in memory until the process exits.

Terminal 1, mock API:

```bash
npm run dev:api:mock
```

Terminal 2, frontend:

```bash
npm run dev
```

The frontend still calls `/api`, so this mode tests the real request/response
flow while skipping database setup entirely.

### Full Local

Use this when you want the web app, API, and a local Postgres database.

Terminal 1, database:

```bash
npm run dev:db
```

Terminal 2, API:

```bash
npm run dev:api
```

Terminal 3, frontend:

```bash
npm run dev
```

Optional seed:

```bash
npm run seed
```

Local PostgreSQL runs on `127.0.0.1:55432` by default. If PostgreSQL is installed but not on your Git Bash path:

```bash
export PATH="/c/Program Files/PostgreSQL/18/bin:$PATH"
```

The local DB helper also checks common Windows PostgreSQL install paths automatically.

### Command Map

No DB:

```bash
npm run dev:api:mock
npm run dev
```

Full local:

```bash
npm run dev:db
npm run dev:api
npm run dev
```

Full deploy:

```bash
npm run deploy:prod
```

DB deploy only:

```bash
npm run deploy:db
```

App deploy only:

```bash
npm run deploy:hp1
```

## Checks

```bash
npm run build
curl -s http://127.0.0.1:3001/api/health
```

Mock health response:

```json
{"ok":true,"database":false,"dataMode":"mock"}
```

Postgres health response:

```json
{"ok":true,"database":true,"dataMode":"postgres"}
```

## Server Structure

- `server/index.js` is the Express API server. It owns middleware, routes, HTTP validation, status codes, and startup. `npm run dev:api:mock` runs this file with `--mock`.
- `server/store.js` is the data access layer called by `index.js`. It decides whether chore operations use in-memory mock data or Postgres.
- `server/db.js` is the low-level Postgres connection pool, query helper, and schema setup.
- `server/logger.js` emits structured JSON logs to stdout and, in deploy, the configured service log file for Hermes/rack tracking.
- `server/seed.js` is a one-shot local helper that resets chores to starter dummy data.

Request flow:

```text
browser -> server/index.js routes -> server/store.js -> mock memory
                                            |
                                            -> server/db.js -> PostgreSQL
```

## Production

- HP1 runs the frontend and API.
- HP2 runs PostgreSQL.
- Hypervisor routes `farm.shoulak.org` to HP1 port `5102`.

Full production deploy:

```bash
npm run deploy:prod
```

First-time HP1 setup:

```bash
npm run bootstrap:hp1
```

Only update HP2 database/user/password:

```bash
npm run deploy:db
```

Only update HP1 database config:

```bash
npm run deploy:config:hp1
```

Deploy app code to HP1:

```bash
npm run deploy:hp1
```

`npm run deploy:hp1` packages and deploys the HP1 app side only. It does not
provision or mutate HP2's database. Use `npm run deploy:prod` when you want the
DB step and app step together.

Production smoke test:

```bash
curl -s https://farm.shoulak.org/api/health
curl -s https://farm.shoulak.org/api/chores
```

Expected empty database response:

```json
{"ok":true,"database":true}
[]
```

## Notes

- Do not regenerate `APP_PASSWORD` unless you intend to rotate credentials.
- HP2 grants DB access only to HP1 when `ufw` is active.
- Deploys are intended to be passwordless after the one-time HP1/HP2 bootstraps:

```bash
npm run deploy:auth-check
```

- If HP2's DB deploy helper ever needs to be refreshed:

```bash
npm run bootstrap:db:hp2
```

- Each future rack app should get its own PostgreSQL database and user.
- Backups are still outside this app and should be handled at the HP2/database level.
