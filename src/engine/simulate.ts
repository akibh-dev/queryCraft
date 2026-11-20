import {
  type Attempt,
  type Column,
  type LevelDefinition,
  type Metrics,
  type Predicate,
  type QueryPlan,
  type SimulationResult,
  validateAttempt,
  validateLevel,
} from "../domain";

const pageBytes = 8192;

function selectivity(predicate: Predicate, column: Column) {
  const { distinctCount, min = 0, maxExclusive = 0 } = column.distribution;
  if (!distinctCount) return 0;
  if (predicate.op === "eq")
    return predicate.value === null ? 0 : 1 / distinctCount;

  const lower = Math.max(predicate.gte ?? min, min);
  const upper = Math.min(predicate.lt ?? maxExclusive, maxExclusive);
  if (upper <= lower) return 0;
  const width = maxExclusive - min;
  // Scaling both intervals keeps the quotient finite for extreme numeric bounds.
  if (!Number.isFinite(width))
    return (upper / 2 - lower / 2) / (maxExclusive / 2 - min / 2);
  return (upper - lower) / width;
}

function treeHeight(rows: number, entryBytes: number) {
  if (!rows) return 0;
  const fanout = Math.max(2, Math.floor(pageBytes / entryBytes));
  let height = 1;
  for (let capacity = fanout; capacity < rows; capacity *= fanout) height++;
  return height;
}

function fetchedPages(pages: number, visits: number) {
  if (!pages || !visits) return 0;
  if (pages === 1) return 1;
  return Math.min(
    pages,
    visits,
    Math.ceil(-pages * Math.expm1(visits * Math.log1p(-1 / pages))),
  );
}

function candidate(
  plan: QueryPlan,
  rows: number,
  sequential: number,
  random: number,
  height: number,
  predicates: number,
) {
  const cost = sequential + 4 * random + 0.001 * rows * Math.max(1, predicates);
  return {
    plan,
    metrics: {
      rowsExamined: rows,
      sequentialPagesRead: sequential,
      randomPagesRead: random,
      indexPagesTraversed: height,
      estimatedCostUnits: cost,
      estimatedLatencyMs: 0.1 + 0.02 * cost,
    },
  };
}

export function simulate(
  input: LevelDefinition,
  attempt: Attempt,
): SimulationResult {
  const level = validateLevel(input);
  const { selectedIndexIds } = validateAttempt(level, attempt);
  const {
    table,
    referenceQuery: { predicates },
    workload,
  } = level;
  const rows = table.rowCount;
  const pages = Math.ceil((rows * table.avgRowBytes) / pageBytes);
  const columnByName = new Map(
    table.columns.map((column) => [column.name, column]),
  );
  const filters = predicates.map((predicate) => ({
    predicate,
    fraction: selectivity(
      predicate,
      columnByName.get(predicate.column) as Column,
    ),
  }));
  const matchingRows = Math.round(
    rows * filters.reduce((fraction, filter) => fraction * filter.fraction, 1),
  );
  const scanSteps = [`Sequential scan of ${table.name}`];
  if (predicates.length) scanSteps.push("Filter rows by the query predicates");
  const candidates = [
    candidate(
      { kind: "scan", steps: scanSteps },
      rows,
      pages,
      0,
      0,
      predicates.length,
    ),
  ];
  const selected = new Set(selectedIndexIds);
  const indexes = [
    ...table.fixedIndexes,
    ...level.indexOptions.filter((index) => selected.has(index.id)),
  ];
  indexes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  let storage = 0;
  let maintainedHeight = 0;
  for (const index of indexes) {
    const column = columnByName.get(index.column) as Column;
    const entryBytes = column.averageBytes + 8;
    const height = treeHeight(rows, entryBytes);
    if (selected.has(index.id)) {
      storage += Math.ceil((rows * entryBytes) / pageBytes) * pageBytes;
      maintainedHeight += height;
    }
    const filter = filters.find(
      (item) => item.predicate.column === column.name,
    );
    if (!filter) continue;
    const visits = Math.round(rows * filter.fraction);
    const range = filter.predicate.op === "range";
    const steps = [
      `B-tree ${range ? "range scan" : "lookup"} on ${table.name}.${column.name}`,
      "Fetch matching rows",
    ];
    if (predicates.length > 1) steps.push("Apply the remaining filters");
    candidates.push(
      candidate(
        { kind: range ? "range" : "equality", indexId: index.id, steps },
        visits,
        0,
        height + fetchedPages(pages, visits),
        height,
        predicates.length,
      ),
    );
  }
  const winner = candidates.reduce((best, next) =>
    next.metrics.estimatedCostUnits < best.metrics.estimatedCostUnits
      ? next
      : best,
  );
  const writes = workload.insertsPerSecond + workload.updatesPerSecond;
  const operations = writes + workload.readsPerSecond;
  const writeShare = operations ? writes / operations : 0;
  const metrics: Metrics = {
    ...winner.metrics,
    matchingRows,
    indexStorageBytes: storage,
    writeOverheadPct: 15 * maintainedHeight * writeShare,
  };
  return {
    modelVersion: level.modelVersion,
    levelId: level.id,
    levelVersion: level.levelVersion,
    selectedIndexIds,
    selectedPlan: winner.plan,
    metrics,
    alternatives: candidates.map((c) => ({
      plan: c.plan,
      estimatedCostUnits: c.metrics.estimatedCostUnits,
    })),
    explanationTrace: [
      {
        reasonCode: "lowest-estimated-cost",
        operands: {
          sequentialReads: {
            value: metrics.sequentialPagesRead,
            unit: "pages",
          },
          randomReads: { value: metrics.randomPagesRead, unit: "pages" },
          rowsExamined: { value: metrics.rowsExamined, unit: "rows" },
          predicateCount: { value: predicates.length, unit: "predicates" },
        },
        result: { value: metrics.estimatedCostUnits, unit: "cost units" },
      },
      {
        reasonCode: "optional-index-storage",
        operands: {
          allocatedPages: { value: storage / pageBytes, unit: "pages" },
          pageSize: { value: pageBytes, unit: "bytes/page" },
        },
        result: { value: storage, unit: "bytes" },
      },
      {
        reasonCode: "workload-weighted-index-maintenance",
        operands: {
          activeOptionalIndexes: { value: selected.size, unit: "indexes" },
          sumOfTreeHeights: { value: maintainedHeight, unit: "levels" },
          writeShare: { value: writeShare, unit: "fraction" },
        },
        result: { value: metrics.writeOverheadPct, unit: "%" },
      },
    ],
  };
}
