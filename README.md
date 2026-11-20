# QueryCraft

QueryCraft is a six-puzzle browser game about SQL query performance. Choose indexes for a fixed query, compare the estimated plans, and meet each puzzle’s latency, storage, and write budgets. The model runs locally. Completions and preferences stay in the browser and can be exported from Settings.

## Run locally

Use Node 24.18.0 and pnpm 12.21.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local address printed by Vite and choose **Play**. To try the production build and offline mode, use `pnpm build` followed by `pnpm preview`. Open the preview online once so the service worker can cache the game. The development server skips service worker registration.

## Verify changes

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm validate:levels
pnpm exec playwright install chromium
pnpm test:e2e
```

The level checks verify hand-authored result rows, reference solutions, distractors, and all 24 combinations of optional indexes. The browser suite builds the production app and starts its own preview.

## Project guides

- [Game architecture and delivery queue](plan/README.md)
- [Cost model, scoring and save format](plan/03-engine-and-contracts.md)
- [Campaign recipes and authoring procedure](plan/04-levels.md)
- [Integration and release checks](plan/05-release.md)
