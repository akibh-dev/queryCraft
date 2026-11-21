import { useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  type Evaluation,
  type Fixture,
  formatQuery,
  type LevelDefinition,
  type SimulationResult,
} from "../../domain";
import { checkCorrectness, evaluateObjectives, simulate } from "../../engine";
import {
  Button,
  CheckCircleIcon,
  ChoiceField,
  CodeIcon,
  FieldGroup,
  HintIcon,
  Panel,
  PlayIcon,
  ResetIcon,
} from "../../ui";
import {
  type ChallengeDraft,
  canSubmit,
  initialDraft,
  toggleIndex,
} from "./draft";
import {
  checkValue,
  formatNumber,
  ResultPanel,
  target,
  verdict,
} from "./results";
import styles from "./workspace.module.css";

export type ChallengeProps = {
  level: LevelDefinition;
  fixture: Fixture;
  draft: ChallengeDraft;
  onChange: (draft: ChallengeDraft) => void;
  onSubmit: (result: SimulationResult, evaluation: Evaluation) => void;
  position?: number;
  total?: number;
  submitting?: boolean;
};
const phoneQuery = "(max-width: 767px)";
function subscribeWidth(change: () => void) {
  const media = window.matchMedia(phoneQuery);
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
}
const tabs = ["Brief", "Workbench", "Results"] as const;
type Tab = (typeof tabs)[number];

export function Challenge({
  level,
  fixture,
  draft,
  onChange,
  onSubmit,
  position,
  total,
  submitting = false,
}: ChallengeProps) {
  const [tab, setTab] = useState<Tab>("Workbench");
  const [comparing, setComparing] = useState(false);
  const [notice, setNotice] = useState("");
  const phone = useSyncExternalStore(
    subscribeWidth,
    () => window.matchMedia(phoneQuery).matches,
    () => false,
  );
  const tabGroup = useRef<HTMLDivElement>(null);
  const tabPrefix = useId();
  const baseline = useMemo(
    () => simulate(level, { selectedIndexIds: level.initialIndexIds }),
    [level],
  );
  const correct = useMemo(
    () => checkCorrectness(level, fixture),
    [level, fixture],
  );
  const current = draft.lastRun ?? baseline;
  const evaluation = useMemo(
    () => evaluateObjectives(level, baseline, current, correct),
    [level, baseline, current, correct],
  );
  const ready = canSubmit(draft, evaluation) && !submitting;
  const reason = draft.stale
    ? "Choices changed. Run again to update results."
    : !draft.lastRun
      ? "Run the simulation before submitting."
      : !evaluation.passed
        ? "Meet the mandatory objectives before submitting."
        : undefined;
  function run() {
    const next = simulate(level, { selectedIndexIds: draft.selectedIndexIds });
    const score = evaluateObjectives(level, baseline, next, correct);
    onChange({ ...draft, lastRun: next, stale: false });
    const failure = score.firstFailure;
    setNotice(
      score.passed
        ? "All objectives met."
        : failure?.kind === "objective"
          ? `${target(failure.check.objective)}. ${verdict(failure.check)}.`
          : "The query returned unexpected rows.",
    );
    setTab("Results");
  }
  function reset() {
    onChange({ ...initialDraft(level), hintsShown: draft.hintsShown });
    setNotice("Attempt reset to baseline.");
    setComparing(false);
    setTab("Workbench");
  }
  function panelProps(name: Tab) {
    return phone
      ? {
          role: "tabpanel",
          id: `${tabPrefix}-panel-${name}`,
          "aria-labelledby": `${tabPrefix}-tab-${name}`,
          hidden: tab !== name,
        }
      : {};
  }
  return (
    <div className={styles.workspace}>
      {position && total && (
        <p>
          Level {position} of {total}
        </p>
      )}
      <p className={styles.goal}>{level.objectives.map(target).join(" · ")}</p>
      {phone && (
        <div
          className={styles.tabs}
          role="tablist"
          aria-label="Challenge sections"
          ref={tabGroup}
        >
          {tabs.map((name, i) => (
            <button
              key={name}
              type="button"
              role="tab"
              id={`${tabPrefix}-tab-${name}`}
              aria-controls={`${tabPrefix}-panel-${name}`}
              aria-selected={tab === name}
              tabIndex={tab === name ? 0 : -1}
              onClick={() => setTab(name)}
              onKeyDown={(event) => {
                const next = {
                  ArrowRight: (i + 1) % 3,
                  ArrowLeft: (i + 2) % 3,
                  Home: 0,
                  End: 2,
                }[event.key];
                if (next === undefined) return;
                event.preventDefault();
                setTab(tabs[next]);
                tabGroup.current?.querySelectorAll("button")[next]?.focus();
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div className={styles.columns}>
        <Panel className={styles.section} {...panelProps("Brief")}>
          <h2>Incident brief</h2>
          <p>{level.description}</p>
          <h3>Workload</h3>
          <p>
            {formatNumber(level.workload.readsPerSecond)} reads,{" "}
            {formatNumber(level.workload.insertsPerSecond)} inserts and{" "}
            {formatNumber(level.workload.updatesPerSecond)} updates per second.
          </p>
          <h3>Objectives</h3>
          <p>
            {correct
              ? "Correctness verified on sample rows."
              : "Sample row check failed."}
          </p>
          <ul className={styles.objectives}>
            {evaluation.checks.map((check) => (
              <li
                key={`${check.tier}-${check.objective.metric}-${check.objective.value}`}
              >
                <strong>{target(check.objective)}</strong>
                <span>
                  {check.tier} · {draft.lastRun ? "Latest run" : "Baseline"}{" "}
                  {checkValue(check)}
                </span>
                <span data-met={check.passed}>{verdict(check)}</span>
              </li>
            ))}
          </ul>
          {draft.hintsShown > 0 && (
            <ol>
              {level.hints.slice(0, draft.hintsShown).map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ol>
          )}
          {draft.hintsShown < level.hints.length ? (
            <Button
              variant="secondary"
              onClick={() =>
                onChange({ ...draft, hintsShown: draft.hintsShown + 1 })
              }
            >
              <HintIcon />
              Show hint
            </Button>
          ) : (
            <p>All hints shown</p>
          )}
        </Panel>
        <Panel className={styles.section} {...panelProps("Workbench")}>
          <h2>
            <CodeIcon />
            SQL
          </h2>
          <pre className={styles.sql}>
            <code>{formatQuery(level.referenceQuery)}</code>
          </pre>
          <details>
            <summary>Schema · {level.table.name}</summary>
            <p>
              {formatNumber(level.table.rowCount)} virtual rows ·{" "}
              {fixture.rows.length} sample rows
            </p>
            <ul>
              {level.table.columns.map((c) => (
                <li key={c.name}>
                  <code>{c.name}</code> · {c.type} ·{" "}
                  {formatNumber(c.distribution.distinctCount)} distinct ·{" "}
                  {c.distribution.kind}
                  {level.table.fixedIndexes.some((idx) => idx.column === c.name)
                    ? " · fixed index"
                    : ""}
                </li>
              ))}
            </ul>
          </details>
          <FieldGroup
            legend="Optional indexes"
            description="Each selected index uses storage and adds work to writes."
          >
            {level.indexOptions.map((index) => (
              <ChoiceField
                key={index.id}
                type="checkbox"
                label={`${level.table.name}.${index.column}`}
                checked={draft.selectedIndexIds.includes(index.id)}
                onChange={() => {
                  onChange(toggleIndex(draft, index.id));
                  setNotice(
                    draft.lastRun
                      ? "Choices changed. Run again to update results."
                      : "",
                  );
                }}
              />
            ))}
          </FieldGroup>
          <Button variant="secondary" onClick={reset}>
            <ResetIcon />
            Reset attempt
          </Button>
        </Panel>
        <Panel className={styles.section} {...panelProps("Results")}>
          <ResultPanel
            baseline={baseline}
            result={current}
            ran={!!draft.lastRun}
            comparing={comparing}
            onCompare={() => setComparing(!comparing)}
          />
        </Panel>
      </div>
      <p role="status" className={styles.notice}>
        {notice}
      </p>
      <div className={styles.actions}>
        <Button
          variant={ready ? "secondary" : "primary"}
          onClick={run}
          disabled={submitting}
        >
          <PlayIcon />
          Run simulation
        </Button>
        <div>
          <Button
            variant={ready ? "primary" : "secondary"}
            disabled={!ready}
            aria-describedby={reason ? `${tabPrefix}-reason` : undefined}
            onClick={() => {
              if (ready && draft.lastRun) onSubmit(draft.lastRun, evaluation);
            }}
          >
            <CheckCircleIcon />
            Submit solution
          </Button>
        </div>
        {reason && (
          <span id={`${tabPrefix}-reason`} className={styles.reason}>
            {reason}
          </span>
        )}
      </div>
    </div>
  );
}
