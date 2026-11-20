import { expect, it } from "vitest";
import { resolveRoute, tutorialPath } from "./routes";

it.each([
  ["/", "home"],
  ["/levels/", "map"],
  [tutorialPath, "challenge"],
  [`${tutorialPath}/debrief/`, "debrief"],
  ["/levels/w1-l2-name-collision", "locked"],
  ["/levels/w1-l6-price-of-an-index/debrief", "locked"],
  ["/levels/missing", "missingLevel"],
  ["/levels/missing/debrief", "missingLevel"],
  [`${tutorialPath}/extra`, "missing"],
  ["/settings", "settings"],
  ["/model", "model"],
  ["/missing", "missing"],
])("resolves %s to %s", (path, expected) => {
  expect(resolveRoute(path).kind).toBe(expected);
});
