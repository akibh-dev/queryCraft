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

const byteLength = (json: string) => new TextEncoder().encode(json).length;

function historicalRecord(modelVersion: string, choices: number) {
  return {
    ...record,
    modelVersion,
    selectedIndexIds: Array.from(
      { length: choices },
      (_, i) => `${"é".repeat(120)}${i}`,
    ).sort(),
  };
}

function documentWith(completions: (typeof record)[]) {
  return {
    schemaVersion: 1,
    completions,
    settings: { theme: "dark", reduceMotion: false },
  };
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
it("round trips compact exports even when indentation would exceed the limit", async () => {
  const { store, make, map } = setup();
  const progress = documentWith([historicalRecord("old-1", 1_040)]);
  const pretty = JSON.stringify(progress, null, 2);
  const compact = JSON.stringify(progress);
  const atLimit = compact.padEnd(
    compact.length + maxImportBytes - byteLength(compact),
  );
  expect(byteLength(pretty)).toBeGreaterThan(maxImportBytes);
  expect(byteLength(atLimit)).toBe(maxImportBytes);
  expect(() => store.previewImport(`${atLimit} `)).toThrow("256 KiB");
  await store.importProgress(atLimit);
  expect(store.exportProgress()).toBe(compact);

  map.set(progressKey, pretty);
  const fresh = make();
  expect(fresh.loadProgress()).toEqual({ progress, status: "saved" });
  await store.resetProgress();
  await store.importProgress(fresh.exportProgress());
  expect(store.getSnapshot().progress).toEqual(progress);
});
it("rejects oversized merged progress without changing saved or in-memory data", async () => {
  const { store, map } = setup();
  const first = JSON.stringify(documentWith([historicalRecord("old-1", 600)]));
  const second = historicalRecord("old-2", 600);
  const incoming = JSON.stringify(documentWith([second]));
  expect(byteLength(first)).toBeLessThan(maxImportBytes);
  expect(byteLength(incoming)).toBeLessThan(maxImportBytes);
  await store.importProgress(first);
  const before = store.getSnapshot();
  expect(() => store.previewImport(incoming)).toThrow("256 KiB");
  await expect(store.importProgress(incoming)).rejects.toThrow("256 KiB");
  await expect(store.saveCompletion(second)).rejects.toThrow("256 KiB");
  expect(store.getSnapshot()).toBe(before);
  expect(map.get(progressKey)).toBe(first);
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
  const future = JSON.stringify({ ...documentWith([]), schemaVersion: 2 });
  map.set(progressKey, future);
  map.set("elsewhere", "keep");
  expect(store.loadProgress().status).toBe("invalid");
  await store.saveCompletion(record);
  expect(map.get(progressKey)).toBe(future);
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
it("preserves pending progress when another tab fills the available capacity", async () => {
  const { store, api, map, make } = setup();
  const waiting = historicalRecord("old-1", 600);
  const stored = historicalRecord("old-2", 600);
  const set = api.setItem;
  api.setItem = () => {
    throw new Error("quota");
  };
  await store.saveCompletion(waiting);
  api.setItem = set;
  const other = make();
  await other.saveCompletion(stored);
  expect(store.loadProgress()).toEqual({
    progress: documentWith([waiting]),
    status: "unavailable",
  });
  const settings = { theme: "light" as const, reduceMotion: true };
  await store.saveSettings(settings);
  expect(store.getSnapshot()).toEqual({
    progress: { ...documentWith([waiting]), settings },
    status: "unavailable",
  });
  expect(map.get(progressKey)).toBe(other.exportProgress());
  await other.resetProgress();
  await store.saveSettings(settings);
  expect(map.get(progressKey)).toBe(store.exportProgress());
  expect(store.getSnapshot()).toEqual({
    progress: { ...documentWith([waiting]), settings },
    status: "saved",
  });
});
it("stays usable when localStorage access throws", async () => {
  const store = createProgressStore(levels, () => {
    throw new Error("blocked");
  });
  expect(store.loadProgress().status).toBe("unavailable");
  await store.saveCompletion(record);
  expect(JSON.parse(store.exportProgress()).completions).toEqual([record]);
});
