# Author a level

Use the tutorial as an example. The level carries a stable ID, model and level versions, table statistics, one read-only query, index options, and mandatory, silver and gold objectives. Its compact fixture carries input rows and the expected projection in column order. [Tutorial level](../src/content/levels/w1-l1-needle-in-a-million.json) · [Tutorial fixture](../src/content/fixtures/w1-l1-needle-in-a-million.json)

1. Edit or add the level and its fixture under `src/content`. Set the level’s `fixtureId` to the fixture’s `id` and verify the projected rows by hand.
2. Register the pair at the intended position in the ordered catalog. Keep the launch campaign’s six-level order unless the release scope changes. [Campaign catalog](../src/content/index.ts)
3. Add or update the test-only reference choices at the same position. The tutorial’s reference selects `idx_users_email`, while its distractor selects `idx_users_name`. The reference must earn three stars and the distractor must earn zero. [Test choices](../src/content/testing/references.ts)
4. Run `pnpm validate:levels` to check every combination of optional indexes. When behavior changes intentionally, run `pnpm validate:levels -u`, review the snapshot diff against the expected plan, metrics and objectives, then run validation again.
5. Play the level in the production preview. Try the reference, distractor, workbench reset and submit flow.

Keep level IDs stable because saves use them. Bump the level version when its authored behavior changes. Review the model version, compatibility and campaign snapshots when formulas or plan selection change. [Campaign recipe and acceptance criteria](../plan/04-levels.md) · [Contracts and versioning](../plan/03-engine-and-contracts.md)
