# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Repository Overview

"Witch Trial" (魔女审判) — a Next.js personality quiz web app. Users answer 26 scenario questions while role-playing a "witch on trial," then the server matches their answers to 1 of 16 personality archetypes via a weighted 12-dimensional vector algorithm. Supports 4 locales (zh-CN, zh-TW, en, ja) and includes a password-protected admin dashboard.

## Common Commands

```bash
# Setup (first time only)
npm install              # Install dependencies
cp .env.example .env     # Configure environment variables
npx prisma generate      # Generate Prisma client for your platform
npx prisma db push       # Initialize dev database
npx tsx prisma/seed.ts    # Seed questions + personality types

# Development
npm run dev              # Start dev server on http://localhost:3010 (webpack)
npm run build            # Production build (webpack, standalone output)
npm start                # Run production server on port 3010
npm run lint             # ESLint
npm test                 # Run vitest once
npm run test:watch       # Vitest watch mode

# Single test file / pattern
npx vitest run src/lib/match.test.ts
npx vitest run -t "pattern"

# Prisma
npx prisma generate              # Regenerate client (run after schema change OR after switching OS — see Platform Caveats)
npx prisma db push               # Push schema to dev.db (no migrations folder used in dev)
npx tsx prisma/seed.ts           # Seed questions + personality types from src/data/quiz-content.ts
DATABASE_URL="file:./dev.db"     # required env var (loaded from .env or set inline)

# Admin API access (any /api/admin/*)
curl -H "x-admin-password: $ADMIN_PASSWORD" http://localhost:3010/api/admin/stats

# E2E (Playwright)
npx playwright test
```

## Platform Caveats

This project is developed on both Windows and macOS. Two artifacts are platform-specific and must be rebuilt after switching OS or cloning:

1. **Prisma client** — `node_modules/.prisma/client` is generated for the host platform. If `prisma.question.findMany` throws `Prisma Client could not locate the Query Engine for runtime "windows"` (or darwin), run `npx prisma generate`.
2. **lightningcss native binary** — Tailwind v4 depends on `lightningcss-<platform>` packages. If pages 500 with `Cannot find module '../lightningcss.win32-x64-msvc.node'`, run `npm install` (the optional platform dep gets fetched).

## Environment Variables

Copy `.env.example` to `.env` before first run. Required:
- `ADMIN_PASSWORD` — Password for admin dashboard access (sent via `x-admin-password` header)
- `DATABASE_URL` — SQLite path for dev: `file:./dev.db` (auto-created by Prisma)

Optional:
- `GA_TRACKING_ID` — Google Analytics tracking ID

## Architecture

### Quiz Flow

```
/ (iframe → public/index.html)  ──"接受审判"──▶  /test  ──answers──▶  result
                                                  ▲                      │
                                                  └────"REBIRTH"────────┘  (full reload to /)
```

- `src/app/page.tsx` is just an `<iframe src="/index.html">`. The actual welcome screen is the static `public/index.html`, which deep-links to `/test` to start the quiz.
- `src/app/test/page.tsx` is the quiz orchestrator — it fetches `/api/quiz`, runs `<TestScreen>`, then `<ResultScreen>`. The two screens are siblings on the same page; the transition is a state flip, not a route change.
- Progress is persisted to `localStorage` under `witch-trial-progress` (resume support).
- "REBIRTH" / EXIT both `window.location.href = "/"` — full reloads, not SPA navigation.

### Matching Algorithm — `src/lib/match.ts`

This is the heart of the app. The flow:

1. Collect dimension scores from answers (skip `GATE` and `TRIGGER` dims).
2. **Special trigger short-circuit**: if a `triggerFired` + matching `gateValue` (`destroy`/`endure`) is set, return a hidden character (similarity 100, `special: true`).
3. **Gate micro-adjustment**: `gateValue === "normal"` bumps `S2 +1`; `"normal_alt"` bumps `W1 +1` (caps at 6).
4. Convert each dim's summed score to a tier `L=0, M=1, H=2, X=3` via `ALGO_CONFIG.tiers`.
5. Weighted Manhattan distance vs. each non-special, non-fallback personality template vector (`"LHH-LLM-HHH-LLL"` format).
6. Sort ascending by distance, take top 3, compute similarity %.
7. **Border check**: if top1.similarity − top2.similarity < `ALGO_CONFIG.delta`:
   - If top1.similarity < `ALGO_CONFIG.threshold` → return the **fallback** type (group `"fallback"`, e.g. UNSET).
   - Otherwise mark result `borderType: true`.

`DIMENSIONS`, `WEIGHTS`, `ALGO_CONFIG`, `QUESTIONS`, and the 16 `PERSONALITY_TYPES` all live in `src/data/quiz-content.ts`. The DB is seeded from this file but can be edited at runtime through the admin panel — server endpoints read from the DB, not the static data.

### Localization

4-locale system (`zh-CN` base, `zh-TW`, `en`, `ja`):
- Static UI strings: `src/i18n/<locale>.ts`, served via `src/lib/i18n.tsx` React context.
- Question/type strings: stored in DB as a `translations` JSON column on `Question` / `PersonalityType`.
- Resolution fallback chain: DB translation → i18n file → base zh-CN content. See `src/lib/use-localized-content.ts`.

### API Surface

Public:
- `GET  /api/quiz` — questions, dimensions, types
- `POST /api/match` — body validated by `matchRequestSchema` (Zod). Client sends `(questionId, optionId)` per answer; the server re-derives `dim`/`score`/`gateValue`/`triggerFired` from the DB, so client-side tampering can't forge a result.
- `POST /api/results` — persist a `TestRecord` + `Answer[]`, returns participation stats (`rank`, `typeCount`, `typePercentage`). No localized message — the client renders strings from `src/i18n/`.
- `GET  /api/count` — total participants (real count + hardcoded 2974 offset in route)

Admin (all gated by `src/proxy.ts` checking `x-admin-password` header against `process.env.ADMIN_PASSWORD`):
- `/api/admin/stats`, `/api/admin/export`, `/api/admin/import`, `/api/admin/template`
- `/api/admin/questions[/:id]`, `/api/admin/types[/:id]`, `/api/admin/users[/:id]`

### Rate Limiting

Custom token-bucket implementation in `src/lib/rate-limit.ts`. Used on public endpoints (`/api/match`, `/api/results`) with per-IP throttling. In-memory buckets, pruned after 1 hour when map exceeds 10k entries.

### Database (Prisma + SQLite)

5 models in `prisma/schema.prisma`: `Question`, `Option`, `PersonalityType`, `TestRecord`, `Answer`. Note:
- No `prisma/migrations` directory — schema changes are pushed with `prisma db push`.
- `translations` columns are stringified JSON, not Prisma JSON type (SQLite limitation).
- `Question.type` is `"normal" | "gate" | "trigger"`; only one gate + one trigger question exist, and the trigger question is conditionally shown based on the gate answer.
- `next.config.ts` sets `serverExternalPackages: ["@prisma/client"]` — required for the standalone output to work.

## Project-Specific Conventions

- **Path alias**: `@/*` maps to `src/*` (configured in `tsconfig.json`). Use `@/lib/match` not `../../lib/match`.
- **All visible page components are client components** (`"use client"`) — the app is state-driven, not route-driven.
- **Do not use `next/link` or `next/navigation` for the quiz flow.** Screen transitions are state changes inside one page, animated with Framer Motion `AnimatePresence`.
- **Tailwind v4 + CSS variables**: theme tokens live as `--wt-*` CSS variables in `src/app/globals.css`; components reference them via `var(--wt-accent)` etc.
- **No `next/font`**: fonts (Noto Serif SC, Cinzel) are loaded via `<link>` / `@import` per the handoff doc.
- **Vector strings**: 12-dim vectors are written as `"LHH-LLM-HHH-LLL"` (groups of 3 separated by `-`, characters `L/M/H/X` = `0/1/2/3`). `parseVector`/`formatVector` in `src/lib/match.ts` handle the conversion.
- **Dev server port is 3010**, not the Next.js default 3000.

## Deployment

`Dockerfile` is a multi-stage `linux/amd64` build using Next.js standalone output. The container's entrypoint runs `prisma db push --accept-data-loss` and `prisma db seed` before `node server.js`, so the DB self-initializes on first boot. Production container listens on `PORT=3001`, DB at `DATABASE_URL=file:./prisma/data/witch-trial.db`.
