# QueryCraft stack and publishing plan

Build the six-level MVP as a static browser app. Cloudflare delivers the game files. The browser handles every simulation, score and save.

| Area                      | Choice                                                  | Why it fits                                                                                                                                        |
| ------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toolchain                 | Node.js LTS, pnpm, Vite                                 | One project and lockfile are enough for the first release. Pin versions when scaffolding.                                                          |
| Interface                 | React, TypeScript, CSS Modules and CSS variables        | The challenge screen is mostly interactive controls, read-only SQL, plan comparisons and metrics. Native HTML controls support keyboard play.      |
| Simulator                 | Pure TypeScript module independent of React             | Calculate scan and index costs from row counts, selectivity and index metadata. Identical inputs must produce identical estimates on every device. |
| Levels                    | Versioned JSON validated with Zod                       | Bundle the six puzzles with the app. Check objectives and known solutions during the build.                                                        |
| Progress and offline play | Versioned localStorage saves and a service worker       | Scores and unlocks are small. Precache the app and levels so players can reopen the game offline after the first successful load.                  |
| Verification              | Vitest, Playwright, GitHub Actions                      | Test plan selection and reference solutions, then play through a level, reload, and verify the unlock survives.                                    |
| Hosting                   | Cloudflare Workers Static Assets on the existing domain | Publish Vite's `dist/` directory with SPA fallback. A future API can use the same deployment.                                                      |

## Free-tier publishing

Use an assets-only deployment for v0.1. Cloudflare serves static asset requests free and without a request quota. Worker script invocations have separate limits, so pressing Run should only call the local TypeScript engine. Pages also fits the static build. Workers Static Assets is the preferred choice here because we can add a score submission endpoint in the same project later. [Static asset billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) · [Pages limits](https://developers.cloudflare.com/pages/platform/limits/)

Start on a workers.dev address. Verify direct links, offline reload, and the first puzzle on mobile. For launch, attach an available hostname under the existing domain as a Worker Custom Domain. Cloudflare provisions DNS and TLS. [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

## When to add a database

Keep levels in the build and personal progress on the device. A public leaderboard would justify a Worker API and D1. The API could rerun the submitted choices against the versioned model before recording the score. D1 Free currently includes 5 million rows read per day, 100,000 rows written per day and 5 GB total account storage. The simulated million-row users table is represented by a few metadata fields and consumes no D1 quota. [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)

## First milestone

Implement the email lookup puzzle from the project spec. Test the baseline full scan and indexed lookup, connect both to the challenge screen, and let the player compare estimated read savings with index storage and write costs. The milestone is complete when a player can solve it, unlock the next level, and reload with progress intact.
