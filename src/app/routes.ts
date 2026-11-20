import { catalog, findEntry } from "../content";
import type { Completion } from "../domain";

export const tutorialPath = `/levels/${catalog[0].level.id}`;
export function resolveRoute(pathname: string, completions: Completion[] = []) {
  const path = pathname.replace(/\/$/, "") || "/";
  switch (path) {
    case "/":
      return { kind: "home", title: "Make a slow query faster." } as const;
    case "/levels":
      return { kind: "map", title: "Level map" } as const;
    case "/settings":
      return { kind: "settings", title: "Settings" } as const;
    case "/model":
      return { kind: "model", title: "Model assumptions" } as const;
  }
  const match = /^\/levels\/([^/]+)(\/debrief)?$/.exec(path);
  if (!match) return { kind: "missing", title: "Page not found" } as const;
  const entry = findEntry(match[1]);
  if (!entry)
    return { kind: "missingLevel", title: "Level not found" } as const;
  const index = catalog.indexOf(entry);
  const previous = catalog[index - 1];
  if (
    previous &&
    !completions.some((record) => record.levelId === previous.level.id) &&
    !completions.some((record) => record.levelId === entry.level.id)
  )
    return {
      kind: "locked",
      title: entry.level.title,
      prerequisite: previous.level.title,
    } as const;
  if (match[2]) {
    const record = completions.find(
      (record) =>
        record.levelId === entry.level.id &&
        record.modelVersion === entry.level.modelVersion &&
        record.levelVersion === entry.level.levelVersion,
    );
    return {
      kind: "debrief",
      title: record ? "Level complete" : "Level debrief",
      entry,
      record,
      index,
    } as const;
  }
  return { kind: "challenge", title: entry.level.title, entry, index } as const;
}
