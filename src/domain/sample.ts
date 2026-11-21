// Development fixture for consumers before campaign content is available.
import { validateAttempt, validateFixture, validateLevel } from "./level";

export const sampleLevel = validateLevel({
  schemaVersion: 1,
  modelVersion: "mvp-1",
  levelVersion: 1,
  id: "sample-book-lookup",
  worldId: "sample",
  title: "Find a book",
  description:
    "A librarian needs the title of a book with a known catalog code.",
  conceptTags: ["equality"],
  table: {
    name: "books",
    rowCount: 100_000,
    avgRowBytes: 128,
    columns: [
      {
        name: "id",
        type: "bigint",
        averageBytes: 8,
        distribution: { kind: "unique", distinctCount: 100_000 },
      },
      {
        name: "code",
        type: "text",
        averageBytes: 8,
        distribution: { kind: "unique", distinctCount: 100_000 },
      },
      {
        name: "title",
        type: "text",
        averageBytes: 32,
        distribution: { kind: "uniform", distinctCount: 80_000 },
      },
    ],
    fixedIndexes: [{ id: "pk_books", column: "id" }],
  },
  workload: { readsPerSecond: 90, insertsPerSecond: 10, updatesPerSecond: 0 },
  referenceQuery: {
    table: "books",
    select: ["title"],
    predicates: [{ op: "eq", column: "code", value: "QC2" }],
  },
  indexOptions: [
    { id: "idx_books_code", column: "code" },
    { id: "idx_books_title", column: "title" },
  ],
  initialIndexIds: [],
  objectives: [{ metric: "rowsExamined", comparator: "<=", value: 1 }],
  silverObjectives: [
    { metric: "indexStorageBytes", comparator: "<=", value: 2_000_000 },
  ],
  goldObjectives: [{ metric: "writeOverheadPct", comparator: "<=", value: 3 }],
  hints: [
    "Read the WHERE clause.",
    "Each catalog code occurs once.",
    "Try indexing the catalog code.",
  ],
  lesson:
    "An index on the catalog code can find the matching book in one lookup.",
  fixtureId: "sample-books",
});

export const sampleAttempt = validateAttempt(sampleLevel, {
  selectedIndexIds: ["idx_books_code"],
});
export const sampleFixture = validateFixture(sampleLevel, {
  id: "sample-books",
  rows: [
    { id: 1, code: "QC1", title: "Streams" },
    { id: 2, code: "QC2", title: "Sequences" },
  ],
  expectedRows: [["Sequences"]],
});
