# Build the player interface

Use this guide when implementing or reviewing a screen. All player-facing numbers, objectives, action names, SQL and explanations come from the level definition or simulation result. Use the same fixture records for mock screens and the connected UI. Keep React views independent of the formulas.

## The first five minutes

1. The player chooses **Play** on the landing page and enters the first available puzzle. Returning players see **Continue** and a link to the level map.
2. The challenge opens with a brief describing a slow email lookup, its objectives and a baseline plan. The SQL is readable and selectable. The schema explains that the table has one million virtual users and that each email is unique.
3. The player inspects the allowed indexes. Selecting an index changes the draft. **Run simulation** evaluates it. The results show how rows examined, estimated latency, index storage and write overhead changed.
4. If a constraint fails, show which one and by how much. Let the player edit and rerun immediately, or reveal one hint. If all hard constraints and correctness pass, enable **Submit solution**.
5. On submission the debrief explains the outcome, records the best result and offers the next unlocked puzzle. Completion on the last puzzle returns the player to the completed map.

## Visual foundation

Use a quiet database operations console. A single teal accent identifies actions and selection. Place the incident title, objective and Run action above decorative detail. Draw the identity mark as a simple stack of three offset database pages next to the word **QueryCraft**. Keep the wordmark as live text. A functional plan visualization provides the landing artwork.

| CSS token          | Dark    | Light   | Use                                 |
| ------------------ | ------- | ------- | ----------------------------------- |
| `--canvas`         | #10161A | #F3F6F5 | App background                      |
| `--panel`          | #182126 | #FFFFFF | Panels                              |
| `--inset`          | #202D32 | #EAF0EF | Code block, selected row field      |
| `--text`           | #F1F6F4 | #142024 | Body and headlines                  |
| `--muted`          | #B0C1C2 | #455C60 | Units, descriptions                 |
| `--rule`           | #405156 | #C2D0CE | Decorative dividers                 |
| `--control-border` | #849B9B | #677C7D | Interactive boundaries              |
| `--accent`         | #66DFCA | #00685B | Links, primary fills, focus         |
| `--on-accent`      | #092721 | #FFFFFF | Primary button text                 |
| `--success`        | #8CE0A6 | #17683C | Met objective with check            |
| `--warning`        | #F1C979 | #785100 | Unmet target with label             |
| `--error`          | #FFABA3 | #A42E2B | Failed operation with recovery text |

- Use locally bundled Inter or a system sans fallback for UI, IBM Plex Mono or a system monospace fallback for code and numbers. Core rendering and offline play must work with fallback fonts. Enable tabular numerals in comparisons.
- Type sizes in rem, assuming a 16 px base: page heading 2 (2.5 for landing), section title 1.25, body 1, secondary text and code 0.875. Body line height 1.5. Cap reading width near 65 characters. Allow zoom and wrapping.
- Spacing scale in px equivalents: 4, 8, 12, 16, 24, 32, 48. Use 12 px panel corners, 8 px control corners, 1 px boundaries, and 44 px minimum touch targets. Use a 2 px focus-visible outline with a 3 px gap. Verify contrast for actual adjacent colors in both themes.
- Default to dark on first use. Offer Dark, Light and System in settings. Respect the system reduced-motion preference automatically and allow an explicit reduced-motion override. Show plan steps in their final state under reduced motion. The default experience works silently.
- Give primary buttons four visual treatments: idle filled, hover darker or lighter with a discernible boundary, pressed with inset outline, and disabled with a visible reason beside the action. Keep keyboard focus visible in forced colors. Avoid using opacity alone for disabled text.

## Icon inventory

Use one local family of 24-unit outline symbols, 1.75–2 unit rounded strokes, `currentColor`, typically displayed at 18–20 px. An agent can use local Lucide icons under their license, or implement the simple listed shapes as one consistent set. Keep asset credits with the project. Import only symbols actually used.

| Meaning                 | Shape                                                   | Required label or behavior                                    |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| Navigation and location | Map, settings gear, info circle, left arrow             | Levels, Settings, Model assumptions, Back                     |
| Inspect data            | Table grid, code brackets, branching tree               | Schema, SQL, Query plan                                       |
| Experiment              | Play triangle, split columns, circular arrow, lightbulb | Run simulation, Compare runs, Reset attempt, Show hint        |
| Outcome                 | Check circle, outlined warning triangle, lock, star     | Met, Above target or Below target, Locked, “2 of 3 stars”     |
| Progress controls       | Download, upload, trash, copy                           | Export progress, Import progress, Clear progress, Copy result |

Icons next to text are decorative and hidden from assistive technology. Give any icon-only close button a visible focus ring and accessible name. Use one text announcement for a set of stars and hide individual star shapes. Use “rows examined increased” or “storage decreased” next to a delta. An upward arrow alone does not communicate whether a change helps meet the objective.

## Screen inventory

| Screen        | Elements and actions                                                                                                                                                                                                                                                                                           | Empty, edge or completion state                                                                                                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Landing       | Compact header with brand, Levels, Settings. H1 “Make a slow query faster.” One sentence explaining the game, Play or Continue, note that progress stays on this device. Show the tutorial’s baseline and optimized plan as an illustrative preview with an explicit Reveal or Skip control for any animation. | On a first visit, Play goes straight to the tutorial. After all levels are complete, the main link opens the map for replay.                                                                                                         |
| Level map     | Group the six shipped levels using the campaign metadata. Each item shows its actual title, concept, status and best compatible stars. An unlocked level has an Open action. Include “N of 6 complete.”                                                                                                        | Show the prerequisite in text on each locked entry. Current, complete, locked and historical records are visually distinguishable. An invalid or locked deep link gives the reason and a link to an available level.                 |
| Challenge     | One H1 with the incident name, current position in the campaign and a Levels link. See the workspace description below.                                                                                                                                                                                        | On a level data or simulation error, preserve navigation and show Retry or Back to levels. A data error produces no completion record.                                                                                               |
| Debrief       | Title “Level complete”, star count, goal outcomes, before/after values, cause, and one cost of the chosen solution. Order actions as Next level, Replay, Level map. An optional share card previews the level, stars and model version, then copies a plain-text summary on player request.                    | On the final level, primary action becomes View completed levels. When clipboard access fails, show the selectable summary. Opening without an eligible result offers the level/map.                                                 |
| Settings      | Theme, motion, progress export/import and local reset. Describe what local storage contains and what clearing it does. Include a sound toggle only if sounds ship.                                                                                                                                             | Show validation errors beside Import. Preview valid import changes and follow the persistence contract before applying. Confirm global clear with Cancel focused first, return focus afterwards. Reset attempt is a separate action. |
| About / Model | Plain-language explanation of virtual table metadata, sample correctness fixtures, supported plans, assumptions, estimated units, and game/model versions. Link from the plan explanation and app navigation.                                                                                                  | Readable offline. Returning to a running challenge should preserve the draft for that session.                                                                                                                                       |

Sandbox belongs to the later sandbox release. The launch map includes only authored, playable campaign content.

## Challenge layout by width

Desktop (at least 1200 CSS px): center the page within 1600 px. Use a full-width header, then three columns with approximate proportions 25/38/37 and 16 px gaps. Left column holds incident, workload, objectives and hints. Middle holds SQL, schema and index controls. Right holds plan, metric table and explanation. A bottom action row contains Run simulation, Compare runs, Reset attempt and Submit solution. Allow the document to scroll naturally.

Tablet (768–1199 px): brief spans the full row. The editor and results use two columns below it when both fit. At smaller widths in this range, stack the result panel below the controls. Long identifiers and SQL must not widen the document.

Phone (below 768 px): show incident title, objective summary, then labeled Brief, Workbench and Results tabs. Start on Workbench with the goal visible. Keep the three sections' data when switching. After an explicit Run, select Results and announce the outcome once. Keep Run or Submit reachable in a bottom action bar with safe-area padding and enough scroll padding for the last control. Place Compare runs and Reset attempt in the appropriate panel. At 320 px width allow wrapped labels and controls; local horizontal scroll is acceptable for wide code or data tables. When using ARIA tabs, implement arrow keys, Home/End, one tab stop, selected state, and a named tab panel.

## Workspace elements

| Element                 | Implementation                                                                                                                                                                                                                                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Incident and objectives | Briefly explain what the application user is waiting for. Show each constraint in its original units, threshold, current value, and status. Initial heading is “Baseline”. Correctness is always a hard requirement.                                                                                                                     |
| SQL and schema          | Use a selectable, read-only code block with line wrapping or its own scroll area. A schema disclosure shows table name, column, type, existing index and distribution where relevant. Label virtual row counts and the small sample rows distinctly.                                                                                     |
| Index controls          | Use native checkboxes for independent allowed actions and radio buttons for mutually exclusive choices. Label controls with table and column, show existing fixed indexes as plain text, and describe storage or write effects in one sentence.                                                                                          |
| Hints                   | Reveal the next of three authored hints on demand. Keep revealed hints visible. At the last hint, show “All hints shown”. Hints never block submission.                                                                                                                                                                                  |
| Plan and explanation    | Render the selected plan steps as a semantic ordered list with visual connectors. Example sequence: “B-tree lookup on users.email” then “Fetch matching row”. Show the engine’s causal explanation, assumptions link and model version.                                                                                                  |
| Metric comparison       | Use a table with row headers and Baseline, This run, Change columns. Display estimated latency, rows examined, logical pages read, index storage and write overhead with units from the model. Compute display deltas from comparable raw results. Preserve full precision for pass/fail. With a zero baseline, show an absolute change. |
| Run history             | Compare baseline and latest evaluated run by default. If previous runs are offered, identify each by choices or run number. Compare records only from the same level and model version. A fresh draft must never appear as an evaluated result.                                                                                          |

## State and copy checklist

| Trigger                         | Visible state                                                                                                                    | Available action                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| First entry or reset            | Show the computed baseline, allowed defaults and objective status.                                                               | Run the baseline explicitly or change a choice.                                |
| Edit following a run            | Preserve last evaluated metrics, label “Choices changed. Run again to update results.”                                           | Run enabled, Submit disabled.                                                  |
| Run pressed                     | Snapshot the draft and evaluate it. Prevent duplicate actions while pending; synchronous work needs no artificial loading delay. | Restore controls when resolved. Ignore obsolete responses after level changes. |
| Evaluated, goal missed          | State the first failed requirement and its actual value, for example “Index storage exceeds the level budget by {delta} {unit}.” | Change choices, compare the run, reveal a hint or reset.                       |
| Evaluated, goals met            | Display “All objectives met” and make Submit solution the primary action.                                                        | Submit once, compare, or continue experimenting.                               |
| Reset attempt                   | Restore the authored starting choices and baseline for this level. Previously earned progress survives.                          | A short status announcement confirms reset.                                    |
| Browser storage unavailable     | Let play continue. Show “Progress is available for this session. Export it to keep a copy.” only if export is available.         | Export or continue.                                                            |
| Invalid import                  | Identify the issue, such as unsupported format or oversized file. Preserve existing progress.                                    | Choose another file.                                                           |
| Offline after assets are cached | Keep play, comparison, model details and progress available.                                                                     | No network prompt should interrupt play.                                       |

## Acceptance walkthrough

1. At 1440 × 900, 768 × 1024 and 360 × 800, reach every primary action and read all objective units. Also try 320 CSS px and 200% browser zoom. Focused controls remain visible above the bottom bar and SQL cannot create page-wide overflow.
2. Using keyboard only, go from landing through a failed run, hint, winning run and submission. Escape closes any dialog and restores focus to its trigger. Focus the destination heading on navigation. Announce outcomes in one polite status region; keep the metrics table available for explicit reading.
3. Check light, dark, reduced motion and forced colors. Goal status, lock state, stars and plan order remain understandable with colors or animation removed. Verify text contrast of at least 4.5:1 for regular text and 3:1 for large text; test meaningful control boundaries and focus indicators at 3:1.
4. Check against the engine fixture: displayed plan, units, correctness, pass/fail, stars and explanation agree. A stale run cannot be submitted. Resetting a replay leaves its best score intact. After completing the last level there is no dead Next button.
5. Hand off desktop and phone screenshots of the same fixture, one keyboard walkthrough result, and any unresolved accessibility or content issue to the integration owner.
