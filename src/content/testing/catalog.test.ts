import { expect, it } from "vitest";
import { checkCorrectness, evaluateObjectives, simulate } from "../../engine";
import { catalog, findEntry, orderedIds } from "../index";
import { references } from "./references";

it("contains exactly the authored campaign entries in order", () => {
  expect(orderedIds).toEqual(references.map(({ id }) => id));
  expect(new Set(orderedIds).size).toBe(orderedIds.length);
  expect(findEntry("unknown")).toBeUndefined();
});

for (const { level, fixture } of catalog) {
  it(`validates the fixture, objectives and every optional selection for ${level.title}`, () => {
    const reference = references.find(({ id }) => id === level.id);
    if (!reference) throw new Error("Missing reference choices");
    const correct = checkCorrectness(level, fixture);
    expect(correct).toBe(true);
    const baseline = simulate(level, {
      selectedIndexIds: level.initialIndexIds,
    });
    const run = (selectedIndexIds: string[]) => {
      const result = simulate(level, { selectedIndexIds });
      const evaluation = evaluateObjectives(level, baseline, result, correct);
      return {
        choices: result.selectedIndexIds,
        plan: result.selectedPlan,
        metrics: result.metrics,
        checks: evaluation.checks,
        stars: evaluation.stars,
      };
    };
    expect(run(reference.winning).stars).toBe(3);
    expect(run(reference.losing).stars).toBe(0);
    const runs = Array.from(
      { length: 2 ** level.indexOptions.length },
      (_, mask) =>
        run(
          level.indexOptions
            .filter((_, i) => (mask & (1 << i)) !== 0)
            .map((option) => option.id),
        ),
    );
    expect({
      modelVersion: level.modelVersion,
      levelVersion: level.levelVersion,
      initial: baseline.selectedIndexIds,
      runs,
    }).toMatchSnapshot();
  });
}
