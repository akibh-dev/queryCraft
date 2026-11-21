import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { catalog } from "../../content";
import type { Completion } from "../../domain";
import { Debrief, Landing, LevelMap } from "./index";

function record(index: number): Completion {
  const { level } = catalog[index];
  return {
    levelId: level.id,
    levelVersion: level.levelVersion,
    modelVersion: level.modelVersion,
    stars: 3,
    selectedIndexIds: index === 0 ? ["idx_users_email"] : [],
  };
}
it("opens the tutorial from a fresh save and the next unsolved level after completion", () => {
  const fresh = renderToStaticMarkup(
    <Landing catalog={catalog} completions={[]} />,
  );
  expect(fresh).toContain(`href="/levels/${catalog[0].level.id}"`);
  expect(fresh).toContain("332.6");
  expect(fresh).toContain("0.42002");
  const resumed = renderToStaticMarkup(
    <Landing catalog={catalog} completions={[record(0)]} />,
  );
  expect(resumed).toContain("Continue");
  expect(resumed).toContain(`href="/levels/${catalog[1].level.id}"`);
  expect(
    renderToStaticMarkup(
      <Landing
        catalog={catalog}
        completions={catalog.map((_, i) => record(i))}
      />,
    ),
  ).toContain("View completed levels");
});
it("counts historical completion and distinguishes historical stars from the current best", () => {
  const old = { ...record(0), modelVersion: "mvp-0" };
  const markup = renderToStaticMarkup(
    <LevelMap catalog={catalog} completions={[old]} />,
  );
  expect(markup).toContain("1 of 6 complete");
  expect(markup).toContain("Historical");
  expect(markup).not.toContain("Best ·");
  expect(markup).toContain(`href="/levels/${catalog[1].level.id}"`);
  expect(markup).not.toContain(`href="/levels/${catalog[2].level.id}"`);
});
it("shows the submitted benefit and cost and recovers from an absent result", () => {
  const empty = renderToStaticMarkup(<Debrief entry={catalog[0]} />);
  expect(empty).toContain("Open level");
  expect(empty).toContain("Back to level map");
  const result = renderToStaticMarkup(
    <Debrief entry={catalog[0]} next={catalog[1]} record={record(0)} />,
  );
  for (const value of [
    "Next level",
    "3 of 3 stars",
    "40,001,536",
    "0.42002",
    "Replay",
  ])
    expect(result).toContain(value);
});
