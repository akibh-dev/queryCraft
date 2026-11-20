import type {
  Evaluation,
  LevelDefinition,
  SimulationResult,
} from "../../domain";

export type ChallengeDraft = {
  selectedIndexIds: string[];
  lastRun: SimulationResult | null;
  stale: boolean;
  hintsShown: number;
};

export function initialDraft(level: LevelDefinition): ChallengeDraft {
  return {
    selectedIndexIds: [...level.initialIndexIds].sort(),
    lastRun: null,
    stale: false,
    hintsShown: 0,
  };
}

export function toggleIndex(draft: ChallengeDraft, id: string): ChallengeDraft {
  const ids = new Set(draft.selectedIndexIds);
  if (ids.has(id)) ids.delete(id);
  else ids.add(id);
  return {
    ...draft,
    selectedIndexIds: [...ids].sort(),
    stale: !!draft.lastRun,
  };
}

export function canSubmit(draft: ChallengeDraft, evaluation: Evaluation) {
  return (
    !!draft.lastRun &&
    !draft.stale &&
    evaluation.passed &&
    draft.selectedIndexIds.length === draft.lastRun.selectedIndexIds.length &&
    draft.selectedIndexIds.every(
      (id, i) => draft.lastRun?.selectedIndexIds[i] === id,
    )
  );
}
