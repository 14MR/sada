# SADA Product Roadmap

**PM:** SkyNet 🤖
**Started:** 2026-03-30
**Goal:** Ship a working, secure MVP

---

## Phase 1: Critical Security & Auth ✅ DONE
- [x] JWT auth middleware (protect all routes except signin + health)
- [x] Remove hardcoded JWT secret fallback
- [x] Input validation with Zod on all endpoints (11 validators)
- [x] CORS whitelist (configurable via CORS_ORIGINS env)
- [x] Rate limiting (5/min auth, 100/min API)
- [x] Socket.io JWT auth on connect
- [x] Fix gem transaction race condition (inside DB transaction)
- [x] XSS sanitization middleware (strips HTML tags)
- [x] Authorization — all endpoints use JWT identity, not body userId
- [x] Validation middleware strips unknown/extra fields

## Phase 2: Wire Up Missing Routes ✅ DONE
- [x] Mount all 14 routes via createApp() (single source of truth)
- [x] Category, Creator, Admin, Moderation APIs
- [x] Notification, Withdrawal, Recording, Reaction APIs
- [x] Chat reactions with toggle, grouping, room queries
- [x] Room recordings (start, stop, publish, delete)
- [x] Speaker request flow (raise hand, approve/reject)
- [x] Gem withdrawal system for creators
- [x] No duplicate authenticate middleware on routes (global only)

## Phase 3: Integration Testing & Polish ✅ DONE
- [x] Zod validators for all 11 route groups
- [x] Integration tests for category, notification, admin, moderation
- [x] E2e tests for auth, rooms, creator, social, gems
- [x] Input sanitization (XSS) middleware applied globally
- [x] All bugbot PR comments resolved (8 issues fixed)
- [x] Staff engineer code review — 3 critical issues found and fixed

## Phase 4: Mobile ↔ Backend Integration ✅ DONE
- [x] Apple Sign-In verification (real via jwks-rsa/jose, mock in test)
- [x] Native mobile Apple Sign-In wired with development-only mock fallback
- [x] Payment integration (Apple/Google IAP with idempotency)
- [x] Mobile gem store initiates real Apple/Google IAP and sends store receipts to backend
- [x] Mobile gem purchase request shape aligned with backend API
- [x] Push notification service (Expo push tokens, register/send)
- [x] Speaker request endpoints (POST raise, PATCH approve/reject, GET list)
- [x] Payment audit trail (receipt hash, transaction type, status)
- [x] Free gem exploit blocked (receipt required in production)
- [x] Persisted receipt idempotency with database uniqueness

## Phase 5: Launch Prep ✅ DONE
- [x] Docker multi-stage production build (non-root user, health check)
- [x] Structured logging (winston, JSON in prod, pretty in dev)
- [x] Request logging middleware (method, path, status, duration)
- [x] Database migrations system (generate, run, revert scripts)
- [x] Enhanced health check (DB connectivity, uptime, memory)
- [x] .env.example with all variables documented
- [x] Error handler middleware with structured logging
- [x] Production Cloudflare config fails fast instead of using baked defaults
- [x] Production Docker health check points at `/health`
- [x] Production CORS requires explicit origins
- [x] Production admin and Apple bundle configuration fails fast

## Phase 6: Post-Launch Hardening ✅ DONE
- [x] Socket room joins require live room participation
- [x] Chat messages and signals require the socket to join the room first
- [x] Trending rooms query applies ordering and pagination in SQL
- [x] Recommended rooms score a bounded live-room candidate set
- [x] Authenticated Express requests have typed `req.user` access
- [x] Duplicate gem purchase conflicts use a typed domain error
- [x] Report target validation uses typed domain errors
- [x] Category lookup failures use a typed domain error
- [x] Recording lookup failures use a typed domain error
- [x] Admin/report lookup failures use typed domain errors
- [x] Creator access failures use typed domain errors
- [x] Room lookup failures use a typed domain error
- [x] Room state and host-permission failures use typed domain errors
- [x] Speaker request failures use typed domain errors
- [x] Banned auth sign-in failures use a typed domain error
- [x] Concurrent Apple first sign-in recovers from unique insert races
- [x] Gem history responses are paginated and expose only public user fields
- [x] Audio session failures use typed domain errors
- [x] Conversation and message failures use typed domain errors
- [x] Replace remaining controller string-match error mapping with typed domain errors
- [x] Add mobile unit/component tests around auth and gem purchase flows
- [x] Implement real Apple App Store Server API and Google Play receipt verification
- [x] Mobile sign-out clears cached user profile data
- [x] Rooms controller uses typed imports instead of dynamic require
- [x] Mobile login errors use user-safe alert messages
- [x] Gem transaction references distinguish receipt hashes from room ids

---

## Security Audit Summary
- ✅ JWT auth on all routes (except signin + health)
- ✅ No impersonation — JWT identity used everywhere
- ✅ Zod validation on all inputs (11 schemas)
- ✅ XSS sanitization globally applied
- ✅ CORS configurable (not wildcard by default)
- ✅ Rate limiting (auth + API)
- ✅ Socket.io JWT verification
- ✅ Payment verification required in production
- ✅ Mobile gem store uses native IAP instead of mock receipts
- ✅ Receipt idempotency persisted in the database
- ✅ No hardcoded secrets
- ✅ Production CORS fails fast without explicit origins
- ✅ Socket room access checks participant membership
- ✅ Socket chat and signaling payload sizes are bounded
- ✅ Admin key validation uses timing-safe comparison
- ✅ Production admin and Apple bundle env vars fail fast
- ✅ Apple first sign-in handles concurrent user creation races
- ✅ Gem history responses omit private user fields and enforce pagination caps
- ✅ Mobile sign-out clears cached profile data
- ✅ Rooms controller dependencies are statically typed
- ✅ Mobile login alerts do not expose raw internal error details
- ✅ Gem transaction reference ids are tagged by purpose

## Test Coverage
- **Suites:** 13 (admin, auth, chat-service, CORS, discovery, env, gems, messaging, moderation, payment verification, rooms, security, social)
- **Tests:** 198 passing
- **Types:** E2e integration tests with auth

---

**Last Updated:** 2026-06-29
**Tests:** 198/198 backend passing + 8/8 mobile unit passing
**Branch:** main
**Latest PR:** #73
