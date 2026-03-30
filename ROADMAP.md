# SADA Product Roadmap

**PM:** SkyNet 🤖
**Started:** 2026-03-30
**Goal:** Ship a working, secure MVP

---

## Phase 1: Critical Security & Auth (PR #14) 🔴
**Priority:** Ship-stopper. Nothing else matters until this is done.

- [ ] JWT auth middleware (protect all routes except signin)
- [ ] Remove hardcoded JWT secret fallback (fail if missing)
- [ ] Input validation with Zod on all endpoints
- [ ] CORS whitelist (not `*`)
- [ ] Rate limiting (express-rate-limit)
- [ ] Socket.io auth (validate JWT on connect)
- [ ] Fix gem transaction race condition (DB-level locking)

## Phase 2: Wire Up Missing Routes (PR #15)
- [ ] Mount all 14 routes in index.ts
- [ ] Category API (browse/list)
- [ ] Creator dashboard API
- [ ] Admin dashboard + moderation
- [ ] Notification API (list, mark read, push)
- [ ] Chat reactions API
- [ ] Room recordings API
- [ ] Speaker requests API
- [ ] Withdrawal API for creators

## Phase 3: Integration Testing & Bugbot Fixes (PR #16)
- [ ] Fix all e2e tests to work with auth middleware
- [ ] Add auth helpers to test setup
- [ ] Resolve any open bugbot PR comments
- [ ] Input sanitization (XSS prevention)

## Phase 4: Mobile ↔ Backend Integration
- [ ] Apple Sign-In real verification (not mock)
- [ ] Real payment integration stub (Stripe/Apple IAP)
- [ ] Push notifications (APNs via Expo)
- [ ] EAS Build & TestFlight config

## Phase 5: Launch Prep
- [ ] Docker production config
- [ ] Environment secrets management
- [ ] Database migrations strategy
- [ ] Monitoring & logging
- [ ] Load testing validation

---

**Status:** Phase 1 in progress
