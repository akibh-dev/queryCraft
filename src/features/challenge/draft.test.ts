import { expect, it } from "vitest";
import { sampleAttempt, sampleFixture, sampleLevel } from "../../domain/sample";
import { checkCorrectness, evaluateObjectives, simulate } from "../../engine";
import { canSubmit, initialDraft, toggleIndex } from "./draft";

it("requires a fresh run after any edit, even if the player restores the winning selection", () => {
  const baseline = simulate(sampleLevel, {
    selectedIndexIds: sampleLevel.initialIndexIds,
  });
  const run = simulate(sampleLevel, sampleAttempt);
  const score = evaluateObjectives(
    sampleLevel,
    baseline,
    run,
    checkCorrectness(sampleLevel, sampleFixture),
  );
  const initial = initialDraft(sampleLevel);
  expect(canSubmit(initial, score)).toBe(false);
  const evaluated = {
    ...initial,
    selectedIndexIds: run.selectedIndexIds,
    lastRun: run,
  };
  expect(canSubmit(evaluated, score)).toBe(true);
  const edited = toggleIndex(evaluated, sampleAttempt.selectedIndexIds[0]);
  const restored = toggleIndex(edited, sampleAttempt.selectedIndexIds[0]);
  expect(restored.selectedIndexIds).toEqual(run.selectedIndexIds);
  expect(canSubmit(restored, score)).toBe(false);
  expect(canSubmit({ ...restored, stale: false }, score)).toBe(true);
});
