import { expect, it } from "vitest";
import { catalog } from "../content";
import { createProgressStore, maxImportBytes, progressKey } from "./index";

const levels = catalog.map((entry) => entry.level);
const record = {
  levelId: levels[0].id,
  levelVersion: 1,
  modelVersion: "mvp-1",
  stars: 3 as const,
  selectedIndexIds: ["idx_users_email"],
};
function setup() {
  const map = new Map<string, string>();
  const api = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
  const make = () =>
    createProgressStore(
      levels,
      () => api,
      async (write) => write(),
    );
  return { map, api, store: make(), make };
}
it("round trips progress, keeps device settings and retains best scores and historical records", async () => {
  const { store, make } = setup();
  await store.saveCompletion(record);
  const fresh = make();
  fresh.loadProgress();
  expect(fresh.getSnapshot().progress.completions).toEqual([record]);
  const original = store.exportProgress();
  await store.resetProgress();
  await store.saveSettings({ theme: "light", reduceMotion: true });
  expect(store.previewImport(original).completions).toEqual([record]);
  await store.importProgress(original);
  await store.saveCompletion({ ...record, stars: 1 });
  await store.saveCompletion({ ...record, selectedIndexIds: [] });
  const old = {
    ...record,
    modelVersion: "mvp-0",
    selectedIndexIds: ["retired"],
  };
  await store.importProgress(
    JSON.stringify({ ...JSON.parse(original), completions: [old] }),
  );
  expect(store.getSnapshot().progress).toMatchObject({
    settings: { theme: "light", reduceMotion: true },
    completions: [record, old],
  });
});
it("rejects invalid imports before changing current data", async () => {
  const { store, map } = setup();
  await store.saveCompletion(record);
  const old = map.get(progressKey);
  const raw = JSON.parse(store.exportProgress());
  for (const input of [
    "{",
    " ".repeat(maxImportBytes + 1),
    JSON.stringify({ ...raw, schemaVersion: 2 }),
    JSON.stringify({
      ...raw,
      completions: [{ ...record, selectedIndexIds: ["unknown"] }],
    }),
    JSON.stringify({
      ...raw,
      completions: [{ ...record, levelId: "missing" }],
    }),
  ]) {
    expect(() => store.importProgress(input)).toThrow();
    expect(map.get(progressKey)).toBe(old);
  }
});
it("preserves unsupported storage and pending progress until explicit recovery", async () => {
  const { store, map } = setup();
  map.set(progressKey, "future data");
  map.set("elsewhere", "keep");
  expect(store.loadProgress().status).toBe("invalid");
  await store.saveCompletion(record);
  expect(map.get(progressKey)).toBe("future data");
  expect(store.getSnapshot().progress.completions).toEqual([record]);
  await store.resetProgress();
  expect(map.has(progressKey)).toBe(false);
  expect(map.get("elsewhere")).toBe("keep");
});
it("keeps a failed write in memory and merges with another tab on retry", async () => {
  const { store, api, map, make } = setup();
  const set = api.setItem;
  api.setItem = () => {
    throw new Error("quota");
  };
  await store.saveCompletion(record);
  expect(store.getSnapshot()).toMatchObject({
    status: "unavailable",
    progress: { completions: [record] },
  });
  api.setItem = set;
  const other = make();
  await other.saveCompletion({
    ...record,
    levelId: levels[1].id,
    selectedIndexIds: [],
  });
  await store.saveSettings({ theme: "system", reduceMotion: false });
  expect(JSON.parse(map.get(progressKey) ?? "").completions).toHaveLength(2);
});
it("stays usable when localStorage access throws", async () => {
  const store = createProgressStore(levels, () => {
    throw new Error("blocked");
  });
  expect(store.loadProgress().status).toBe("unavailable");
  await store.saveCompletion(record);
  expect(JSON.parse(store.exportProgress()).completions).toEqual([record]);
});
