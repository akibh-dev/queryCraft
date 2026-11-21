import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  campaignSchema,
  formatQuery,
  type LevelDefinition,
  progressSchema,
  validateAttempt,
  validateFixture,
  validateLevel,
} from "./index";
import { sampleAttempt, sampleFixture, sampleLevel } from "./sample";

describe("level content", () => {
  it("supplies a validated level, reference selection and fixture for consumers", () => {
    expect(validateLevel(sampleLevel)).toEqual(sampleLevel);
    expect(validateAttempt(sampleLevel, sampleAttempt)).toEqual(sampleAttempt);
    expect(validateFixture(sampleLevel, sampleFixture)).toEqual(sampleFixture);
    expect(sampleLevel.table.columns[0].nullable).toBe(false);
  });

  it.each([
    { schemaVersion: 2 },
    { modelVersion: "mvp-2" },
    { levelVersion: 0 },
    { hints: ["Only one hint"] },
    { objectives: [] },
    { goldObjectives: [] },
    { objectives: [{ metric: "rowsExamined", comparator: ">=", value: 1 }] },
    {
      objectives: [
        { metric: "writeOverheadPct", comparator: "<=", value: Infinity },
      ],
    },
    { rawSql: "SELECT 1" },
  ])("rejects unsupported level contracts %j", (override) => {
    expect(() => validateLevel({ ...sampleLevel, ...override })).toThrow(
      ZodError,
    );
  });

  it.each([
    { table: "different" },
    { select: [] },
    { select: ["missing"] },
    { orderBy: "code" },
    { predicates: [{ op: "like", column: "code", value: "QC%" }] },
    { predicates: [{ op: "eq", column: "missing", value: 0 }] },
    { predicates: [{ op: "eq", column: "code", value: true }] },
    {
      predicates: [
        sampleLevel.referenceQuery.predicates[0],
        sampleLevel.referenceQuery.predicates[0],
      ],
    },
  ])("rejects invalid query references or operators %j", (query) => {
    expect(() =>
      validateLevel({
        ...sampleLevel,
        referenceQuery: { ...sampleLevel.referenceQuery, ...query },
      }),
    ).toThrow(ZodError);
  });

  it.each([
    { id: "second_code_index", column: "code" },
    { id: "pk_books", column: "title" },
    { id: "idx_new", column: "id" },
    { id: "idx_missing", column: "missing" },
  ])("rejects conflicting and missing index references %j", (index) => {
    expect(() =>
      validateLevel({
        ...sampleLevel,
        indexOptions: [sampleLevel.indexOptions[0], index],
      }),
    ).toThrow(ZodError);
  });

  it("requires initial choices to be distinct editable indexes", () => {
    for (const initialIndexIds of [
      ["pk_books"],
      ["obsolete"],
      ["idx_books_code", "idx_books_code"],
    ]) {
      expect(() => validateLevel({ ...sampleLevel, initialIndexIds })).toThrow(
        ZodError,
      );
    }
    expect(
      validateLevel({
        ...sampleLevel,
        initialIndexIds: sampleAttempt.selectedIndexIds,
      }).initialIndexIds,
    ).toEqual(sampleAttempt.selectedIndexIds);
  });

  it("normalizes attempts to a sorted set and rejects fixed and unknown IDs", () => {
    const ids = ["idx_books_title", "idx_books_code", "idx_books_title"];
    expect(
      validateAttempt(sampleLevel, { selectedIndexIds: ids }).selectedIndexIds,
    ).toEqual(["idx_books_code", "idx_books_title"]);
    expect(ids).toHaveLength(3);
    for (const id of ["pk_books", "unknown"]) {
      expect(() =>
        validateAttempt(sampleLevel, { selectedIndexIds: [id] }),
      ).toThrow(ZodError);
    }
  });

  it("bounds estimates and requires consistent distinct counts on empty and populated tables", () => {
    const level = structuredClone(sampleLevel);
    level.table.rowCount = 0;
    expect(() => validateLevel(level)).toThrow(ZodError);
    for (const column of level.table.columns)
      column.distribution.distinctCount = 0;
    expect(validateLevel(level).table.rowCount).toBe(0);
    level.table.rowCount = 1_000_000_000;
    for (const column of level.table.columns)
      column.distribution.distinctCount = level.table.rowCount;
    expect(validateLevel(level).table.rowCount).toBe(1_000_000_000);
    level.table.columns[0].distribution.distinctCount--;
    expect(() => validateLevel(level)).toThrow(ZodError);
    for (const table of [
      { rowCount: 1_000_000_001 },
      { avgRowBytes: 8193 },
      { columns: [] },
      { columns: [...sampleLevel.table.columns, sampleLevel.table.columns[0]] },
    ]) {
      expect(() =>
        validateLevel({
          ...sampleLevel,
          table: { ...sampleLevel.table, ...table },
        }),
      ).toThrow(ZodError);
    }
    expect(() =>
      validateLevel({
        ...sampleLevel,
        workload: { ...sampleLevel.workload, readsPerSecond: -1 },
      }),
    ).toThrow(ZodError);
  });

  it("requires numeric domains and ordered finite range bounds, allowing one-sided ranges", () => {
    const level: LevelDefinition = structuredClone(sampleLevel);
    level.referenceQuery.predicates = [{ op: "range", column: "id", gte: 50 }];
    expect(() => validateLevel(level)).toThrow(ZodError);
    const distribution = level.table.columns[0].distribution;
    Object.assign(distribution, { min: 0, maxExclusive: 100_000 });
    expect(validateLevel(level)).toEqual(level);
    for (const bounds of [{ lt: 50 }, { gte: 1, lt: 3 }]) {
      level.referenceQuery.predicates = [
        { op: "range", column: "id", ...bounds },
      ];
      expect(validateLevel(level)).toEqual(level);
    }
    for (const bounds of [{}, { gte: 2, lt: 2 }, { lt: NaN }]) {
      level.referenceQuery.predicates = [
        { op: "range", column: "id", ...bounds },
      ];
      expect(() => validateLevel(level)).toThrow(ZodError);
    }
    level.referenceQuery.predicates = [];
    distribution.maxExclusive = distribution.min;
    expect(() => validateLevel(level)).toThrow(ZodError);
  });
});

describe("fixture validation", () => {
  it.each([
    { id: "wrong-fixture" },
    { rows: [{ code: "QC1", title: "Streams" }] },
    { rows: [{ ...sampleFixture.rows[0], extra: false }] },
    { rows: [{ ...sampleFixture.rows[0], id: Number.MAX_SAFE_INTEGER + 1 }] },
    { rows: [{ ...sampleFixture.rows[0], title: null }] },
    { expectedRows: [[1]] },
    { expectedRows: [[null]] },
    { expectedRows: [["Sequences", 2]] },
  ])("rejects fixture shape, reference and cell errors %j", (override) => {
    expect(() =>
      validateFixture(sampleLevel, { ...sampleFixture, ...override }),
    ).toThrow(ZodError);
  });

  it("accepts nulls in nullable cells and null equality predicates", () => {
    const level = structuredClone(sampleLevel);
    level.table.columns[2].nullable = true;
    level.referenceQuery.predicates = [
      { op: "eq", column: "code", value: null },
    ];
    const fixture = {
      ...sampleFixture,
      rows: [{ ...sampleFixture.rows[0], title: null }],
      expectedRows: [[null]],
    };
    expect(validateFixture(validateLevel(level), fixture)).toEqual(fixture);
  });
});

it("renders SQL with quoted identifiers and literals, projection order, and half-open ranges", () => {
  expect(
    formatQuery({
      table: 'book"s',
      select: ["title", "code"],
      predicates: [
        { op: "eq", column: "title", value: "Ada's book" },
        { op: "range", column: "id", gte: 1, lt: 3 },
      ],
    }),
  ).toBe(
    'SELECT "title", "code"\nFROM "book""s"\nWHERE "title" = \'Ada\'\'s book\' AND "id" >= 1 AND "id" < 3;',
  );
  expect(formatQuery({ table: "books", select: ["id"], predicates: [] })).toBe(
    'SELECT "id"\nFROM "books";',
  );
});

it("validates versioned progress and the six distinct campaign IDs", () => {
  const ids = ["a", "b", "c", "d", "e", "f"];
  expect(campaignSchema.parse(ids)).toEqual(ids);
  expect(campaignSchema.safeParse([...ids.slice(1), "b"]).success).toBe(false);
  const record = {
    levelId: "a",
    levelVersion: 1,
    modelVersion: "older-model",
    stars: 2,
    selectedIndexIds: ["b", "a"],
  };
  const save = {
    schemaVersion: 1,
    completions: [record],
    settings: { theme: "dark", reduceMotion: false },
  };
  expect(progressSchema.parse(save).completions[0].selectedIndexIds).toEqual([
    "a",
    "b",
  ]);
  for (const override of [
    { schemaVersion: 2 },
    { completions: [{ ...record, stars: 0 }] },
    { completions: [{ ...record, selectedIndexIds: ["a", "a"] }] },
  ]) {
    expect(progressSchema.safeParse({ ...save, ...override }).success).toBe(
      false,
    );
  }
});
