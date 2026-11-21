import { z } from "zod";
import { identifier, schemaVersion } from "./level";

export const campaignSchema = z
  .array(identifier)
  .length(6)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    "Campaign level IDs must be distinct.",
  );
export type Campaign = z.infer<typeof campaignSchema>;

export const settingsSchema = z.strictObject({
  theme: z.enum(["system", "light", "dark"]),
  reduceMotion: z.boolean(),
});
export type Settings = z.infer<typeof settingsSchema>;

export const completionSchema = z.strictObject({
  levelId: identifier,
  levelVersion: z.int().positive(),
  // Known levels can retain scores from older model versions.
  modelVersion: identifier,
  stars: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  selectedIndexIds: z
    .array(identifier)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Saved selections must have unique IDs.",
    )
    .transform((ids) => ids.sort()),
});
export type Completion = z.infer<typeof completionSchema>;

export const progressSchema = z.strictObject({
  schemaVersion,
  completions: z.array(completionSchema).max(256),
  settings: settingsSchema,
});
export type Progress = z.infer<typeof progressSchema>;
