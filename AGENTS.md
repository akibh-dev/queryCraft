# Working on QueryCraft

The Forgejo repository on the owner's VPS is the source of truth. Push phase branches to its Git remote, `origin`. GitHub mirrors `main` and runs CI when the mirror receives a push to that branch.

1. Start each phase from the latest Forgejo `main`. Use a short branch name without an account prefix, such as `a0-foundation`. Use the configured Git author identity.
2. Commit each small, working change with its relevant tests and a message describing the outcome. Run the checks affected by that change and push the phase branch to Forgejo as work progresses.
3. Use parallel agents for independent tickets in the delivery queue. Give each agent its file boundaries. In a shared checkout, the coordinator owns staging, commits and pushes. Use explicit paths to keep unrelated work out of each commit.
4. At the end of the phase, integrate its tickets and run the phase acceptance checks locally. Open one Forgejo pull request from the phase branch into `main`. Include the tickets delivered, how to verify them, actual check results and anything still unverified. Keep review fixes on the same branch.
5. After merge, identify the resulting Forgejo `main` commit. Verify that the GitHub mirror reaches that SHA and check the GitHub Actions push run for it. Report local checks and mirror CI separately. If the mirror lags, check its sync status. If CI fails, use the failing job log to prepare a small fix through Forgejo.

The [delivery queue](plan/01-delivery.md) defines phase boundaries, commands and acceptance checks.
