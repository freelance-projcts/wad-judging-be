# WAD Judging System

A role-based web application for managing students, events, teams, and marks
for a judged performance competition, with results and a mark-edit approval
workflow.

Built as a modular monolith: Next.js App Router (frontend + API routes),
Prisma/PostgreSQL, and cookie-based session auth — all in one deployable unit.

## Tech stack

- **Frontend**: Next.js 15+ (App Router), TypeScript, React, Tailwind CSS, shadcn/ui, Lucide icons, React Hook Form + Zod
- **Backend**: Next.js Route Handlers (`src/app/api/**`)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: bcrypt-hashed passwords, JWT session in an HTTP-only secure cookie, role-based access control enforced server-side
- **File storage**: pluggable storage service — local disk in dev, S3-compatible object storage in production (`src/lib/storage.ts`)
- **Testing**: Vitest (unit + integration)
- **Docs**: OpenAPI 3 spec + Swagger UI at `/api-docs`

## Roles

- **Admin**: manages students, events, teams (A/B), judge-to-performance access, approves/rejects mark-edit requests, views results and downloads them.
- **Judge**: only sees the performances they've been explicitly granted access to (`JudgeAssignment`). All performance-scoped API routes re-check this server-side — a judge assigned only to "Performance 1" gets a 403 from every "Performance 2" endpoint, regardless of what the UI shows.

## Getting started (local development)

### 1. Database

Either run Postgres via Docker:

```bash
docker compose up -d db
```

...or point `DATABASE_URL` in `.env` at any Postgres instance you already have running. Copy `.env.example` to `.env` and fill in the values (`.env` is already gitignored).

### 2. Install dependencies

```bash
npm install
```

### 3. Run migrations and seed data

```bash
npm run db:migrate
npm run db:seed
```

The seed creates only the minimum needed to sign in and start managing the
competition from a clean slate:

- Admin: `admin@wadjudging.test` / `Admin@12345`
- Performances: "Performance 1", "Performance 2"

Judges, events, students, teams, and marks are all created through the app
itself (or the API) from there - nothing else is pre-populated.

### 4. Run the app

```bash
npm run dev
```

Open http://localhost:3000.

## Scoring model

Marks entry captures a **D** (difficulty) score, four **E** (execution)
scores from a panel of judges, and a **P** (penalty) deduction, matching the
standard artistic-gymnastics Code of Points:

```
E_trimmed = average of the middle two of the four E scores (drop high & low)
Final     = D + (10 - E_trimmed) - P
```

See `src/lib/scoring.ts`. Multiple rounds can be recorded per
student/event/performance (e.g. multiple vault attempts); results use the
best round per student for rankings.

## Mark-edit authorization

- A judge can freely enter marks for a new round.
- Editing an **already-submitted** round requires an admin-approved edit
  request (`EditRequest`). The approval is single-use — consumed the moment
  it's applied — so a judge must request access again for any further edit.
- Admins can always edit directly.

This is enforced in `POST /api/marks` (`src/app/api/marks/route.ts`), not
just hidden in the UI.

## API documentation

Swagger UI is served at `/api-docs` (raw spec at `/openapi/openapi.yaml`).

## Testing

```bash
npm test              # unit tests (no DB required)
npm run test:integration  # integration tests - spins up a real dev server,
                           # requires a running, migrated & seeded database
npm run test:all
```

Integration tests use the seeded admin account and register throwaway judge
accounts per test run.

## Load testing

See [`docs/load-testing.md`](docs/load-testing.md) and
[`load-testing/k6-scenario.js`](load-testing/k6-scenario.js) for a k6 scenario
targeting 500 concurrent users.

## Docker

```bash
docker compose up --build
```

This starts Postgres and the app (built via the multi-stage `Dockerfile`,
Next.js `output: "standalone"`). Run migrations/seed against the containerized
DB the same way as above, pointing `DATABASE_URL` at `localhost:5432` (the
compose file publishes it).

## Deploying without a persistent filesystem (Netlify / serverless)

The app doesn't rely on local filesystem state for business data — all data
is in Postgres. The one filesystem dependency is the **local** storage
driver for uploaded photos, which is dev-only:

- Set `STORAGE_DRIVER=s3` and the `S3_*` env vars (see `.env.example`) to use
  any S3-compatible bucket (AWS S3, Cloudflare R2, Backblaze B2, etc.) in
  production — see `src/lib/storage.ts`.
- Point `DATABASE_URL` at a managed/pooled Postgres instance (see
  `docs/load-testing.md` for connection-pool sizing notes at higher
  concurrency).
- Set a strong random `JWT_SECRET`.

With those two things done, the app has no local-disk dependency and can run
on Netlify's Next.js runtime or any other serverless/container platform.

## Project structure

```
prisma/            Prisma schema + seed script
src/app/            Pages (App Router) + API routes (src/app/api/**)
src/components/     UI components (shadcn/ui primitives + feature components)
src/lib/            Auth, Prisma client, scoring, results aggregation, storage, validators
tests/unit/         Fast, DB-free unit tests
tests/integration/  End-to-end API tests against a real (seeded) database
load-testing/       k6 scenario
docs/               Additional documentation
public/openapi/     OpenAPI 3 spec
```
