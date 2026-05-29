# Farm Chores

Bare-bones React to-do list practice project.

## What is here

- Add chores
- Mark chores done
- Edit chores
- Delete chores
- Small Node/Express API
- PostgreSQL-backed test database
- Shared Shoulak CSS copied into `public/assets/shoulak-ui/v1`

## What is intentionally not here yet

- Authentication
- Routing
- Public `farm.shoulak.org` routing

Deployment target notes: this app is intended for HP1 and will eventually live under the farm subdomain on `shoulak.org`. The HP1/HP2 origin deploy exists; public domain routing is still a later step.

## Local development

```bash
npm install
mkdir -p .postgres-data
npm run dev:db
```

If PostgreSQL is installed but the commands are not on PATH in Git Bash, add
the bin directory for the current terminal:

```bash
export PATH="/c/Program Files/PostgreSQL/18/bin:$PATH"
```

In another terminal:

```bash
npm run seed
npm run dev:api
```

In a third terminal:

```bash
npm run dev
```

The default local database is `farm_chores_dev` on PostgreSQL at `127.0.0.1:55432`.

Run a quick check before deploying:

```bash
npm run build
```

## Production deployment

Production is split across HP hosts:

- HP1 runs the Farm Chores frontend and backend.
- HP2 runs PostgreSQL for shared project databases.
- Farm Chores uses the `farm_chores` database and `farm_chores_app` PostgreSQL user.

First-time full deployment:

```bash
APP_PASSWORD="$(openssl rand -base64 32)"

printf 'APP_PASSWORD=%s\n' "$APP_PASSWORD"

APP_PASSWORD="$APP_PASSWORD" npm run deploy:prod
```

Save those passwords somewhere private. The app password is used by HP1 to connect
to PostgreSQL on HP2.

If HP2 PostgreSQL is already configured and you are only changing app code:

```bash
APP_PASSWORD="saved app password" npm run deploy:hp1
```

If HP1 is already configured and you only need to redeploy code:

```bash
npm run deploy:hp1
```

If you only need to update HP1's production database config:

```bash
APP_PASSWORD="saved app password" npm run deploy:config:hp1
```

If HP1 needs first-time system setup:

```bash
APP_PASSWORD="saved app password" npm run bootstrap:hp1
```

If only the HP2 database needs setup:

```bash
APP_PASSWORD="saved app password" npm run deploy:db:hp2
```

To build the HP1 deploy archive without sending it:

```bash
npm run package:hp1
```

Use `.env.hp2.example` as the backend environment shape when manually inspecting
the production configuration.

Gotchas before treating HP2 as real infrastructure:

- Backups are not configured yet.
- PostgreSQL is opened only to HP1 by the setup script when `ufw` is active.
- Each future project should get its own database and PostgreSQL user.
- Do not reuse the local `farm_chores_dev` database name in production.
- Keep PostgreSQL credentials in server environment files, not in Hypervisor.
- Do not rerun HP2 setup with random new passwords unless you intend to rotate
  credentials and update HP1 to match.
