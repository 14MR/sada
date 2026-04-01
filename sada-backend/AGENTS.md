# SADA Backend — Agent Runbook

## Architecture

Express 5 + TypeORM API with Socket.io for real-time chat. Postgres for persistence, Redis for pub/sub.

### Route structure

Routes are mounted at root — **not** under `/api`. Example endpoints:

| Route file | Prefix | Key endpoints |
|-----------|--------|---------------|
| `auth.routes.ts` | `/auth` | `POST /auth/signin` |
| `rooms.routes.ts` | `/rooms` | `POST /rooms`, `GET /rooms` |
| `users.routes.ts` | `/users` | `GET /users/:id` |
| `category.routes.ts` | `/categories` | `GET /categories` |
| `audio.routes.ts` | `/audio` | `POST /audio/sessions/:id/join` |
| `notification.routes.ts` | `/notifications` | `GET /notifications` |
| `follow.routes.ts` | `/follow` | `POST /follow/:userId` |
| `gem.routes.ts` | `/gems` | `POST /gems/send` |
| `admin.routes.ts` | `/admin` | Various admin endpoints |

Production uses an `/api` prefix at the reverse proxy level, not in the backend code.

## Local development setup

### 1. Start dependencies

```bash
cd sada-backend
docker compose up -d
```

This starts:
- **Postgres** on port **5433** (mapped from container 5432)
- **Redis** on port **6380** (mapped from container 6379)

### 2. Environment

Copy `.env.example` to `.env` if it doesn't exist. The committed `.env` has working local-dev values:

| Variable | Dev value | Notes |
|----------|-----------|-------|
| `PORT` | `3001` | Mobile app `.env` expects 3001 |
| `DB_PORT` | `5433` | Matches docker-compose port mapping |
| `JWT_SECRET` | `supersecretdevkey` | Any non-empty string works; falls back to `dev_or_test_only_secret` if unset in non-production |
| `NODE_ENV` | `development` | |
| `CLOUDFLARE_APP_SECRET` | *(empty)* | Audio sessions return stubs when empty — this is fine for local dev |

### 3. Run the server

```bash
npm install     # first time only
npm run dev     # nodemon watches src/, auto-restarts
```

Verify: `curl http://127.0.0.1:3001/` should return `SADA Backend is running 🚀`.

## Running tests

### Unit / E2E tests (Jest, in-memory SQLite)

```bash
npm test              # all tests
npm test -- --watch   # watch mode
npm run test:coverage # with coverage report
```

Tests use an in-memory SQLite database (configured in `tests/setup.ts`), so Docker is **not** needed for `npm test`.

Test setup auto-configures: `JWT_SECRET=test_secret`, `NODE_ENV=test`, `ADMIN_KEY=test_admin_key`.

Coverage thresholds: branches 70%, functions/lines/statements 80%.

### Test files

Tests live in `tests/` with E2E tests in `tests/e2e/`. All test files match `**/*.test.ts`.

### Load tests

```bash
npm run load-test
```

## Key implementation details

### Authentication

- `POST /auth/signin` accepts `{ "identityToken": "<apple-identity-token>" }`
- In non-production, the identity token string is used directly as the `apple_id` (no Apple server verification)
- JWT is issued on successful sign-in; subsequent requests need `Authorization: Bearer <token>`
- Unauthenticated routes: `GET /`, `GET /health`, `POST /auth/signin`

### Audio sessions

- `AudioService.createSession` is called when a room goes live
- When `CLOUDFLARE_APP_SECRET` is empty (default local dev), returns a stub `{ provider: "stub", sessionId: "stub-<roomId>", ... }` instead of calling Cloudflare
- This means room creation works locally without Cloudflare credentials

### Room creation

- `POST /rooms` expects `{ "title": string, "categoryId": string, "description"?: string }`
- The mobile app sends `categoryId` (not `category`) — if you change this field name, update `sada-mobile/src/api/rooms.ts` too

## Common tasks

### Add a new route

1. Create `src/routes/<name>.routes.ts` with an Express Router
2. Create `src/controllers/<name>.controller.ts` for handlers
3. Create `src/validators/<name>.validator.ts` for Zod schemas
4. Register the router in `src/app.ts`
5. Add tests in `tests/e2e/<name>.test.ts`

### Run migrations

```bash
npm run migration:generate -- src/migrations/<MigrationName>
npm run migration:run
npm run migration:revert   # undo last migration
```

### Verify backend is healthy for mobile E2E

The mobile E2E tests (`sada-mobile/.maestro/`) need the backend on port 3001. Quick check:

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/auth/signin -X POST -H 'Content-Type: application/json' -d '{"identityToken":"test"}'
# Should return 200 or 201 (not 404 or 500)
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| **Port 3001 in use** | `lsof -ti:3001 \| xargs kill` then restart |
| **DB connection refused** | `docker compose up -d` — Postgres must be on 5433 |
| **JWT errors in dev** | Set `JWT_SECRET` in `.env` or leave it unset (auto-fallback in non-production) |
| **Room creation 500** | Check `CLOUDFLARE_APP_SECRET` — if empty, stub should kick in. Check backend logs for the real error. |
| **Tests fail with DB errors** | Tests use in-memory SQLite, not Postgres. Check `tests/setup.ts` for env config. |
