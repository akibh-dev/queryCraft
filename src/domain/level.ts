import { z } from "zod";

export const schemaVersion = z.literal(1);
export const modelVersion = z.literal("mvp-1");
const label = z.string().min(1);
export const identifier = label.max(128);
const averageBytes = z.number().min(1).max(8192);
const scalar = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type Scalar = z.infer<typeof scalar>;

export const columnSchema = z
  .strictObject({
    name: identifier,
    type: z.enum(["bigint", "text", "timestamp", "boolean"]),
    nullable: z.boolean().default(false),
    averageBytes,
    distribution: z.strictObject({
      kind: z.enum(["unique", "uniform"]),
      distinctCount: z.int().nonnegative(),
      min: z.number().optional(),
      maxExclusive: z.number().optional(),
    }),
  })
  .refine(
    ({ type, distribution: { min, maxExclusive } }) =>
      (min === undefined && maxExclusive === undefined) ||
      (type === "bigint" &&
        min !== undefined &&
        maxExclusive !== undefined &&
        min < maxExclusive),
    {
      message: "Numeric bounds require a bigint column and min < maxExclusive.",
      path: ["distribution"],
    },
  );
export type Column = z.infer<typeof columnSchema>;

function matchesColumn(value: Scalar, column: Column): boolean {
  switch (column.type) {
    case "bigint":
      return typeof value === "number" && Number.isSafeInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "timestamp":
    case "text":
      return typeof value === "string";
  }
}

export const indexSchema = z.strictObject({
  id: identifier,
  column: identifier,
});
export type IndexModel = z.infer<typeof indexSchema>;

export const tableSchema = z
  .strictObject({
    name: identifier,
    rowCount: z.int().min(0).max(1_000_000_000),
    avgRowBytes: averageBytes,
    columns: z.array(columnSchema).min(1).max(16),
    fixedIndexes: z.array(indexSchema).max(16),
  })
  .superRefine((table, ctx) => {
    const names = new Set<string>();
    table.columns.forEach(({ name, distribution }, index) => {
      if (names.has(name)) {
        ctx.addIssue({
          code: "custom",
          path: ["columns", index, "name"],
          message: "Duplicate column name.",
        });
      }
      names.add(name);
      const { kind, distinctCount } = distribution;
      if (
        distinctCount > table.rowCount ||
        (table.rowCount > 0 && distinctCount === 0) ||
        (kind === "unique" && distinctCount !== table.rowCount)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["columns", index, "distribution", "distinctCount"],
          message: "Distinct count conflicts with the virtual row count.",
        });
      }
    });
  });
export type TableModel = z.infer<typeof tableSchema>;

const rate = z.number().min(0).max(1_000_000);
export const workloadSchema = z.strictObject({
  readsPerSecond: rate,
  insertsPerSecond: rate,
  updatesPerSecond: rate,
});
export type Workload = z.infer<typeof workloadSchema>;

const rangeSchema = z
  .strictObject({
    op: z.literal("range"),
    column: identifier,
    gte: z.number().optional(),
    lt: z.number().optional(),
  })
  .refine(
    ({ gte, lt }) =>
      gte === undefined ? lt !== undefined : lt === undefined || gte < lt,
    "Provide at least one bound and keep gte below lt.",
  );

export const predicateSchema = z.discriminatedUnion("op", [
  z.strictObject({ op: z.literal("eq"), column: identifier, value: scalar }),
  rangeSchema,
]);
export type Predicate = z.infer<typeof predicateSchema>;
export const querySchema = z.strictObject({
  table: identifier,
  select: z.array(identifier).min(1),
  predicates: z.array(predicateSchema).max(16),
});
export type QuerySpec = z.infer<typeof querySchema>;

export const objectiveSchema = z.discriminatedUnion("comparator", [
  z.strictObject({
    metric: z.enum([
      "estimatedLatencyMs",
      "rowsExamined",
      "indexStorageBytes",
      "writeOverheadPct",
    ]),
    comparator: z.literal("<="),
    value: z.number().nonnegative(),
  }),
  z.strictObject({
    metric: z.literal("latencyReductionPct"),
    comparator: z.literal(">="),
    value: z.number().nonnegative(),
  }),
]);
export type Objective = z.infer<typeof objectiveSchema>;

export const levelSchema = z
  .strictObject({
    schemaVersion,
    modelVersion,
    levelVersion: z.int().positive(),
    id: identifier,
    worldId: identifier,
    title: label,
    description: label,
    conceptTags: z.array(label),
    table: tableSchema,
    workload: workloadSchema,
    referenceQuery: querySchema,
    indexOptions: z.array(indexSchema).max(16),
    initialIndexIds: z.array(identifier).max(16),
    objectives: z.array(objectiveSchema).min(1),
    silverObjectives: z.array(objectiveSchema).min(1),
    goldObjectives: z.array(objectiveSchema).min(1),
    hints: z.array(label).length(3),
    lesson: label,
    fixtureId: identifier,
  })
  .superRefine((level, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    const { table, referenceQuery: query } = level;
    const columns = new Map(
      table.columns.map((column) => [column.name, column]),
    );
    if (query.table !== table.name)
      issue(
        ["referenceQuery", "table"],
        "Query must reference the level table.",
      );
    query.select.forEach((name, i) => {
      if (!columns.has(name))
        issue(["referenceQuery", "select", i], "Unknown projected column.");
    });
    const predicateColumns = new Set<string>();
    query.predicates.forEach((predicate, i) => {
      const path = ["referenceQuery", "predicates", i];
      const column = columns.get(predicate.column);
      if (!column) {
        issue([...path, "column"], "Unknown predicate column.");
        return;
      }
      if (predicateColumns.has(column.name))
        issue(
          [...path, "column"],
          "Only one predicate per column is supported.",
        );
      predicateColumns.add(column.name);
      if (
        predicate.op === "range" &&
        (column.type !== "bigint" || column.distribution.min === undefined)
      ) {
        issue(
          path,
          "Range predicates require a numeric column with distribution bounds.",
        );
      }
      if (
        predicate.op === "eq" &&
        predicate.value !== null &&
        !matchesColumn(predicate.value, column)
      ) {
        issue([...path, "value"], "Equality value must match the column type.");
      }
    });

    const indexIds = new Set<string>();
    const indexedColumns = new Set<string>();
    function checkIndexes(indexes: IndexModel[], prefix: string[]) {
      indexes.forEach((index, i) => {
        if (!columns.has(index.column))
          issue([...prefix, i, "column"], "Unknown indexed column.");
        if (indexIds.has(index.id))
          issue([...prefix, i, "id"], "Duplicate index ID.");
        if (indexedColumns.has(index.column))
          issue(
            [...prefix, i, "column"],
            "Only one index per column is supported.",
          );
        indexIds.add(index.id);
        indexedColumns.add(index.column);
      });
    }
    checkIndexes(table.fixedIndexes, ["table", "fixedIndexes"]);
    checkIndexes(level.indexOptions, ["indexOptions"]);
    const optionalIds = new Set(level.indexOptions.map((index) => index.id));
    const initialIds = new Set<string>();
    level.initialIndexIds.forEach((id, i) => {
      if (!optionalIds.has(id))
        issue(
          ["initialIndexIds", i],
          "Only optional indexes can be initially selected.",
        );
      if (initialIds.has(id))
        issue(["initialIndexIds", i], "Duplicate initial selection.");
      initialIds.add(id);
    });
  });
export type LevelDefinition = z.infer<typeof levelSchema>;
export function validateLevel(raw: unknown): LevelDefinition {
  return levelSchema.parse(raw);
}

export const attemptSchema = z.strictObject({
  selectedIndexIds: z
    .array(identifier)
    .transform((ids) => [...new Set(ids)].sort()),
});
export type Attempt = z.infer<typeof attemptSchema>;
export function validateAttempt(level: LevelDefinition, raw: unknown): Attempt {
  const allowed = new Set(level.indexOptions.map((index) => index.id));
  return attemptSchema
    .refine(
      (attempt) => attempt.selectedIndexIds.every((id) => allowed.has(id)),
      {
        path: ["selectedIndexIds"],
        message: "Selection contains an unknown or fixed index.",
      },
    )
    .parse(raw);
}

export const fixtureSchema = z.strictObject({
  id: identifier,
  rows: z.array(z.record(z.string(), scalar)),
  expectedRows: z.array(z.array(scalar)),
});
export type Fixture = z.infer<typeof fixtureSchema>;
export function validateFixture(level: LevelDefinition, raw: unknown): Fixture {
  const columns = new Map(
    level.table.columns.map((column) => [column.name, column]),
  );
  return fixtureSchema
    .superRefine((fixture, ctx) => {
      const issue = (path: (string | number)[], message: string) =>
        ctx.addIssue({ code: "custom", path, message });
      const checkCell = (
        value: Scalar,
        column: Column,
        path: (string | number)[],
      ) => {
        if (value === null ? !column.nullable : !matchesColumn(value, column))
          issue(path, "Cell must match the column type and nullability.");
      };
      if (fixture.id !== level.fixtureId)
        issue(["id"], "Fixture ID must match the level.");
      fixture.rows.forEach((row, i) => {
        for (const column of columns.values()) {
          const path = ["rows", i, column.name];
          if (Object.hasOwn(row, column.name))
            checkCell(row[column.name], column, path);
          else issue(path, "Missing fixture column.");
        }
        for (const name of Object.keys(row)) {
          if (!columns.has(name))
            issue(["rows", i, name], "Unknown fixture column.");
        }
      });
      fixture.expectedRows.forEach((row, i) => {
        if (row.length !== level.referenceQuery.select.length) {
          issue(
            ["expectedRows", i],
            "Expected row must match the projection length.",
          );
          return;
        }
        level.referenceQuery.select.forEach((name, j) => {
          const column = columns.get(name);
          if (column) checkCell(row[j], column, ["expectedRows", i, j]);
        });
      });
    })
    .parse(raw);
}
