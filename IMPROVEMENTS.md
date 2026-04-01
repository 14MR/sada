# sada - Improvements

_Analyzed: 2026-04-01 (Cycle 8 — Deep Review)_

## 🔴 Critical (Fix Before ANY Deployment)

### Authentication & Security
- [ ] **No JWT verification middleware** - `sada-backend/src/index.ts:20-24`
  - Routes accept requests without token validation
  - Missing authentication middleware on all routes

- [ ] **Hardcoded JWT secret fallback** - `sada-backend/src/services/auth.service.ts:59`
  - `process.env.JWT_SECRET || "default_secret"` compromises all tokens

- [ ] **Apple Sign-In verification disabled** - `sada-backend/src/services/auth.service.ts:24-36`
  - Commented out real verification, uses mock

- [ ] **Mock auth in mobile client** - `sada-mobile/src/screens/LoginScreen.tsx:14-19`
  - Generates fake identity tokens, no real Apple Sign-In

- [ ] **No payment verification** - `sada-backend/src/controllers/gem.controller.ts:7-9`
  - Accepts any purchase, allows unlimited free gems

- [ ] **CORS wide open** - `sada-backend/src/services/chat.service.ts:10-13`
  - `origin: "*"` allows connections from any domain

- [ ] **Exposed CloudFlare credentials** - `sada-backend/src/config/env.ts:14-20`
  - Hardcoded API tokens and TURN keys in source

### Data Integrity
- [ ] **Race condition in gem transactions** - `sada-backend/src/services/gem.service.ts:35-73`
  - Balance check/update not atomic, TOCTOU vulnerability

### Crash Bugs (NEW — Cycle 8)
- [ ] **`startScheduledRoom` crashes at runtime** - `room.service.ts:322`
  - References undefined `tags` variable — `room.tags = (tags || []).map(...)` throws `ReferenceError`
  - Method has no `tags` parameter
- [ ] **4 endpoints unreachable** — `searchByTag`, `getSummary`, `bookmark`, `removeBookmark` implemented in controller but **not wired in routes**
- [ ] **`searchByTagSchema` not imported** in `rooms.routes.ts:5` — even if route were added, validation would be skipped

## 🟡 High Priority

### Auth & Authorization
- [ ] **No authorization checks** - `sada-backend/src/controllers/rooms.controller.ts:84-97`
  - Non-hosts can manipulate speaker roles

- [ ] **User ID from request body** - `sada-backend/src/controllers/rooms.controller.ts:11,60`
  - Should extract from JWT, allows impersonation

- [ ] **No rate limiting** - `sada-backend/src/index.ts:17`
  - Vulnerable to DoS attacks

### Payments
- [ ] **No idempotency keys** - `sada-backend/src/services/gem.service.ts:11-27`
  - Duplicate purchases create duplicate transactions

- [ ] **No payment provider integration** - `sada-backend/src/controllers/gem.controller.ts:5-14`
  - No Stripe, Apple IAP, or Google Play billing

- [ ] **No audit trail** - `sada-backend/src/models/GemTransaction.ts`
  - Cannot trace payment disputes

### API Security
- [ ] **No input sanitization** - `sada-backend/src/controllers/rooms.controller.ts:11`
  - XSS and injection vulnerabilities

- [ ] **No socket authentication** - `sada-backend/src/services/chat.service.ts:38-46`
  - Users can impersonate others via socket

- [ ] **No request validation schema** - Missing Joi/Zod validation

### Error Handling (NEW — Cycle 8)
- [ ] **Fragile error dispatching** — controller uses `error.message.includes(...)` extensively (lines 267, 284, 421)
  - Wrong HTTP status if error messages change
  - Use custom error classes with error codes

### Performance (NEW — Cycle 8)
- [ ] **`searchByTag` double-filters** - `room.service.ts:99-111` — SQL LIKE on JSON + JS `.includes()` is unreliable and wasteful
- [ ] **`getTrendingRooms` loads ALL live rooms** - `room.service.ts:361-366` — no LIMIT at DB level, OOM risk at scale
- [ ] **`leaveRoom` runs 2 sequential queries** - `room.service.ts:154-168` — should use `Promise.all`
- [ ] **`BookmarkService.bookmark` does 3 queries** - `bookmark.service.ts:9-21` — could be 2 via upsert

## 🟢 Medium Priority

### Testing
- [ ] **Zero test coverage** - Entire codebase
  - No unit, integration, or E2E tests

### State Management (Mobile)
- [ ] **No global state** - `sada-mobile/src/screens/HomeScreen.tsx:27-30`
  - User state scattered, duplicate API calls

- [ ] **No optimistic UI updates** - All operations await network

### Infrastructure
- [ ] **No database migrations** - `sada-backend/src/config/database.ts`
- [ ] **No logging framework** - Console.log used throughout
- [ ] **No health check endpoint** - No dependency checks
- [ ] **No monitoring/metrics** - No Sentry, no analytics

### Mobile UX
- [ ] **No offline support** - App requires network for everything
- [ ] **No push notifications** - Users miss messages when app closed
- [ ] **No socket reconnection strategy** - `sada-mobile/src/services/SocketService.ts`

### Data Quality (NEW — Cycle 8)
- [ ] **`peak_listeners` is misleading** - `room.service.ts:223` — stores end-time count, not actual peak
- [ ] **`Room.status` is untyped string** - `Room.ts:33` — should be enum (`'live' | 'ended' | 'scheduled'`)
- [ ] **`room_id` in `RoomBookmark` has no index** - `RoomBookmark.ts:19-20` — full table scan by room
- [ ] **`searchRooms` has no pagination** - `room.service.ts:89-96` — only unbounded list endpoint
- [ ] **No tag length validation** — regex allows 10,000+ char tags
- [ ] **Tags regex too restrictive** — `^[a-zA-Z0-9]+$` blocks hyphens, underscores, unicode

### Code Quality (NEW — Cycle 8)
- [ ] **Inconsistent imports** — `BookmarkService` loaded via `require()` inside methods, others at top
- [ ] **`(req as any).user?.id` repeated ~20 times** — needs typed `AuthRequest` interface
- [ ] **`getUserBookmarks` has no route** — service method exists but unreachable
- [ ] **No validation schemas for bookmark endpoints** — params unvalidated

---

## Cycle History

| Cycle | Date | Score | New Issues | Status |
|-------|------|-------|-----------|--------|
| Initial | 2026-02-20 | 2.8 | 25 | Critical security holes |
| Cycle 8 | 2026-04-01 | 2.5 | +15 | Regressed — crash bugs found |

**Score: 2.5/10** (down from 2.8) — crash bugs + unreachable endpoints + zero progress on existing issues

_Last checked: 2026-04-01_
