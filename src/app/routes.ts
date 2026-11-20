// The content catalog takes over these route labels when the first puzzles ship.
const levels = [
  { id: "w1-l1-needle-in-a-million", title: "Needle in a Million" },
  { id: "w1-l2-name-collision", title: "Name Collision" },
  { id: "w1-l3-pocket-directory", title: "Pocket Directory" },
  { id: "w1-l4-range-runner", title: "Range Runner" },
  { id: "w1-l5-the-common-case", title: "The Common Case" },
  { id: "w1-l6-price-of-an-index", title: "The Price of an Index" },
];
export const tutorial = levels[0];
export const tutorialPath = `/levels/${tutorial.id}`;

export function resolveRoute(pathname: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  switch (path) {
    case "/":
      return { kind: "home", title: "Make a slow query faster." } as const;
    case "/levels":
      return { kind: "map", title: "Level map" } as const;
    case "/model":
      return { kind: "model", title: "Model assumptions" } as const;
    case "/settings":
      return { kind: "settings", title: "Settings" } as const;
  }
  const match = /^\/levels\/([^/]+)(\/debrief)?$/.exec(path);
  if (match) {
    const index = levels.findIndex((level) => level.id === match[1]);
    if (index < 0)
      return { kind: "missingLevel", title: "Level not found" } as const;
    if (index > 0)
      return {
        kind: "locked",
        title: levels[index].title,
        prerequisite: levels[index - 1].title,
      } as const;
    if (match[2]) return { kind: "debrief", title: "Level debrief" } as const;
    return { kind: "challenge", title: tutorial.title } as const;
  }
  return { kind: "missing", title: "Page not found" } as const;
}
