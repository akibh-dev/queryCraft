# Content guide: six launch puzzles

Build the catalog in this order. Unlock the next puzzle on a successful submission. Each SQL statement below specifies the fixed query. Generate the displayed SQL from the same structured query that the fixture evaluator uses. The player changes indexes via labeled controls. Each scenario uses a **virtual** table and a separate, small hand-written correctness fixture.

## How to read a recipe

Use the data shapes, units and scoring rules in [the engine contract](03-engine-and-contracts.md). A list such as “email, name” means two independently selectable single-column B-trees. Use stable option IDs of the form `idx_users_email`. Initial means selected at reset. Every table has a fixed primary index on unique integer `id` (8 bytes). Fixed-index costs belong to the base table. Editable options account for the player's resource usage. Use cold cache, reads/inserts indicated per second, and zero updates for all six launch levels. Column widths below are teaching assumptions. Model unprojected payload via average row width. Declare optional `NULL` sample values only if the declared column permits them.

In the examples, “expect” lists exact projected rows for the tiny fixture. Order is irrelevant for all six levels; compare multisets and column order, including multiplicity. Sample row frequencies need not match virtual frequencies. Validate every result independently against these hand-written expectations. Use the reference selection to generate cost goldens, never to decide which player choices pass.

## 1. Needle in a Million — `w1-l1-needle-in-a-million`

**Brief.** A support agent looks up one account by email. Introduce the filter, baseline, Run and Compare actions. No SQL knowledge required.

- Model: `users`, 1,000,000 rows × 128 bytes. Unique `email` (32 bytes); `name` (16 bytes, 10,000 distinct). Workload 95 reads / 5 inserts.
- Query: `SELECT id, email FROM users WHERE email = 'sample@example.test'`. Options: email, name. Initial: none. Reference: email alone.
- Target: reduce estimated latency by at least 70% and use at most 42,000,000 bytes of editable index storage. Check both the reduction and fitted capacity against actual engine results before shipping. Name alone still scans; adding both exceeds the cap.
- Tiny fixture `(id,email,name)`: (1,ada@example.test,Ada), (2,sample@example.test,Ada), (3,bo@example.test,Bo). Expect (2,sample@example.test).
- Hints in reveal order: “Which column filters the users?” / “Exactly one email matches.” / “Add the email index and run again.”
- Debrief: the baseline reads the table to find a single match; the B-tree finds the key, then fetches the row. Show the estimated read reduction alongside the storage and write costs.

## 2. Name Collision — `w1-l2-name-collision`

**Brief.** Support must find everyone with a particular name. Build on the equality lookup; introduce repeated keys and the difference between filters and output columns.

- Model: `contacts`, 32,768 rows × 192 bytes. `name` (16 bytes, 256 equally common names); unique `email` (40 bytes). Workload 90/10.
- Query: `SELECT email FROM contacts WHERE name = 'Sam'`. Options: name, email. Initial: none. Reference: name alone.
- Target: examine at most 128 rows; set the storage ceiling between the cost of name alone and both. The email-only selection still scans. Require the chosen lookup to estimate 128 matches. Every matching contact must remain in the result.
- Tiny fixture `(id,name,email)`: (1,Sam,a@example.test), (2,Lee,b@example.test), (3,Sam,c@example.test). Expect (a@example.test), (c@example.test).
- Hints: “Which column appears after WHERE?” / “Several people share each name.” / “Try indexing name alone and inspect rows examined.”
- Debrief: an index can help even when a key repeats. The simulator estimates 128 matching rows because 32,768 rows are distributed across 256 names.

## 3. Pocket Directory — `w1-l3-pocket-directory`

**Brief.** A four-row lookup table already has an editable index. Investigate whether keeping it pays off.

- Model: `regions`, 4 rows × 64 bytes. Unique `code` (2 bytes). Workload 80/20.
- Query: `SELECT id FROM regions WHERE code = 'NE'`. Option: code. Initial: code. Reference: remove code.
- Target: use zero editable index bytes and examine at most four rows. Assert that even with the code index available the selected read plan scans the one data page. Compare both candidate plans in the explanation.
- Tiny fixture `(id,code)`: (1,NW), (2,NE), (3,SW), (4,SE). Expect (2).
- Hints: “How many data pages hold this table?” / “Opening the index has a cost, too.” / “Remove the code index and compare the estimated latency.”
- Debrief: the table fits on one page in this model. Removing the unused index saves space and maintenance.

## 4. Range Runner — `w1-l4-range-runner`

**Brief.** A report needs scores from 400 up to, but excluding, 402. Use an ordered B-tree and inspect both boundaries.

- Model: `scores`, 100,000 rows × 256 bytes. `points` (8 bytes, 1,000 equally common integers from 0 through 999); `player_id` (8 bytes, 20,000 distinct). Workload 95/5.
- Query: `SELECT id FROM scores WHERE points >= 400 AND points < 402`. Encode as one half-open range. Options: points, player_id. Initial: none. Reference: points alone.
- Target: examine at most 200 rows and fit the byte budget for one index (calibrate between points alone and both). Require a range candidate to beat the scan. If the model prefers the scan on this distribution, widen the virtual row size or narrow the interval, then update the fixture and expected row count together.
- Tiny fixture `(id,points,player_id)`: (1,399,5), (2,400,5), (3,401,6), (4,402,6). Expect (2), (3).
- Hints: “Which column defines the interval?” / “The upper boundary is excluded.” / “Add the points index and inspect where its range starts and stops.”
- Debrief: neighboring keys in the index locate this interval. Fetching the matching table rows still costs work.

## 5. The Common Case — `w1-l5-the-common-case`

**Brief.** A dispatch report requests a status shared by half the queue. Revisit the intuition that indexing the filter always helps.

- Model: `jobs`, 100,000 rows × 96 bytes. `status` (8 bytes, 2 equally common text values). Workload 60/40.
- Query: `SELECT id FROM jobs WHERE status = 'open'`. Option: status. Initial: status. Reference: remove status.
- Target: remove all editable index storage while meeting a latency ceiling equal to the unindexed scan estimate (round the ceiling up if stored as an integer). Assert the planner prefers a scan even with the index available. Its rejected alternative must show the cost of fetching many scattered rows.
- Tiny fixture `(id,status)`: (1,open), (2,closed), (3,open), (4,closed). Expect (1), (3).
- Hints: “What fraction of the queue is open?” / “A lookup can still fetch thousands of pages.” / “Compare the scan with the status-index candidate, then remove the unused index.”
- Debrief: even on a large table, a broad predicate can favor sequential access. Show the estimated matching fraction and competing page costs. Physical layout can change this outcome in real systems.

## 6. The Price of an Index — `w1-l6-price-of-an-index`

**Brief.** An event collector is mostly writing new rows. Keep incident lookups fast while controlling the cost of each added index.

- Model: `events`, 300,000 rows × 160 bytes. Unique `request_id` (32 bytes); `actor_id` (8 bytes, 30,000 distinct); `category` (12 bytes, 12 equally common). Workload 10/90.
- Query: `SELECT id FROM events WHERE request_id = 'req-42'`. Options: request_id, actor_id, category. Initial: actor_id and category. Reference: request_id alone.
- Target: examine at most one row and meet a write-overhead ceiling strictly between the reference overhead and the lowest overhead of any configuration with request_id plus another index. Capture the actual values and unit in the level golden. “Add request_id and keep everything” should solve the read objective and fail the write budget. “Remove everything” should fail the lookup goal.
- Tiny fixture `(id,request_id,actor_id,category)`: (1,req-41,7,sync), (2,req-42,7,sync), (3,req-43,8,push). Expect (2).
- Hints: “Which two constraints must pass together?” / “Every enabled index needs upkeep when events arrive.” / “Keep request_id; try removing actor_id and category.”
- Debrief: compare the all-index configuration with the reference. Both can use the same read plan while the former adds maintenance. The decision applies to the declared workload; a second query might justify a different index.

## Starting objective values for implementation

Use these proposed ceilings with model `mvp-1`. Each row specifies additional mandatory objectives from the recipe and a concrete silver and gold check. Store all constraints as numeric objective objects from guide 03. These initial six puzzles reward finding the efficient configuration; clearing several tiers in one attempt is expected. The shipped goldens must come from running the engine.

| Level | Mandatory checks                                   | Silver ceiling           | Gold ceiling                 |
| ----- | -------------------------------------------------- | ------------------------ | ---------------------------- |
| 1     | Reduction ≥ 70%, index bytes ≤ 42,000,000          | Rows examined ≤ 1        | Write overhead ≤ 2.3%        |
| 2     | Rows examined ≤ 128, index bytes ≤ 1,000,000       | Index bytes ≤ 800,000    | Write overhead ≤ 3.1%        |
| 3     | Index bytes = 0 (encode as ≤ 0), rows examined ≤ 4 | Write overhead ≤ 0%      | Estimated latency ≤ 0.121 ms |
| 4     | Rows examined ≤ 200, index bytes ≤ 2,000,000       | Index bytes ≤ 1,610,000  | Write overhead ≤ 1.6%        |
| 5     | Index bytes ≤ 0, estimated latency ≤ 26 ms         | Write overhead ≤ 0%      | Rows examined ≤ 100,000      |
| 6     | Rows examined ≤ 1, write overhead ≤ 50%            | Index bytes ≤ 12,100,000 | Estimated latency ≤ 0.43 ms  |

## Authoring and acceptance procedure

1. Put the catalog, ordered IDs, level JSON and the runtime correctness fixtures under `src/content/`. Keep reference index selections, intentionally losing selections and golden assertions in a test-only directory. Use fixture data and field names accepted by the domain schema.
2. First implement level 1. Use its tested JSON and fixture as the template. Include level 2 in the first content handoff. Then levels 3–4 and 5–6 may be authored independently in separate files. Appoint one person to update the ordered catalog.
3. Run the actual deterministic simulator with **every subset** of allowed indexes (at most eight per level). Record selected plan, examined rows, estimated latency, editable index bytes, write overhead, correctness and all objective outcomes. Evaluate the initial state separately even if its selection repeats another row.
4. Translate qualitative bounds above into numeric constants in each level JSON. To cap a metric between a known passing value G and a failing value B with G < B, choose a representable threshold T with G ≤ T < B. Run the harness again. When no such gap exists, adjust the scenario metadata and rerun. Compare unrounded engine metrics for pass/fail; format them for players with enough precision to explain close calls.
5. Set silver and gold objectives using measured outputs and the engine scoring contract. Give the best efficient reference path three stars. A single-solution tutorial may award all three for that solution. Verify no hint changes a run's metrics or score.
6. Commit the reviewed golden outputs with model and level versions. Lock in the solution, the tempting failure, and each tiny result fixture. A changed expected plan or result needs a fresh ranking review before refreshing goldens. Never copy estimated fixture numbers into UI components.
7. Have a second agent play each level from its brief without the solution, first with keyboard controls and then at phone width. Verify reset, all three hints, a failed run explaining the unmet constraint and disabling Submit, a passing submission, best-score preservation and the next unlock. After level 6, the completion action returns to the finished catalog. Verify the whole six-level run works offline after caching.
