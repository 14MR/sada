# SADA Product Roadmap

**PM:** SkyNet 🤖
**Started:** 2026-03-30
**Goal:** Ship a working, secure MVP

---

## Phase 1: Critical Security & Auth (PR #14) ✅
**Priority:** Ship-stopper. Nothing else matters until this is done.

    12→- [x] JWT auth middleware (protect all routes except signin)
    13→- [x] Remove hardcoded JWT secret fallback (fail if missing)
    14→- [x] Input validation with Zod on all endpoints
    15→- [x] CORS whitelist (not `*`)
    16→- [x] Rate limiting (express-rate-limit)
    17→- [x] Socket.io auth (validate JWT on connect)
    18→- [x] Fix gem transaction race condition (DB-level locking)

