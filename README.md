# Farm Chores

Bare-bones PERN to-do list practice project.

## What Is Here

- React frontend
- Express API
- PostgreSQL database
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

### Full Local

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

### No DB

Terminal 1, mock API:

```bash
npm run dev:api:mock
```

Terminal 2, frontend:

```bash
npm run dev
```

The mock API keeps chores in memory for that API process. It is meant for testing logic and aesthetics without local or remote PostgreSQL.

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

## Checks

```bash
npm run build
curl -s http://127.0.0.1:3001/api/health
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
npm run deploy:db:hp2
```

Only update HP1 database config:

```bash
npm run deploy:config:hp1
```

Deploy app code to HP1:

```bash
npm run deploy:hp1
```

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
