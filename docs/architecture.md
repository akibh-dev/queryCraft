# Architecture and accessibility

QueryCraft ships as static HTML, JavaScript, CSS and icons with a service worker. The browser performs the simulation and stores progress. There is no account, database connection or server-side scoring. SQL displayed in the workbench comes from structured level data.

| Path                        | Responsibility                                                     |
| --------------------------- | ------------------------------------------------------------------ |
| `src/domain`                | Runtime schemas, SQL formatting and versioned contracts            |
| `src/content`               | Ordered campaign, authored JSON and fixtures                       |
| `src/engine`                | Plan selection, fixture correctness and scoring                    |
| `src/features`              | Challenge, campaign and preferences views                          |
| `src/storage`               | Browser persistence, import validation and in-memory fallback      |
| `scripts/build-offline.mjs` | Precache list and service worker generation from production assets |

## Keyboard and mobile use

Use the skip link to reach main content and Tab to move between actions and index controls. On the mobile workbench, Left and Right Arrow move between tabs. Home and End select the first and last tabs. Run announces the result through a live status region. The game offers dark, light and system themes, and follows system reduced-motion settings with a separate preference to reduce motion.

The browser suite checks keyboard operation, narrow layouts, enlarged text, focus restoration, stale attempts and saved progress. See the release record for the scope of completed verification. [Release record](release.md)

## Offline and local data

Open the production site online once and allow its service worker to finish caching. A first-ever offline visit requires an existing cache for that origin. An updated build can stay waiting while another QueryCraft tab is open. Finish the attempt and follow the update message when ready.

Progress is specific to the browser profile and origin. Export progress from Settings before switching browsers or clearing site data. The importer supports valid files up to 256 KiB and checks schema and level compatibility before applying changes. [Save format](../plan/03-engine-and-contracts.md#save-boundary)

## Asset credits

The interface SVGs in `src/ui/icons.tsx` and the application marks in `public/icons` are QueryCraft artwork. The app uses fonts installed on the device with system fallbacks. Dependency licenses are distributed with the relevant packages. The owner’s project license decision is recorded as pending in the release record.
