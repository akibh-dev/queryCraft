import { expect, it } from "vitest";
import { z } from "zod";
import { sampleAttempt, sampleFixture, sampleLevel } from "../domain/sample";
import { checkCorrectness, evaluateObjectives, simulate } from "./index";

function tableWithRows(rows: number) {
  const level = structuredClone(sampleLevel);
  level.table.rowCount = rows;
  for (const col of level.table.columns)
    col.distribution.distinctCount =
      col.distribution.kind === "unique"
        ? rows
        : Math.min(rows, col.distribution.distinctCount);
  return level;
}
const empty = { selectedIndexIds: [] };

it("reproduces the million-row lookup and its losing alternatives", () => {
  const level = tableWithRows(1_000_000);
  level.table.columns[1].averageBytes = 32;
  level.workload = {
    readsPerSecond: 95,
    insertsPerSecond: 5,
    updatesPerSecond: 0,
  };
  level.objectives = [
    { metric: "latencyReductionPct", comparator: ">=", value: 70 },
    { metric: "indexStorageBytes", comparator: "<=", value: 42_000_000 },
  ];
  level.silverObjectives = [
    { metric: "rowsExamined", comparator: "<=", value: 1 },
  ];
  level.goldObjectives = [
    { metric: "writeOverheadPct", comparator: "<=", value: 2.3 },
  ];
  const baseline = simulate(level, empty);
  expect(baseline.metrics).toMatchObject({
    rowsExamined: 1_000_000,
    sequentialPagesRead: 15625,
    estimatedCostUnits: 16625,
    estimatedLatencyMs: 332.6,
  });
  const run = simulate(level, sampleAttempt);
  expect(run.selectedPlan.kind).toBe("equality");
  expect(run.metrics).toMatchObject({
    rowsExamined: 1,
    matchingRows: 1,
    indexPagesTraversed: 3,
    randomPagesRead: 4,
    indexStorageBytes: 40_001_536,
    writeOverheadPct: 2.25,
    estimatedCostUnits: 16.001,
  });
  expect(run.metrics.estimatedLatencyMs).toBeCloseTo(0.42002, 12);
  expect(evaluateObjectives(level, baseline, run, true)).toMatchObject({
    stars: 3,
    firstFailure: null,
  });
  expect(evaluateObjectives(level, baseline, run, false)).toMatchObject({
    stars: 0,
    firstFailure: { kind: "correctness" },
  });
  const distractor = simulate(level, { selectedIndexIds: ["idx_books_title"] });
  expect(distractor.selectedPlan.kind).toBe("scan");
  expect(distractor.metrics.indexStorageBytes).toBeGreaterThan(0);
  expect(
    evaluateObjectives(level, baseline, distractor, true).firstFailure,
  ).toMatchObject({
    kind: "objective",
    check: { objective: level.objectives[0] },
  });
  level.goldObjectives[0].value = 2.24999;
  expect(evaluateObjectives(level, baseline, run, true).stars).toBe(2);
  level.silverObjectives[0].value = 0;
  expect(evaluateObjectives(level, baseline, run, true).stars).toBe(1);
});

it.each([0, 1, 4, 512, 512 ** 2, 1_000_000_000])(
  "handles %i rows and exact fanout powers",
  (rows) => {
    const level = tableWithRows(rows);
    const run = simulate(level, sampleAttempt);
    expect(Number.isFinite(run.metrics.estimatedCostUnits)).toBe(true);
    if (rows <= 4) {
      expect(run.selectedPlan.kind).toBe("scan");
      expect(run.metrics.indexStorageBytes).toBe(rows ? 8192 : 0);
    }
    if (rows === 512 || rows === 512 ** 2)
      expect(run.metrics.indexPagesTraversed).toBe(rows === 512 ? 1 : 2);
    if (!rows)
      expect(run.alternatives.map((c) => c.estimatedCostUnits)).toEqual([0, 0]);
  },
);

it("uses one index for range visits, then applies independent filters", () => {
  const level = tableWithRows(100_000);
  Object.assign(level.table.columns[0].distribution, {
    min: 0,
    maxExclusive: 100_000,
  });
  level.referenceQuery.predicates = [
    { op: "range", column: "id", gte: 1, lt: 11 },
    { op: "eq", column: "title", value: "Sequences" },
  ];
  const run = simulate(level, empty);
  expect(run.selectedPlan).toMatchObject({
    kind: "range",
    indexId: "pk_books",
  });
  expect(run.metrics).toMatchObject({
    rowsExamined: 10,
    matchingRows: 0,
    indexStorageBytes: 0,
    writeOverheadPct: 0,
  });
  level.referenceQuery.predicates = [
    { op: "range", column: "id", gte: 1, lt: 2 },
  ];
  expect(
    checkCorrectness(level, { ...sampleFixture, expectedRows: [["Streams"]] }),
  ).toBe(true);
  level.referenceQuery.predicates = [
    { op: "range", column: "id", gte: 100_001 },
  ];
  expect(simulate(level, empty).metrics.matchingRows).toBe(0);
});

it("breaks index ties by ID even with reordered definitions and selections", () => {
  const level = tableWithRows(100_000);
  level.table.columns[2].distribution = {
    kind: "unique",
    distinctCount: 100_000,
  };
  level.table.columns[2].averageBytes = 8;
  level.referenceQuery.predicates.push({
    op: "eq",
    column: "title",
    value: "Sequences",
  });
  const ids = level.indexOptions.map((i) => i.id);
  const run = simulate(level, { selectedIndexIds: ids });
  expect(run.selectedPlan).toMatchObject({ indexId: "idx_books_code" });
  level.indexOptions.reverse();
  expect(simulate(level, { selectedIndexIds: ids.reverse() })).toEqual(run);
  level.workload = {
    readsPerSecond: 0,
    insertsPerSecond: 0,
    updatesPerSecond: 0,
  };
  expect(
    simulate(level, { selectedIndexIds: ids }).metrics.writeOverheadPct,
  ).toBe(0);
});

it("preserves typed tuple multiplicity, null semantics and projection order", () => {
  const level = structuredClone(sampleLevel);
  level.table.columns[1].nullable = true;
  const fixture = {
    ...sampleFixture,
    rows: [
      ...sampleFixture.rows,
      sampleFixture.rows[1],
      { id: 3, title: "Sequences", code: null },
    ],
  };
  expect(checkCorrectness(level, fixture)).toBe(false);
  level.referenceQuery.select = ["title", "id"];
  expect(
    checkCorrectness(level, {
      ...fixture,
      expectedRows: [
        ["Sequences", 2],
        ["Sequences", 2],
      ],
    }),
  ).toBe(true);
  level.referenceQuery.predicates = [{ op: "eq", column: "code", value: null }];
  expect(checkCorrectness(level, { ...fixture, expectedRows: [] })).toBe(true);
  expect(simulate(level, sampleAttempt).metrics.matchingRows).toBe(0);
});

it("rejects unknown options, incompatible versions and non-baseline comparisons", () => {
  expect(() =>
    simulate(sampleLevel, { selectedIndexIds: ["unknown"] }),
  ).toThrow(z.ZodError);
  const base = simulate(sampleLevel, empty);
  const run = simulate(sampleLevel, sampleAttempt);
  expect(() =>
    evaluateObjectives(sampleLevel, base, { ...run, levelVersion: 2 }, true),
  ).toThrow(z.ZodError);
  expect(() => evaluateObjectives(sampleLevel, run, run, true)).toThrow(
    z.ZodError,
  );
});
