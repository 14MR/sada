# SADA Backend — Code Review Report

**Date:** 2026-04-01 | **Reviewer:** Automated Senior Review | **Score: 5.5/10**

---

## Findings

### P0 — Critical

| # | Category | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | Secret Leak | `src/config/env.ts:17-19` | Hardcoded Cloudflare API tokens/app secrets as defaults. Anyone reading source gets production credentials. | Remove all hardcoded defaults. Fail startup if `CLOUDFLARE_*` env vars are missing in production. |
| 2 | Auth Bypass | `src/middleware/auth.ts:13-21` | Auth middleware skips based on `req.path` string matching — path is the raw Express path BEFORE `/api` mount, so `/api/admin/users` is never matched but neither are other sensitive endpoints correctly. The `endsWith("/auth/signin")` check could match unintended paths like `/fake/auth/signin`. | Use route-level middleware instead of global path-matching. At minimum, match exact paths with startsWith from a configured prefix. |
| 3 | IDOR | `src/controllers/gem.controller.ts:34-35,44-45` | `getBalance` and `getHistory` use `req.params.userId` — any authenticated user can query any other user's gem balance and full transaction history. | Validate `req.params.userId === req.user.id` or add explicit admin-only access. |
| 4 | Mass Assignment | `src/services/user.service.ts:12-16` | `updateProfile` uses `Object.assign(user, updates)` — any field including `gem_balance`, `banned`, `verified`, `is_creator` can be overwritten via API. | Whitelist allowed update fields (same pattern used in `profile.service.ts:71`). |
| 5 | IDOR | `src/routes/users.routes.ts:42-43` | `PUT /:id` and `DELETE /:id` have no ownership check — any authenticated user can update/delete any other user's account. | Add middleware/controller check that `req.params.id === req.user.id`. |

---

### P1 — High

| # | Category | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 6 | Admin Auth | `src/middleware/admin.ts:4-8` | Admin auth is a single static `x-admin-key` header — no per-request nonce, no rate limiting specific to admin, no audit trail of which admin performed action. | Use proper admin user accounts with JWT, RBAC, and action logging. |
| 7 | Race Condition | `src/services/room.service.ts:120-152` | `joinRoom` has a TOCTOU race: concurrent joins both pass the duplicate check, both create participants, and both increment `listener_count`. | Wrap in a DB transaction with `SELECT ... FOR UPDATE` or use a unique constraint on `(room_id, user_id)`. |
| 8 | Payment Stub | `src/services/gem.service.ts:18-28` | `purchaseGems` throws in production ("not yet configured") but the `gift` path works — users can gift without ever having purchased. The in-memory receipt store (`processedReceipts` Map) is lost on restart, allowing replay. | Implement actual Apple/Google verification before launch. Use DB-backed idempotency store. |
| 9 | XSS | `src/services/chat.service.ts:75-83` | WebSocket `send_message` broadcasts raw `message` content to all room participants with no sanitization or length limit. | Sanitize messages server-side, enforce max length, and consider storing messages for moderation. |
| 10 | N+1 Query | `src/services/conversation.service.ts:160-196` | `listConversations` makes 2 extra DB queries per conversation (last message + unread count) — O(n) queries for n conversations. | Use a single windowed query or subquery to fetch last messages and unread counts in bulk. |
| 11 | Memory Leak | `src/services/gem.service.ts:14` | `processedReceipts` Map grows unboundedly — never evicted. In a long-running server this will OOM. | Add TTL-based eviction or cap size with LRU. Better: use Redis or DB table. |
| 12 | Missing Authorization | `src/routes/users.routes.ts:42` | `PUT /:id` → `UserController.updateProfile` allows any user to overwrite any other user's profile. No ownership verification. | Verify `req.user.id === req.params.id` before processing. |

---

### P2 — Medium

| # | Category | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 13 | SQL Pattern | `src/services/room.service.ts:104` | `LIKE '%"tag"%'` pattern on JSON array column — unreliable and slow. Cannot use indexes. | Use PostgreSQL `@>` containment operator with GIN index on the `tags` column. |
| 14 | Unbounded Query | `src/services/room.service.ts:89-95` | `searchRooms` has no pagination (limit/offset). Returns all matching rooms. | Add pagination parameters with sensible defaults. |
| 15 | Transaction Integrity | `src/services/room.service.ts:24-47` | `createRoom` does 3 separate saves (room, audio, participant) outside a transaction. If participant save fails, room exists without a host. | Wrap in a single DB transaction. |
| 16 | CORS Default | `src/app.ts:27` | When `CORS_ORIGINS` is unset or `*`, `cors({})` allows all origins with credentials. This is dangerous in production. | Explicitly disallow wildcard with credentials. Set `credentials: false` when using wildcard, or require explicit origins in production. |
| 17 | No Request Size Limit | `src/app.ts:51` | `express.json()` without a size limit — a malicious client can send multi-GB JSON payloads. | Add `{ limit: '1mb' }` or similar. |
| 18 | Username Collision | `src/services/auth.service.ts:43` | Username is `user_${Date.now()}` — two signups in the same millisecond get duplicate usernames, violating the unique constraint. | Use UUID or retry with a counter. |
| 19 | Sensitive Data Exposure | `src/services/user.service.ts:7-8` | `getProfile` returns the full User entity including `apple_id`, `gem_balance`, and internal flags. | Return only public fields (same pattern as `profile.service.ts:getPublicProfile`). |
| 20 | Missing Indexes | `src/models/Message.ts` | No composite index on `(conversationId, created_at)` — messages queries will be slow at scale. | Add `@Index()` on the combination used for ordering. |
| 21 | Type Safety | `src/middleware/auth.ts:31` | `(req as any).user` — no TypeScript augmentation for Express Request. | Extend `Express.Request` interface globally for type safety. |
| 22 | Error Info Leak | Multiple controllers | `res.status(400).json({ error: error.message })` exposes internal error messages (DB errors, stack info) to clients. | Use generic error messages for clients; log detailed errors server-side only. |

---

### P3 — Low / Style

| # | Category | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 23 | No Graceful Shutdown | `src/index.ts:26-28` | Server starts listening but there's no SIGTERM/SIGINT handler to drain connections. | Add `process.on('SIGTERM', ...)` with graceful shutdown. |
| 24 | Sync in Prod | `src/config/database.ts:33` | `synchronize: !isProd` — fine for dev but risky if `NODE_ENV` is accidentally unset. | Add an explicit warning log when sync is enabled. |
| 25 | No Pagination Cap | Multiple services | `limit` parameter accepted from user input without upper bound — a client can request `limit=999999`. | Cap all `limit` values (e.g., max 100). |
| 26 | Duplicated Logic | `room.service.ts:54-67,338-351` | Follower notification logic is copy-pasted across `createRoom`, `scheduleRoom`, and `startScheduledRoom`. | Extract into a shared `notifyFollowers()` helper. |
| 27 | Missing Tests | `tests/` | Only `gems.test.ts` and `e2e/` exist — no unit tests for services, no integration tests for auth/conversations/rooms. | Add test coverage for all critical service paths. |
| 28 | `@types` in deps | `package.json` | `@types/cors`, `@types/jsonwebtoken` are in `dependencies` instead of `devDependencies`. | Move type packages to `devDependencies`. |

---

## Top 5 Improvements

1. **Fix IDOR vulnerabilities** — Add ownership checks to all user-scoped endpoints (`PUT /:id`, `DELETE /:id`, gem balance/history). This is the single highest-impact security fix.

2. **Remove hardcoded secrets** — The Cloudflare API tokens in `env.ts` defaults are a credential leak. Fail fast on missing env vars in production.

3. **Wrap critical operations in transactions** — Room creation, gem purchases, and withdrawals should be fully transactional to prevent partial state.

4. **Add pagination limits and query optimization** — Cap `limit` params, add DB indexes on query-critical columns, and fix the N+1 in `listConversations`.

5. **Strengthen admin authentication** — Replace static key auth with proper admin JWT + RBAC, and add action audit logging.

---

## Summary

SADA is a well-structured Express + TypeORM backend with good foundations: Zod validation, rate limiting, JWT auth, socket.io real-time, and clear service/controller separation. However, it has critical IDOR vulnerabilities allowing any authenticated user to access/modify other users' data, hardcoded API secrets in source code, missing transaction safety on financial operations, and several query performance issues that will degrade at scale. The codebase would benefit from an authorization middleware layer, env-var hardening, and expanded test coverage before production deployment.
