# SADA Product Roadmap

**PM:** SkyNet 🤖
**Started:** 2026-03-30
**Goal:** Ship a working, secure MVP

---

## Phase 1: Critical Security & Auth ✅ DONE
- [x] JWT auth middleware (protect all routes except signin)
- [x] Remove hardcoded JWT secret fallback
- [x] Input validation with Zod on all endpoints
- [x] CORS whitelist (configurable via CORS_ORIGINS env)
- [x] Rate limiting (5/min auth, 100/min API)
- [x] Socket.io auth
- [x] Fix gem transaction race condition

## Phase 2: Wire Up Missing Routes ✅ DONE
- [x] Mount all 14 routes in index.ts
- [x] Category, Creator, Admin, Moderation, Notification APIs
- [x] Chat reactions, Room recordings, Speaker requests, Withdrawal APIs

## Phase 3: Integration Testing & Polish 🔄 IN PROGRESS
- [ ] Add Zod validators for remaining endpoints (notification, recording, reaction, withdrawal)
- [ ] Add integration tests for newly mounted routes
- [ ] Socket.io chat auth tests
- [ ] Input sanitization (XSS) review
- [ ] Check all bugbot PR comments resolved

## Phase 4: Mobile ↔ Backend Integration
- [ ] Apple Sign-In real verification (not mock)
- [ ] Real payment integration stub (Stripe/Apple IAP)
- [ ] Push notifications (APNs via Expo)
- [ ] EAS Build & TestFlight config
- [ ] Update mobile API client to use auth headers

## Phase 5: Launch Prep
- [ ] Docker production config
- [ ] Environment secrets management
- [ ] Database migrations strategy
- [ ] Monitoring & logging (structured logs)
- [ ] Load testing validation
- [ ] Production deploy script update

---

**Last Updated:** 2026-03-30
**Tests:** 67/67 passing
**Branch:** feat/e2e-tests
