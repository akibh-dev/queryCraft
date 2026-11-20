# Build QueryCraft

Start here if you are the coordinating agent. If you are implementing one ticket, read its row in the work queue, the linked design or contract, and its acceptance check before editing code.

## What ships

A visitor opens the game, inspects a slow fixed SQL query, chooses indexes, runs an estimate, compares it with the starting configuration, and submits a solution. Passing unlocks the next of six levels. The player can explain both the read benefit and the write or storage cost. The first milestone ends when that journey works for the million-row email puzzle and survives a reload.

| Read                                                                                    | Use it for                                                                                  |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [Delivery and assignments](01-delivery.md)                                              | Pick a ready ticket, identify the owner of each file and run the handoff check.             |
| [Interface](02-interface.md)                                                            | Build screens, reusable controls, icons, responsive layouts and keyboard interactions.      |
| [Engine and contracts](03-engine-and-contracts.md)                                      | Implement shared data types, simulation math, scoring and save format.                      |
| [Campaign](04-levels.md)                                                                | Author and verify the six launch puzzles.                                                   |
| [Integration and release](05-release.md)                                                | Test the built app, publish it to Cloudflare when authorized and verify the public release. |
| [Original product spec](../QUERYCRAFT_PROJECT_SPEC.md) and [stack decision](../plan.md) | Understand product intent and hosting choices.                                              |

## Architecture decisions

Use one Vite application, React, TypeScript, CSS Modules, pnpm, Zod, Vitest and Playwright. Keep the engine independent of React. Bundle levels and run simulations locally. Use localStorage for progress and a service worker for offline reopening. Publish the build directory to Cloudflare Workers Static Assets. The six levels do not require D1, login, a remote SQL executor or AI.

Use these URLs for navigation, browser back and direct links. Home is `/`, map is `/levels`, a challenge is `/levels/:levelId`, its debrief is `/levels/:levelId/debrief`, settings is `/settings`, and the model explanation is `/model`. Use stable IDs from the catalog. A locked level links back to the map with an explanation. Unknown URLs show a recovery link. Opening a debrief without an available result offers replay or return to map. Derive unlocks from validated completion and the published sequence.

Release scope follows v0.1 in the product spec. After launch, v0.2 adds composite indexes, ordering and a sandbox; v0.3 adds pagination and covering indexes; v0.4 adds caching and workload trade-offs; v1.0 can add community levels and a local SQLite lab. Each expansion needs its own model version, fixtures and UX review before joining the campaign.

## Rules for independent work

1. The coordinator owns routes, cross-module assembly, dependencies and shared configuration. Other owners request changes through the coordinator. A contract change goes to the contract owner and affected consumers before implementation.
2. Work only inside your ticket's paths. Place tests beside the code unless the ticket owns an end-to-end journey. Use a separate branch or worktree per agent if available.
3. Use fixtures to unblock visual work. Ship real engine results for every player-visible number. Keep sample views out of production routes.
4. Report what a reviewer can reproduce, the checks actually run, and any dependency still simulated. The coordinator marks the ticket done after integrating it and checking its acceptance condition.
