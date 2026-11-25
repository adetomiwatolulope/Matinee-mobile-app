# Matinee

**Status:** partial implementation. Identity, basic movie discovery, rate limiting, caching, observability, and safe UI surfaces exist. Booking inventory, real payment confirmation, refunds, tickets, cinema admin, and door scanning remain blocked or unimplemented.

`AGENTS.md` and `docx/matinee-prd.md` are the source of truth. Read them before changing behavior.

## Documentation

- `ARCHITECTURE.md` — current system boundaries and request flow.
- `TRAFFIC.md` — traffic management design and what is actually implemented.
- `COMPONENTS.md` — mobile component library and UI conventions.
- `SHARDING.md` — future sharding plan; no simulation implemented.
- `LEARNING-LOG.md` — study notes, sources, and unresolved questions.
- `LOAD-TEST-REPORT.md` — k6 scripts, thresholds, commands, and honest execution status.
- `docs/backend-system-design.md` — pooling, routing, jobs, observability, and load-test status.
- `docs/component-library.md`, `docs/ui-design.md`, `docs/tmdb-integration.md` — detailed product/UI docs.

## Layout

- `Frontend/` — React Native + Expo customer mobile app. API base URL is `Frontend/.env` (`EXPO_PUBLIC_API_BASE_URL`).
- `Backend/` — Node.js/Express API with Zod validation, JWT auth, PostgreSQL/Prisma, Redis rate limits and cache, durable email jobs, and structured logging.
- `Backend/database/` — Prisma schema, versioned migrations, generated client, and Prisma Studio script.
- `apps/web/` — placeholder for future Next.js/TypeScript admin surfaces; not initialized.
- `tests/load/hold-contention.js` — k6 scaffold for a future authoritative hold endpoint.
- `packages/contracts`, `packages/shared`, `modules/*`, `infrastructure/*` — AGENTS target layout placeholders; no broad reorganization was performed.

## Local setup

Backend:

```bash
cd Backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm start
```

Requires PostgreSQL and Redis. Backend configuration lives in `Backend/.env`; use `Backend/.env.example` as the template. Do not commit `.env`.

Frontend:

```bash
cd Frontend
npm install
npm start
```

Set `EXPO_PUBLIC_API_BASE_URL` in `Frontend/.env` to `http://<your-computer-IP>:3001` when testing on a physical device on the same network.

Android development build:

1. Install and sign in to an Expo account, then run `npm run eas:init` once from `Frontend/`. This adds the EAS project ID to `Frontend/app.json`.
2. Set `EXPO_PUBLIC_API_BASE_URL` to a backend URL the phone can reach. A LAN IP works only on the same Wi-Fi; use an approved reachable host for broader testers.
3. Run `npm run build:android:dev` from `Frontend/`.
4. When the build succeeds, EAS prints the install/download URL. The same URL is available in the Expo dashboard and through `npm run build:android:dev:list`.

`Frontend/eas.json` uses an internal-distribution development build with `expo-dev-client`. The APK works on an emulator or physical device. No build link exists until a build is run with an authenticated Expo account.

Database viewer:

```bash
cd Backend/database
npm run studio
```

Prisma Studio opens at `http://localhost:5555`.

## Verification already run

- Backend: `npm test` — 40 passed, 2 skipped.
- Backend startup smoke test: `GET /health` returned `200 {"status":"ok"}` with an `X-Request-Id` header.
- Frontend: Expo Android export 1011 modules, iOS export 1013 modules.
- `git diff --check` reports only existing CRLF warnings.
- k6 load test was not run because k6 is not installed and the authoritative hold endpoint does not exist yet.

## Current blockers

Do not implement guessed behavior for booking fees, taxes, provider charges, refund formulas, settlement, late payment after hold expiry, TMDB commercial use, waiting rooms, WebSockets, or customer-facing web booking. See `AGENTS.md` §9 and the PRD decision register.
