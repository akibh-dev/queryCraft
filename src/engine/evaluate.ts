import { z } from "zod";
import {
  type Evaluation,
  type Fixture,
  type LevelDefinition,
  type Objective,
  type ObjectiveCheck,
  type SimulationResult,
  simulationResultSchema,
  validateFixture,
} from "../domain";

export function checkCorrectness(
  level: LevelDefinition,
  input: Fixture,
): boolean {
  const fixture = validateFixture(level, input);
  const { select, predicates } = level.referenceQuery;
  const counts = new Map<string, number>();
  for (const expected of fixture.expectedRows) {
    const key = JSON.stringify(expected);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const row of fixture.rows) {
    const matches = predicates.every((p) => {
      const value = row[p.column];
      if (value === null) return false;
      if (p.op === "eq") return value === p.value;
      return (
        typeof value === "number" &&
        (p.gte === undefined || value >= p.gte) &&
        (p.lt === undefined || value < p.lt)
      );
    });
    if (!matches) continue;
    const key = JSON.stringify(select.map((column) => row[column]));
    const count = counts.get(key);
    if (!count) return false;
    if (count === 1) counts.delete(key);
    else counts.set(key, count - 1);
  }
  return counts.size === 0;
}

export function evaluateObjectives(
  level: LevelDefinition,
  baseline: SimulationResult,
  result: SimulationResult,
  correct: boolean,
): Evaluation {
  for (const run of [baseline, result]) {
    simulationResultSchema.parse(run);
    if (
      run.levelId !== level.id ||
      run.levelVersion !== level.levelVersion ||
      run.modelVersion !== level.modelVersion
    )
      throw new z.ZodError([
        {
          code: "custom",
          path: ["levelVersion"],
          message: "Both runs must belong to the same level and model version.",
        },
      ]);
  }
  const initialIds = [...level.initialIndexIds].sort();
  if (
    baseline.selectedIndexIds.length !== initialIds.length ||
    !initialIds.every((id, index) => baseline.selectedIndexIds[index] === id)
  )
    throw new z.ZodError([
      {
        code: "custom",
        path: ["baseline", "selectedIndexIds"],
        message: "Baseline must use the initial selection.",
      },
    ]);
  const reduction =
    (100 *
      (baseline.metrics.estimatedLatencyMs -
        result.metrics.estimatedLatencyMs)) /
    baseline.metrics.estimatedLatencyMs;
  function checkTier(
    objectives: Objective[],
    tier: ObjectiveCheck["tier"],
  ): ObjectiveCheck[] {
    return objectives.map((objective) => {
      const actual =
        objective.metric === "latencyReductionPct"
          ? reduction
          : result.metrics[objective.metric];
      return {
        objective,
        actual,
        tier,
        passed:
          objective.comparator === "<="
            ? actual <= objective.value
            : actual >= objective.value,
      };
    });
  }
  const mandatory = checkTier(level.objectives, "mandatory");
  const silver = checkTier(level.silverObjectives, "silver");
  const gold = checkTier(level.goldObjectives, "gold");
  const failure = mandatory.find((check) => !check.passed);
  const passed = correct && !failure;
  let stars: Evaluation["stars"] = 0;
  if (passed) {
    stars = 1;
    if (silver.every((check) => check.passed))
      stars = gold.every((check) => check.passed) ? 3 : 2;
  }
  return {
    correct,
    passed,
    stars,
    checks: [...mandatory, ...silver, ...gold],
    firstFailure: !correct
      ? { kind: "correctness" }
      : failure
        ? { kind: "objective", check: failure }
        : null,
  };
}
