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

## Environment variables reference

See [`.env.example`](../.env.example) for the full list with inline
descriptions.
