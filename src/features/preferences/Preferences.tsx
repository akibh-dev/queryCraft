import { useRef, useState } from "react";
import type { Settings } from "../../domain";
import { maxImportBytes, type ProgressStore } from "../../storage";
import { Button, ChoiceField, FieldGroup, Panel } from "../../ui";
import styles from "./preferences.module.css";

export function Preferences({
  store,
  settings,
  onReset,
}: {
  store: ProgressStore;
  settings: Settings;
  onReset: () => void;
}) {
  const [preview, setPreview] = useState<{
    json: string;
    count: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileRequest = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  async function inspect(file?: File) {
    const request = ++fileRequest.current;
    setPreview(null);
    setError("");
    setNotice("");
    if (!file) return;
    try {
      if (file.size > maxImportBytes)
        throw new Error("Choose a file of 256 KiB or less.");
      const json = await file.text();
      if (request !== fileRequest.current) return;
      const result = store.previewImport(json);
      setPreview({ json, count: result.completions.length });
    } catch (err) {
      if (request === fileRequest.current)
        setError(
          file.size > maxImportBytes
            ? "Choose a file of 256 KiB or less."
            : err instanceof SyntaxError
              ? "This file is not valid JSON. Choose a QueryCraft progress export."
              : "This file contains invalid or unsupported progress. Choose a compatible export.",
        );
    }
  }
  function exportFile() {
    const url = URL.createObjectURL(
      new Blob([store.exportProgress()], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "querycraft-progress.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className={styles.grid}>
      <Panel className={styles.section}>
        <h2>Appearance</h2>
        <FieldGroup legend="Theme">
          {(["dark", "light", "system"] as const).map((theme) => (
            <ChoiceField
              key={theme}
              type="radio"
              name="theme"
              label={theme[0].toUpperCase() + theme.slice(1)}
              checked={settings.theme === theme}
              onChange={() => void store.saveSettings({ ...settings, theme })}
            />
          ))}
        </FieldGroup>
        <FieldGroup
          legend="Motion"
          description="Your device’s reduced-motion setting also applies."
        >
          <ChoiceField
            type="checkbox"
            label="Reduce motion"
            checked={settings.reduceMotion}
            onChange={(e) =>
              void store.saveSettings({
                ...settings,
                reduceMotion: e.target.checked,
              })
            }
          />
        </FieldGroup>
      </Panel>
      <Panel className={styles.section}>
        <h2>Progress on this device</h2>
        <p>
          QueryCraft saves your best results, index choices, and preferences in
          this browser. Export a copy to keep your scores or move them to
          another device.
        </p>
        <Button variant="secondary" onClick={exportFile}>
          Export progress
        </Button>
        <FieldGroup
          legend="Import progress"
          error={error}
          description="Import a QueryCraft JSON file up to 256 KiB. Higher scores are kept and your device preferences stay in place."
        >
          <label>
            Progress file{" "}
            <input
              ref={input}
              type="file"
              accept="application/json,.json"
              onChange={(e) => void inspect(e.target.files?.[0])}
            />
          </label>
        </FieldGroup>
        {preview && (
          <>
            <p>
              After import you will have {preview.count} saved completion{" "}
              {preview.count === 1 ? "record" : "records"}.
            </p>
            <Button
              onClick={async () => {
                try {
                  await store.importProgress(preview.json);
                  setPreview(null);
                  setNotice("Progress imported.");
                  if (input.current) input.current.value = "";
                } catch {
                  setError(
                    "Could not import this file. Choose a compatible export.",
                  );
                }
              }}
            >
              Apply import
            </Button>
          </>
        )}
        <button
          type="button"
          ref={trigger}
          className={styles.clear}
          onClick={() => {
            dialog.current?.showModal();
            cancel.current?.focus();
          }}
        >
          Clear progress
        </button>
        <dialog
          ref={dialog}
          aria-labelledby="confirm-clear"
          onClose={() => trigger.current?.focus()}
        >
          <h2 id="confirm-clear">Clear progress on this device?</h2>
          <p>
            This clears all QueryCraft completions and restores the default
            preferences.
          </p>
          <div className={styles.actions}>
            <button
              ref={cancel}
              type="button"
              className={styles.clear}
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <Button
              onClick={async () => {
                await store.resetProgress();
                onReset();
                fileRequest.current++;
                setPreview(null);
                setError("");
                if (input.current) input.current.value = "";
                setNotice("Progress cleared.");
                dialog.current?.close();
              }}
            >
              Confirm clear
            </Button>
          </div>
        </dialog>
        <p role="status">{notice}</p>
      </Panel>
    </div>
  );
}
