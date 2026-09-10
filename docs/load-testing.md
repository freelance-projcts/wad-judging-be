# Load Testing

The WAD Judging System is a Next.js app backed by PostgreSQL via Prisma. This
document describes how to load-test it for at least 500 concurrent users, and
what to watch for.

## Tooling

We use [k6](https://k6.io/) — the scenario script lives at
[`load-testing/k6-scenario.js`](../load-testing/k6-scenario.js).

Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/

## Scenario

The script models the realistic traffic mix during a live competition, not
just raw request throughput:

1. **Sign in** (`POST /api/auth/login`) — bcrypt hashing is intentionally
   CPU-bound, so this is usually the first bottleneck under load. Watch CPU
   on the app container specifically during this phase.
2. **Session check** (`GET /api/auth/me`) — runs on every protected page
   load; cheap, but high-frequency.
3. **Student search/filter** (`GET /api/students?...`) — the most common
   judge-side read, backed by indexed `gender`/`province`/`team` columns.
4. **Results polling** (`GET /api/results?...view=top8`) — aggregates mark
   entries in-memory per request; this is the most DB- and CPU-intensive
   read path and the one most likely to need caching if it becomes a
   bottleneck at higher concurrency.

Traffic ramps from 0 → 500 virtual users over 3 minutes, holds at 500 for 3
minutes, then ramps down — see `options.scenarios` in the script.

## Running it

```bash
# against a local dev/production build
k6 run -e BASE_URL=http://localhost:3000 \
       -e JUDGE_EMAIL=judge@wadjudging.test \
       -e JUDGE_PASSWORD=Judge@12345 \
       load-testing/k6-scenario.js
```

Run this against a build that mirrors production (`npm run build && npm
start`, or the Docker image) — `next dev` is not representative of
production performance.

## Thresholds

The script fails the run if:

- HTTP error rate exceeds 1% (`http_req_failed`)
- p95 latency exceeds 800ms or p99 exceeds 2s (`http_req_duration`)

Adjust these to match your infrastructure's SLA before using the script as a
release gate.

## Database considerations at 500 concurrent users

- **Connection pool**: Prisma's default connection pool is small. Set
  `connection_limit` on `DATABASE_URL` (e.g. `?connection_limit=20`) sized to
  your Postgres `max_connections`, and prefer a pooler (PgBouncer, or a
  managed pooled connection string) in front of Postgres for serverless/edge
  deployments where connections churn per invocation.
- **Indexes**: `students(gender)`, `students(province)`, `students(team)`,
  `mark_entries(performanceId)`, and `mark_entries(eventId)` are indexed in
  `prisma/schema.prisma` to keep the hot filter/aggregation queries fast.
- **Results aggregation**: `getTeamPerformance`, `getTopN`, and
  `getAllRounders` (`src/lib/results.ts`) currently aggregate in application
  code after fetching mark entries. This is simple and correct at
  competition-sized data volumes (hundreds of students, thousands of mark
  entries), but if a deployment grows much larger, push the aggregation into
  SQL (`GROUP BY` + `MAX`) instead of fetching rows into Node.

## Scaling the app tier

The app is stateless (session is a signed JWT cookie, no server-side session
store), so horizontal scaling behind a load balancer works without sticky
sessions. For 500 concurrent users, 2-3 small app instances in front of one
appropriately-sized Postgres instance is a reasonable starting point — tune
based on what the k6 run shows.
