# QueryCraft 0.1.0 release record

The local integration build at `02d5502` used model `mvp-1`, Node 24.22.0 and pnpm 12.21.0. The pinned Cloudflare CLI was `cf` 1.0.0-rc.1.

## Verified locally

| Check                                                                  | Result                                                                                                                                               |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                       | Passed from a clean checkout                                                                                                                         |
| `pnpm lint` and `pnpm typecheck`                                       | Passed                                                                                                                                               |
| `pnpm test`                                                            | 81 tests passed                                                                                                                                      |
| `pnpm validate:levels`                                                 | Six puzzles verified across 24 index combinations                                                                                                    |
| `pnpm test:e2e`                                                        | 15 Chromium tests passed, including online and offline playthroughs, keyboard flow and metrics scrolling, invalid imports and service-worker updates |
| `pnpm build:cloudflare` and `pnpm exec cf deploy --prebuilt --dry-run` | Passed locally with SPA fallback. Packaged assets matched `dist`.                                                                                    |

An isolated Chromium 159 run of `5d8f6c8` at 390 × 844, 3× device scale and 4× CPU slowdown measured 111.65 KiB of initial gzip JavaScript and CSS against the 250 KiB budget. The cold load event was 261.5 ms and first contentful paint was 368 ms. Nine tutorial runs took 45.4–48.0 ms from touch input to the Results panel’s rendering opportunity against a 200 ms target. This measurement used the local production preview. [Measurement procedure](../tests/e2e/performance.spec.ts)

The local Chromium audit checked level six at 320, 390, 768 and 1440 CSS pixels in dark and light themes with reduced motion and 200% root text. Results and the primary Run action fit without horizontal document overflow. A keyboard-only tutorial on the 390-pixel layout covered a failing run, a corrected run, submission and focus on the next level. Chromium exposed landmarks, a named selected tab and panel, metric table headings and a live status in its accessibility tree. [Desktop challenge](media/querycraft-desktop-challenge.png) · [Mobile results](media/querycraft-mobile-results.png) · [Keyboard tutorial](media/querycraft-tutorial.webm)

Chromium’s browser zoom was also set to 200% and verified independently of the text-size check. At the same four effective viewport widths in both themes, the longest level title, Run action, and results remained usable without page-wide horizontal overflow.

## Forgejo review

Phase A is open for review. The Phase B, C, and D branches are on Forgejo. After each phase merges, reconcile the next branch with Forgejo `main`, open its review and verify GitHub Actions for the mirrored merge SHA. Release preparation follows Phase D review. [Phase A pull request](https://git.akibh.dev/akib/queryCraft/pulls/2)

## Pending release checks

- A first-time player tutorial observation and a manual screen-reader pass.
- Owner approval of the project license and confirmation of a dedicated security contact.
- The remaining Forgejo phase reviews and GitHub mirror CI for their merge commits.
- Authorized preview and production deployment. The source tag, deployment ID, hostname and previous known-good deployment are pending publication.
- Hosted verification of HTTPS, headers, deep links, mobile play, offline replay and service-worker upgrade with existing progress.

Use the release plan for hosted smoke checks. The live deploy command is `pnpm exec cf deploy --prebuilt` after `pnpm build:cloudflare` and account authorization. [Release checklist](../plan/05-release.md)
