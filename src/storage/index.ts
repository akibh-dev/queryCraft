import {
  type Completion,
  completionSchema,
  type LevelDefinition,
  type Progress,
  progressSchema,
  type Settings,
  settingsSchema,
  validateAttempt,
} from "../domain";

export const progressKey = "querycraft.progress.v1";
export const maxImportBytes = 256 * 1024;
const emptyProgress = (): Progress => ({
  schemaVersion: 1,
  completions: [],
  settings: { theme: "dark", reduceMotion: false },
});
type Change = (progress: Progress) => Progress;
type StorageAccess = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Lock = (write: () => void) => Promise<void>;
type SaveStatus = "saved" | "unavailable" | "invalid";
type Snapshot = { progress: Progress; status: SaveStatus };

function merge(records: Completion[], incoming: Completion[]): Completion[] {
  const combined = [...records];
  for (const record of incoming) {
    const i = combined.findIndex(
      (item) =>
        item.levelId === record.levelId &&
        item.levelVersion === record.levelVersion &&
        item.modelVersion === record.modelVersion,
    );
    if (i < 0) combined.push(record);
    else if (combined[i].stars < record.stars) combined[i] = record;
  }
  if (combined.length > 256)
    throw new Error("Progress exceeds the limit of 256 completion records.");
  return combined;
}
function browserLock(write: () => void) {
  if (typeof navigator !== "undefined" && navigator.locks)
    return navigator.locks.request(progressKey, write);
  write();
  return Promise.resolve();
}

export function createProgressStore(
  levels: readonly LevelDefinition[],
  access: () => StorageAccess = () => window.localStorage,
  lock: Lock = browserLock,
) {
  const listeners = new Set<() => void>();
  let snapshot: Snapshot = { progress: emptyProgress(), status: "saved" };
  let pending: Change[] = [];
  let pendingReset = false;
  let writes = Promise.resolve();
  function publish(progress: Progress, status: SaveStatus) {
    snapshot = { progress, status };
    for (const listener of listeners) listener();
  }
  function validateRecord(raw: unknown) {
    const record = completionSchema.parse(raw);
    const level = levels.find((entry) => entry.id === record.levelId);
    if (!level) throw new Error("Progress contains an unknown level.");
    if (record.levelVersion > level.levelVersion)
      throw new Error("Progress requires a newer level version.");
    if (
      record.modelVersion === level.modelVersion &&
      record.levelVersion === level.levelVersion
    )
      validateAttempt(level, { selectedIndexIds: record.selectedIndexIds });
    return record;
  }
  function decode(json: string) {
    const progress = progressSchema.parse(JSON.parse(json));
    return {
      ...progress,
      completions: merge([], progress.completions.map(validateRecord)),
    };
  }
  function read(): Snapshot {
    let raw: string | null;
    try {
      raw = access().getItem(progressKey);
    } catch {
      return { progress: snapshot.progress, status: "unavailable" };
    }
    if (raw === null) return { progress: emptyProgress(), status: "saved" };
    try {
      return { progress: decode(raw), status: "saved" };
    } catch {
      return { progress: snapshot.progress, status: "invalid" };
    }
  }
  function latest(): Snapshot {
    if (pendingReset)
      return {
        progress: pending.reduce((p, change) => change(p), emptyProgress()),
        status: "unavailable",
      };
    const disk = read();
    return disk.status === "saved"
      ? {
          progress: pending.reduce((p, change) => change(p), disk.progress),
          status: "saved",
        }
      : disk;
  }
  function loadProgress() {
    const { progress, status } = latest();
    publish(
      progress,
      pending.length && status === "saved" ? "unavailable" : status,
    );
    return snapshot;
  }
  function enqueue(write: () => void) {
    const operation = writes.then(async () => {
      let started = false;
      try {
        await lock(() => {
          started = true;
          write();
        });
      } catch (err) {
        if (started) throw err;
        write();
      }
    });
    writes = operation.catch(() => {});
    return operation;
  }
  function update(change: Change) {
    return enqueue(() => {
      const current = latest();
      const progress = change(current.progress);
      const raw = JSON.stringify(progress);
      if (current.status !== "saved" && !pendingReset) {
        pending.push(change);
        publish(progress, current.status);
        return;
      }
      try {
        access().setItem(progressKey, raw);
      } catch {
        pending.push(change);
        publish(progress, "unavailable");
        return;
      }
      pending = [];
      pendingReset = false;
      publish(progress, "saved");
    });
  }
  function importData(json: string) {
    if (
      json.length > maxImportBytes ||
      new TextEncoder().encode(json).length > maxImportBytes
    )
      throw new Error("Import a file of 256 KiB or less.");
    return decode(json);
  }
  function importedChange(json: string): Change {
    const incoming = importData(json);
    return (current) => ({
      ...current,
      completions: merge(current.completions, incoming.completions),
    });
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    loadProgress,
    exportProgress: () => JSON.stringify(snapshot.progress, null, 2),
    previewImport: (json: string) => importedChange(json)(snapshot.progress),
    importProgress: (json: string) => update(importedChange(json)),
    saveCompletion(raw: Completion) {
      const record = validateRecord(raw);
      return update((p) => ({
        ...p,
        completions: merge(p.completions, [record]),
      }));
    },
    saveSettings(input: Settings) {
      const settings = settingsSchema.parse(input);
      return update((p) => ({ ...p, settings }));
    },
    resetProgress() {
      return enqueue(() => {
        pending = [];
        try {
          access().removeItem(progressKey);
          pendingReset = false;
          publish(emptyProgress(), "saved");
        } catch {
          pendingReset = true;
          publish(emptyProgress(), "unavailable");
        }
      });
    },
  };
}
export type ProgressStore = ReturnType<typeof createProgressStore>;
