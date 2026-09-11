# Deployment

## Docker (self-hosted / any VM or container platform)

```bash
docker compose up --build
```

- `db`: PostgreSQL 17, data persisted in the `wad_pgdata` volume.
- `app`: built from the multi-stage `Dockerfile` (Next.js `output: "standalone"`), serving on port 3000. Uploaded photos are persisted in the `wad_uploads` volume when using the local storage driver (see below) — for a multi-instance deployment, switch to the S3 driver instead so instances don't diverge.

Before first use, run migrations and seed against the containerized database:

```bash
DATABASE_URL=postgresql://wad_user:wad_password@localhost:5432/wad_judging?schema=public npx prisma migrate deploy
DATABASE_URL=postgresql://wad_user:wad_password@localhost:5432/wad_judging?schema=public npm run db:seed
```

Set a real `JWT_SECRET` via the environment before running in anything other
than local dev:

```bash
JWT_SECRET=$(openssl rand -hex 48) docker compose up --build
```

## Netlify / serverless

The app has no local-filesystem dependency for business data (see the
"Deploying without a persistent filesystem" section in the main README) —
the only requirement is:

1. `STORAGE_DRIVER=s3` + `S3_*` env vars pointing at an S3-compatible bucket.
2. `DATABASE_URL` pointing at a reachable, pooled Postgres instance (Neon,
   Supabase, RDS Proxy, PgBouncer in front of any Postgres, etc.) - serverless
   invocations open/close connections far more often than a long-running
   server, so a connection pooler matters more here than in the Docker
   deployment.
3. `JWT_SECRET` set as a platform secret.

Deploy via Netlify's Next.js runtime (`@netlify/plugin-nextjs`, auto-detected
for a standard Next.js App Router project) or any platform with first-class
Next.js support (Vercel, Cloudflare, Railway, Render, etc.) — the app doesn't
use any Node APIs incompatible with those runtimes.

Run `npx prisma migrate deploy` against the target database as part of your
deploy pipeline (not `migrate dev`, which is interactive/dev-only).

## Netlify: complete walkthrough from scratch

This section assumes nothing is set up yet — a fresh GitHub repo, a fresh
production database, and a fresh Netlify site.

### Step 1 — Get the code onto GitHub

1. Create a new empty repository on [github.com/new](https://github.com/new)
   (do **not** initialize it with a README/`.gitignore` — this project
   already has its own).
2. From the project directory, point your local repo at it and push:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git branch -M main
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```
   If the project is already connected to a remote (`git remote -v` shows
   one), just commit your pending changes and push:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```
3. Double-check `.env` was never committed — it's covered by `.gitignore`,
   but confirm with `git log --all --full-history -- .env` (should print
   nothing). Never push real secrets to GitHub.

### Step 2 — Create the production database

Pick **one** of these. Either way, you end up needing **two** connection
strings for the same database: a **pooled** one (for the running app) and a
**direct/unpooled** one (for running migrations) — Neon's pooler doesn't
support the schema-locking operations Prisma Migrate needs, so migrations
must bypass it. `prisma/schema.prisma` already has both wired up:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled - used by the running app
  directUrl = env("DIRECT_URL")     // unpooled - used only by Prisma CLI (migrate/db push)
}
```

**Option A — Netlify DB (simplest, stays inside the Netlify dashboard)**

Netlify's built-in "Netlify DB" (powered by Neon) provisions a Postgres
database in the background and wires `DATABASE_URL` into your site's
environment automatically — no separate Neon signup needed to get started.

1. In your Netlify site → **Extensions** → find **Neon** ("Netlify DB") →
   install/enable it, or run `netlify db init` via the Netlify CLI from the
   project directory.
2. This provisions an **anonymous** Neon database under the hood and sets
   `DATABASE_URL` in your site's environment variables for you — that
   matches what `prisma/schema.prisma` expects, no renaming needed.
3. **Claim the database** — an anonymous Netlify DB is meant to be
   temporary/trial. Click **"Connect Neon"** (shown in the Netlify DB panel
   on your site, or in the CLI output) to link it to a real Neon account you
   control. This is what makes it a permanent production database and gives
   you a normal Neon console to view/manage it in (see "Finding and viewing
   the database" below).
4. Once claimed, get the **direct/unpooled** connection string too (see
   Option B, step 4) from the now-linked Neon project, and add it as
   `DIRECT_URL` in Netlify's environment variables — Netlify DB only sets
   the pooled `DATABASE_URL` for you automatically.

**Option B — Standalone Neon account (more control, works with any host)**

1. Sign up at [neon.tech](https://neon.tech) (GitHub login works).
2. **Create a project** → pick a region close to your users → Postgres
   version 16/17. Neon creates a default database (often named after the
   project or `neondb`) and a default role automatically.
3. On the **Project Dashboard**, click **Connect** — this opens the
   "Connect to your database" modal where you pick a branch, compute, and
   role, and it shows the connection string for that combination.
4. Copy **two** strings from that modal:
   - The **pooled** connection string (host contains `-pooler`) → this is
     your `DATABASE_URL`. Append Prisma's own pool sizing so a single
     serverless function instance never opens more than one connection
     against the already-pooled endpoint:
     ```
     postgresql://<user>:<password>@<project>-pooler.<region>.aws.neon.tech/<dbname>?sslmode=require&connection_limit=1&pool_timeout=10
     ```
   - The **direct/unpooled** connection string (no `-pooler` in the host) →
     this is your `DIRECT_URL`, used only for running migrations:
     ```
     postgresql://<user>:<password>@<project>.<region>.aws.neon.tech/<dbname>?sslmode=require
     ```

(Supabase works the same way — create a project, then copy the **Supavisor
pooled** connection string from Project Settings → Database, on port `6543`,
as `DATABASE_URL`, and the direct connection on port `5432` as `DIRECT_URL`.)

### Finding and viewing the database

Once claimed (Option A) or created directly (Option B), the database is a
normal Neon project — manage/inspect it at
[console.neon.tech](https://console.neon.tech):

- **Tables/data**: Project → **Tables** in the left nav gives a
  spreadsheet-like browser, or **SQL Editor** for running raw queries.
- **Connection strings**: Project Dashboard → **Connect** button reopens the
  modal with both the pooled and direct strings any time you need them
  again.
- **From a desktop client** (DataGrip, TablePlus, etc.): use the direct
  connection's host/port/user/password/database — same as connecting to any
  Postgres server, just remote instead of `localhost`.
- Netlify's own site dashboard also has a **Database**/**Neon** panel
  (under Extensions once installed) with a shortcut link into that same
  Neon project.

### Step 3 — Run migrations against the production database

Do this once, from your own machine, before the app is live (or re-run it
after any future migration is added). Pass **both** URLs — `DATABASE_URL`
isn't used by the migrate command itself, but Prisma still reads the full
schema, and some commands double-check it:

```bash
DATABASE_URL="<pooled URL from Step 2>" \
DIRECT_URL="<direct/unpooled URL from Step 2>" \
npx prisma migrate deploy
```

Optionally seed initial demo/admin data the same way:

```bash
DATABASE_URL="<pooled URL from Step 2>" \
DIRECT_URL="<direct/unpooled URL from Step 2>" \
npm run db:seed
```

`migrate deploy` (not `migrate dev`) applies existing migrations
non-interactively and is safe to run against a live database — it never
prompts for a migration name or generates new migrations.

### Step 4 — File storage (deferred — S3 not set up yet)

Netlify Functions run on a read-only filesystem outside `/tmp`, so with
`STORAGE_DRIVER=local` (the default), an upload request (student photo,
profile avatar) will fail with a clean error response as soon as it tries to
write to disk — it doesn't just "fail to persist," it fails immediately, on
every attempt. Everything else in the app (auth, students, events, teams,
marks, rounds, edit requests, notifications, results) is unaffected, since
none of it touches the storage driver.

This is an accepted, deliberate gap for now: deploy without S3, and treat
photo upload as a known-broken feature until it's configured. When ready to
enable it, come back to this step:

1. Create a bucket on any S3-compatible provider — Cloudflare R2 has a
   generous free tier and is a common pick for small apps:
   - Cloudflare dashboard → **R2** → **Create bucket**.
   - **Manage R2 API Tokens** → create a token with read/write access →
     note the **Access Key ID** and **Secret Access Key**.
   - The endpoint is `https://<account-id>.r2.cloudflarestorage.com`.
   - Turn on **Public access** for the bucket (or put a Cloudflare custom
     domain in front of it) so uploaded photos are viewable, and use that
     public URL as `S3_PUBLIC_BASE_URL`.
2. Note down: bucket name, region (R2 uses `auto`), access key, secret key,
   endpoint, and public base URL — these map directly to the `S3_*`
   variables in `.env.example`.
3. Set `STORAGE_DRIVER=s3` plus the `S3_*` variables in Netlify's
   environment variables (Step 6) and redeploy.

### Step 5 — Create the Netlify site and connect GitHub

1. Log into [app.netlify.com](https://app.netlify.com) → **Add new site** →
   **Import an existing project**.
2. Choose **GitHub**, authorize Netlify's GitHub app if prompted, and select
   the repository you pushed in Step 1.
3. Netlify reads `netlify.toml` in this repo and auto-configures the build
   command (`npm run build`) and the `@netlify/plugin-nextjs` runtime — you
   shouldn't need to change the build settings screen.
4. Don't click "Deploy" yet — set the environment variables first (next
   step), otherwise the first build will fail on a missing `DATABASE_URL`.

### Step 6 — Set environment variables

Site settings → **Environment variables** → add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | the **pooled** connection string from Step 2 (Netlify DB sets this for you automatically if you used Option A) |
| `DIRECT_URL` | the **direct/unpooled** connection string from Step 2. Not read by the running app at all — only relevant if you later add a CI step that runs `prisma migrate deploy` from within Netlify's build. Safe to add now for reference, or skip and just pass it inline (Step 3) whenever you run migrations from your own machine |
| `JWT_SECRET` | a real random value: `openssl rand -hex 48` |
| `JWT_EXPIRES_IN` | `7d` |
| `STORAGE_DRIVER` | `local` (default — omit this var entirely, or set it explicitly; see Step 4 caveat about uploads not working until S3 is added) |
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_URL` | leave blank for now — Netlify assigns a URL on first deploy; come back and set this to that URL (e.g. `https://your-site-name.netlify.app`), then redeploy |

`S3_*` variables are not needed yet — add them (and flip `STORAGE_DRIVER` to
`s3`) once you complete Step 4.

Never reuse the dev `JWT_SECRET` from `.env.example` in production.

### Step 7 — Deploy and verify

1. Trigger the deploy (Site overview → **Trigger deploy**, or it runs
   automatically after you save env vars if the first deploy hasn't
   happened yet).
2. Once live, smoke-test on the real URL: register a judge, log in as the
   seeded admin, create a student, enter marks, view results, upload a
   photo (confirms the S3 wiring), and check `/api-docs` loads.
3. Every subsequent `git push` to `main` triggers a new Netlify deploy
   automatically — there's no separate "redeploy" step to remember for
   future code changes.

### Step 8 — Troubleshooting `output: "standalone"`

`next.config.ts` sets `output: "standalone"` for the Docker build.
Netlify's Next.js runtime normally handles this fine, but if the Netlify
build errors on packaging, remove that line (Netlify traces its own
serverless bundle regardless) — it isn't needed outside the Docker path.

## Why the database is the bottleneck at 500 concurrent users on Netlify

Netlify deploys API routes as serverless functions (AWS Lambda under the
hood), not as one long-running Node process. That changes the concurrency
story from the Docker deployment:

- **App tier**: Netlify auto-scales functions horizontally, so 500 concurrent
  requests generally aren't an app-tier capacity problem the way they would
  be for a fixed number of Docker containers. (Check your Netlify plan's
  concurrent-execution limit, though — the free tier caps this well below
  500 and *will* throttle/queue requests past that ceiling.)
- **Database tier**: this is the real risk. Each function invocation can open
  its own Postgres connection. With no pooling, 500 concurrent invocations
  can attempt ~500 simultaneous raw connections against a database whose
  default `max_connections` is often 100 — instant connection exhaustion and
  cascading 500s, even though the app code itself is correct.

Mitigations, in order of how much they matter:

1. **Use a provider with a real pooler in front of Postgres** (Neon/Supabase
   as above, or self-managed PgBouncer in front of RDS/Cloud SQL). Point
   `DATABASE_URL` at the pooled endpoint, not the direct one.
2. **Set a low `connection_limit` on the Prisma connection string** (e.g.
   `connection_limit=1`) when targeting a pooled endpoint from serverless
   functions — each function instance should hold at most one connection and
   let the external pooler multiplex across the fleet, rather than each
   instance running its own small Prisma pool on top of an already-pooled
   endpoint.
3. **Consider [Prisma Accelerate](https://www.prisma.io/accelerate)** if
   connection exhaustion still shows up under the k6 run — it's built
   specifically for this Prisma-on-serverless problem and adds an edge cache
   in front of reads like `/api/results`.
4. **Validate with the existing k6 scenario against the live Netlify URL**,
   not just against a local Docker build — see
   [`load-testing.md`](load-testing.md). Serverless cold starts and the
   pooler's own connection ceiling behave differently from a warm local
   server, so this is the only way to actually confirm 500-concurrent-user
   readiness rather than assume it.

If the pooled-Postgres + Accelerate combination still can't comfortably clear
500 concurrent users in the k6 run, the architecture is intentionally kept
portable enough (see `docs/deployment.md`'s Docker section) to move the
backend to a standalone Node server / Cloud Run / ECS without rewriting
business logic — that trades Netlify's zero-ops serverless model for a
long-running process with its own internal Prisma connection pool, which
sidesteps the per-invocation connection problem entirely.

## Environment variables reference

See [`.env.example`](../.env.example) for the full list with inline
descriptions.
