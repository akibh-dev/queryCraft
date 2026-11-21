import { useState } from "react";
import type { CampaignEntry } from "../content";
import type { Completion } from "../domain";
import {
  Challenge,
  type ChallengeDraft,
  initialDraft,
} from "../features/challenge";
import type { ProgressStore } from "../storage";
import { navigate } from "./navigation";

const drafts = new Map<string, ChallengeDraft>();
export const submitted = new Map<string, Completion>();
export function clearSession() {
  drafts.clear();
  submitted.clear();
}
export function Play({
  entry,
  index,
  total,
  store,
}: {
  entry: CampaignEntry;
  index: number;
  total: number;
  store: ProgressStore;
}) {
  const { level, fixture } = entry;
  const [draft, setDraft] = useState(
    () => drafts.get(level.id) ?? initialDraft(level),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <Challenge
        level={level}
        fixture={fixture}
        draft={draft}
        position={index + 1}
        total={total}
        submitting={submitting}
        onChange={(next) => {
          drafts.set(level.id, next);
          setDraft(next);
        }}
        onSubmit={async (result, evaluation) => {
          if (
            submitting ||
            !evaluation.passed ||
            !evaluation.stars ||
            draft.stale ||
            draft.lastRun !== result
          )
            return;
          const record: Completion = {
            levelId: level.id,
            levelVersion: level.levelVersion,
            modelVersion: level.modelVersion,
            stars: evaluation.stars,
            selectedIndexIds: result.selectedIndexIds,
          };
          setSubmitting(true);
          try {
            await store.saveCompletion(record);
            submitted.set(level.id, record);
            drafts.delete(level.id);
            navigate(`/levels/${level.id}/debrief`);
          } catch {
            setError("Could not record this solution. Try submitting again.");
          } finally {
            setSubmitting(false);
          }
        }}
      />
      {error && <p role="alert">{error}</p>}
      <a href="/levels">Back to level map</a>
    </>
  );
}
