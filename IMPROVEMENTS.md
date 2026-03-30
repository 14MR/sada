# sada - Improvements

_Analyzed: 2026-02-20_

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

---

_Last checked: 2026-02-20_
