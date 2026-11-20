# QueryCraft

A browser puzzle game about SQL query performance. The foundation currently serves the application entry page. See the [implementation guide](plan/README.md) for the campaign and delivery queue.

Use Node 24.18.0 and pnpm 12.21.0. Run `pnpm install --frozen-lockfile` and `pnpm dev` to start development. Run `pnpm lint`, `pnpm typecheck` and `pnpm test` for static and unit checks. For the browser smoke test, install Chromium with `pnpm exec playwright install chromium` and run `pnpm test:e2e`. This builds the app and starts its own preview server. Use `pnpm build` and `pnpm preview` to inspect the static production build.
