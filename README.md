# Matinee (scaffold)

**Phase 0 / blockers unresolved** — no product features implemented. Layout reorganized per user request (deviates from AGENTS target `apps/*`/`packages/database`; AGENTS/PRD remain source of truth).

- `Frontend/` — React Native + Expo mobile app (baseline). API base URL: `Frontend/.env` (`EXPO_PUBLIC_API_BASE_URL`, LAN IP — change there if needed).
- `Backend/` — Node.js server (`index.js`, `GET /health`, CORS, binds `0.0.0.0`). Env: `Backend/.env`.
- `Backend/database/` — Prisma (PostgreSQL) schema/config (`prisma/schema.prisma`).
- `apps/web/` — placeholder for Next.js/TS web/admin surfaces (not initialized).
- `packages/contracts`, `packages/shared`, `modules/*`, `infrastructure/*`, `tests/*` — per AGENTS target.

See `AGENTS.md` and `docx/matinee-prd.md` before adding behavior.
