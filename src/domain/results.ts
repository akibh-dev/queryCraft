import { z } from "zod";
import { identifier, modelVersion, objectiveSchema } from "./level";

const steps = z.array(z.string().min(1)).min(1);
export const planSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("scan"), steps }),
  z.strictObject({
    kind: z.enum(["equality", "range"]),
    indexId: identifier,
    steps,
  }),
]);
export type QueryPlan = z.infer<typeof planSchema>;

const count = z.int().nonnegative();
export const metricsSchema = z.strictObject({
  estimatedCostUnits: z.number().nonnegative(),
  estimatedLatencyMs: z.number().positive(),
  rowsExamined: count,
  matchingRows: count,
  sequentialPagesRead: count,
  randomPagesRead: count,
  indexPagesTraversed: count,
  indexStorageBytes: count,
  writeOverheadPct: z.number().nonnegative(),
});
export type Metrics = z.infer<typeof metricsSchema>;

const quantity = z.strictObject({ value: z.number(), unit: z.string().min(1) });
export const traceItemSchema = z.strictObject({
  reasonCode: identifier,
  operands: z.record(z.string(), quantity),
  result: quantity,
});
export type TraceItem = z.infer<typeof traceItemSchema>;

export const simulationResultSchema = z.strictObject({
  modelVersion,
  levelId: identifier,
  levelVersion: z.int().positive(),
  selectedIndexIds: z.array(identifier),
  selectedPlan: planSchema,
  metrics: metricsSchema,
  alternatives: z
    .array(
      z.strictObject({
        plan: planSchema,
        estimatedCostUnits: z.number().nonnegative(),
      }),
    )
    .min(1),
  explanationTrace: z.array(traceItemSchema),
});
export type SimulationResult = z.infer<typeof simulationResultSchema>;

export const objectiveCheckSchema = z.strictObject({
  objective: objectiveSchema,
  actual: z.number(),
  tier: z.enum(["mandatory", "silver", "gold"]),
  passed: z.boolean(),
});
export type ObjectiveCheck = z.infer<typeof objectiveCheckSchema>;

export const evaluationSchema = z.strictObject({
  correct: z.boolean(),
  passed: z.boolean(),
  stars: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  checks: z.array(objectiveCheckSchema),
  firstFailure: z.union([
    z.strictObject({ kind: z.literal("correctness") }),
    z.strictObject({
      kind: z.literal("objective"),
      check: objectiveCheckSchema,
    }),
    z.null(),
  ]),
});
export type Evaluation = z.infer<typeof evaluationSchema>;
