import type {
  Metrics,
  Objective,
  ObjectiveCheck,
  SimulationResult,
} from "../../domain";
import { Button, CompareIcon, PlanIcon } from "../../ui";
import styles from "./workspace.module.css";

const definitions = {
  estimatedLatencyMs: ["Estimated latency", "ms"],
  rowsExamined: ["Rows examined", "rows"],
  logicalPages: ["Logical pages read", "pages"],
  indexStorageBytes: ["Index storage", "bytes"],
  writeOverheadPct: ["Write overhead", "%"],
  latencyReductionPct: ["Latency reduction", "%"],
} as const;

const number = new Intl.NumberFormat("en", { maximumFractionDigits: 6 });
export const formatNumber = (value: number) => number.format(value);
type Metric = keyof typeof definitions;
function amount(value: number, metric: Metric) {
  const unit = definitions[metric][1];
  return `${formatNumber(value)}${unit === "%" ? "" : " "}${unit}`;
}
export function target(objective: Objective) {
  return `${definitions[objective.metric][0]} ${objective.comparator === "<=" ? "≤" : "≥"} ${amount(objective.value, objective.metric)}`;
}
export function verdict(check: ObjectiveCheck) {
  if (check.passed) return "Met";
  const { metric, value, comparator } = check.objective;
  const gap = Math.abs(value - check.actual);
  const difference =
    metric === "latencyReductionPct" || metric === "writeOverheadPct"
      ? `${formatNumber(gap)} percentage points`
      : amount(gap, metric);
  return `${comparator === "<=" ? "Above" : "Below"} target by ${difference}`;
}
export function checkValue(check: ObjectiveCheck) {
  return amount(check.actual, check.objective.metric);
}
const comparisonMetrics = [
  "estimatedLatencyMs",
  "rowsExamined",
  "logicalPages",
  "indexStorageBytes",
  "writeOverheadPct",
] as const;
function metricValue(
  metrics: Metrics,
  metric: (typeof comparisonMetrics)[number],
) {
  return metric === "logicalPages"
    ? metrics.sequentialPagesRead + metrics.randomPagesRead
    : metrics[metric];
}

export function ResultPanel({
  baseline,
  result,
  ran,
  comparing,
  onCompare,
}: {
  baseline: SimulationResult;
  result: SimulationResult;
  ran: boolean;
  comparing: boolean;
  onCompare: () => void;
}) {
  const metrics = result.metrics;
  return (
    <>
      <h2>
        <PlanIcon />
        {ran ? "Latest run" : "Baseline"}
      </h2>
      <ol className={styles.steps}>
        {result.selectedPlan.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p>
        {result.selectedPlan.kind === "scan"
          ? "Scanning the table"
          : "Using the selected lookup"}{" "}
        has the lowest estimated cost among the available plans. This plan reads{" "}
        {formatNumber(metrics.sequentialPagesRead)} sequential and{" "}
        {formatNumber(metrics.randomPagesRead)} random pages.
      </p>
      <section
        className={styles.scroll}
        aria-label="Estimated metrics table"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need focus to scroll the metrics.
        tabIndex={0}
      >
        <table>
          <caption>Estimated metrics</caption>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">Baseline</th>
              {ran && (
                <>
                  <th scope="col">This run</th>
                  <th scope="col">Change</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {comparisonMetrics.map((metric) => {
              const prior = metricValue(baseline.metrics, metric);
              const current = metricValue(metrics, metric);
              const delta = current - prior;
              return (
                <tr key={metric}>
                  <th scope="row">{definitions[metric][0]}</th>
                  <td>{amount(prior, metric)}</td>
                  {ran && (
                    <>
                      <td>{amount(current, metric)}</td>
                      <td>
                        {delta === 0
                          ? "Unchanged"
                          : `${delta > 0 ? "Increased" : "Decreased"} by ${amount(Math.abs(delta), metric)}`}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <Button variant="secondary" aria-expanded={comparing} onClick={onCompare}>
        <CompareIcon />
        Compare runs
      </Button>
      {comparing && (
        <div>
          <h3>Candidate plans</h3>
          {[
            { name: "Baseline", run: baseline },
            ...(ran ? [{ name: "This run", run: result }] : []),
          ].map(({ name, run }) => (
            <div key={name}>
              <strong>{name}</strong>
              <ul>
                {run.alternatives.map(({ plan, estimatedCostUnits }) => (
                  <li key={plan.kind === "scan" ? "scan" : plan.indexId}>
                    {plan.steps[0]} · {formatNumber(estimatedCostUnits)} cost
                    units
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <p>
        Model {result.modelVersion} · <a href="/model">Model assumptions</a>
      </p>
    </>
  );
}
