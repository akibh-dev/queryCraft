import type { CampaignEntry } from "../../content";
import type {
  Completion,
  LevelDefinition,
  SimulationResult,
} from "../../domain";
import { checkCorrectness, evaluateObjectives, simulate } from "../../engine";
import {
  actionClassName,
  CheckCircleIcon,
  LockIcon,
  MapIcon,
  Panel,
  PlanIcon,
  PlayIcon,
  StarIcon,
} from "../../ui";
import {
  checkValue,
  formatNumber,
  target,
  verdict,
} from "../challenge/results";
import styles from "./campaign.module.css";

type CampaignProps = {
  catalog: readonly CampaignEntry[];
  completions: readonly Completion[];
};
function path(level: LevelDefinition) {
  return `/levels/${level.id}`;
}
function compatible(level: LevelDefinition, record: Completion) {
  return (
    record.levelId === level.id &&
    record.modelVersion === level.modelVersion &&
    record.levelVersion === level.levelVersion
  );
}

export function Landing({ catalog, completions }: CampaignProps) {
  const tutorial = catalog[0]?.level;
  if (!tutorial) return <p>No campaign levels are available.</p>;
  const completed = new Set(completions.map((record) => record.levelId));
  const next = catalog.find(({ level }) => !completed.has(level.id));
  const baseline = simulate(tutorial, {
    selectedIndexIds: tutorial.initialIndexIds,
  });
  const option = tutorial.indexOptions.find(
    (index) => index.column === tutorial.referenceQuery.predicates[0]?.column,
  );
  const indexed =
    option && simulate(tutorial, { selectedIndexIds: [option.id] });
  return (
    <div className={styles.landing}>
      <div className={styles.intro}>
        <p>
          Choose indexes for a slow SQL query and discover what faster reads
          cost in storage and writes.
        </p>
        <div className={styles.actions}>
          <a
            href={next ? path(next.level) : "/levels"}
            className={actionClassName()}
          >
            <PlayIcon />
            {next
              ? completed.size
                ? "Continue"
                : "Play"
              : "View completed levels"}
          </a>
          {next && (
            <a href="/levels" className={actionClassName("secondary")}>
              <MapIcon />
              View levels
            </a>
          )}
        </div>
        <p className={styles.note}>Progress stays on this device.</p>
      </div>
      <Panel className={styles.plan}>
        <h2>
          <PlanIcon /> Tutorial plan preview
        </h2>
        <p>{tutorial.title}</p>
        <PlanResult
          label="Baseline"
          result={baseline}
          maxRows={tutorial.table.rowCount}
        />
        {indexed && (
          <PlanResult
            label={`With an index on ${option.column}`}
            result={indexed}
            maxRows={tutorial.table.rowCount}
          />
        )}
      </Panel>
    </div>
  );
}

function PlanResult({
  label,
  result,
  maxRows,
}: {
  label: string;
  result: SimulationResult;
  maxRows: number;
}) {
  return (
    <div className={styles.planRow}>
      <h3>{label}</h3>
      <p>{result.selectedPlan.steps[0]}</p>
      <progress
        className={styles.track}
        aria-hidden="true"
        max={Math.max(1, maxRows)}
        value={result.metrics.rowsExamined}
      />
      <p className={styles.numeric}>
        {formatNumber(result.metrics.rowsExamined)} rows examined ·{" "}
        {formatNumber(result.metrics.estimatedLatencyMs)} estimated ms
      </p>
    </div>
  );
}

export function LevelMap({ catalog, completions }: CampaignProps) {
  const completed = new Set(completions.map((record) => record.levelId));
  const worlds = [...new Set(catalog.map(({ level }) => level.worldId))];
  const count = catalog.filter(({ level }) => completed.has(level.id)).length;
  return (
    <div className={styles.screen}>
      <p className={styles.progress}>
        {count} of {catalog.length} complete
      </p>
      {worlds.map((world) => (
        <section key={world} className={styles.group}>
          <h2>{world.replace(/^w(\d+)$/, "World $1")}</h2>
          <ol className={styles.levels}>
            {catalog.map(({ level }, index) => {
              if (level.worldId !== world) return null;
              const best = completions.find((record) =>
                compatible(level, record),
              );
              const older = completions.filter(
                (record) =>
                  record.levelId === level.id && !compatible(level, record),
              );
              const previous = catalog[index - 1]?.level;
              const locked =
                !!previous &&
                !completed.has(previous.id) &&
                !completed.has(level.id);
              const done = completed.has(level.id);
              return (
                <li
                  key={level.id}
                  className={styles.row}
                  data-current={!locked && !done}
                >
                  <div className={styles.rowHeading}>
                    <h3>{level.title}</h3>
                    <span className={styles.status}>
                      {locked ? (
                        <LockIcon />
                      ) : done ? (
                        <CheckCircleIcon />
                      ) : (
                        <PlayIcon />
                      )}
                      {locked ? "Locked" : done ? "Complete" : "Available"}
                    </span>
                  </div>
                  <p className={styles.note}>{level.conceptTags.join(" · ")}</p>
                  {best && (
                    <p className={styles.stars}>
                      <StarIcon />
                      Best · {best.stars} of 3 stars
                    </p>
                  )}
                  {older.map((record) => (
                    <p
                      key={`${record.levelVersion}/${record.modelVersion}`}
                      className={styles.note}
                    >
                      Historical · {record.stars} of 3 stars ·{" "}
                      {record.modelVersion}, level v{record.levelVersion}
                    </p>
                  ))}
                  {locked ? (
                    <p className={styles.note}>
                      Complete {previous.title} to unlock.
                    </p>
                  ) : (
                    <a
                      className={actionClassName(
                        done ? "secondary" : "primary",
                      )}
                      href={path(level)}
                    >
                      {done ? "Replay" : "Open level"}
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

export function Debrief({
  entry,
  record,
  next,
}: {
  entry: CampaignEntry;
  record?: Completion;
  next?: CampaignEntry;
}) {
  const { level, fixture } = entry;
  if (!record || !compatible(level, record))
    return (
      <div className={styles.screen}>
        <p>Complete {level.title} to see your result here.</p>
        <div className={styles.actions}>
          <a className={actionClassName()} href={path(level)}>
            Open level
          </a>
          <a href="/levels">Back to level map</a>
        </div>
      </div>
    );
  const baseline = simulate(level, { selectedIndexIds: level.initialIndexIds });
  const result = simulate(level, { selectedIndexIds: record.selectedIndexIds });
  const evaluation = evaluateObjectives(
    level,
    baseline,
    result,
    checkCorrectness(level, fixture),
  );
  const metrics = [
    ["Estimated latency", "estimatedLatencyMs", "ms"],
    ["Rows examined", "rowsExamined", "rows"],
    ["Index storage", "indexStorageBytes", "bytes"],
    ["Write overhead", "writeOverheadPct", "%"],
  ] as const;
  return (
    <div className={styles.screen}>
      <section className={styles.summary}>
        <div>
          <h2>{level.title}</h2>
          <p className={styles.stars}>
            <StarIcon />
            {evaluation.stars} of 3 stars
          </p>
        </div>
        <p>{level.lesson}</p>
      </section>
      <div className={styles.debrief}>
        <Panel className={styles.panel}>
          <h2>Query performance</h2>
          <p>{result.selectedPlan.steps.join(" → ")}</p>
          <div className={styles.tableScroll}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Metric</th>
                  <th scope="col">Baseline</th>
                  <th scope="col">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map(([label, k, unit]) => (
                  <tr key={k}>
                    <th scope="row">{label}</th>
                    <td>
                      {formatNumber(baseline.metrics[k])} {unit}
                    </td>
                    <td>
                      {formatNumber(result.metrics[k])} {unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel className={styles.panel}>
          <h2>Objectives</h2>
          <p>Sample rows · {evaluation.correct ? "Verified" : "Failed"}</p>
          <ul className={styles.checks}>
            {evaluation.checks.map((check) => (
              <li key={`${check.tier}-${target(check.objective)}`}>
                <strong>{target(check.objective)}</strong>
                <span>
                  {check.tier} · {checkValue(check)} · {verdict(check)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className={styles.actions}>
        <a
          className={actionClassName()}
          href={next ? path(next.level) : "/levels"}
        >
          {next ? "Next level" : "View completed levels"}
        </a>
        <a className={actionClassName("secondary")} href={path(level)}>
          Replay
        </a>
        {next && <a href="/levels">Level map</a>}
      </div>
    </div>
  );
}
