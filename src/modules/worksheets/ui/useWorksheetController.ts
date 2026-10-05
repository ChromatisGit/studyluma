import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { ViewerRole } from "../../viewer";
import type { Chapter, PartResponse } from "../domain/contract";
import { indexChapter } from "../domain/structure";
import { chapterStore } from "../infrastructure/localChapterStore";
import { emptyResponse, writeInput, type FieldRef } from "./fieldValues";
import { initialUi, type UiState, type WorksheetLinks } from "./uiState";
import { useActiveField } from "./useActiveField";
import { useChecking } from "./useChecking";

/** Everything a worksheet page needs: data, saved state, page state, actions. */
export function useWorksheetController(
  chapter: Chapter,
  viewer: ViewerRole,
  links: WorksheetLinks,
) {
  const index = useMemo(() => indexChapter(chapter), [chapter]);
  const store = chapterStore(chapter.id);
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const [ui, setUi] = useState(initialUi);

  const response = useCallback(
    (partId: string): PartResponse =>
      store.getSnapshot().responses[partId] ?? emptyResponse(),
    [store],
  );

  const markSaved = useCallback(
    (partId: string) => {
      const aufgabeId = index.parts.get(partId)?.info.aufgabe.id;
      if (aufgabeId) {
        setUi((current) =>
          current.saved[aufgabeId] && !current.emptyNote[aufgabeId]
            ? current
            : {
                ...current,
                saved: { ...current.saved, [aufgabeId]: true },
                emptyNote: { ...current.emptyNote, [aufgabeId]: false },
              },
        );
      }
    },
    [index],
  );

  /** Saves one input; its mark disappears until the next check. */
  const setInput = useCallback(
    (ref: Omit<FieldRef, "key">, value: unknown) => {
      const entry = index.parts.get(ref.partId);
      if (!entry) {
        return;
      }
      store.setResponse(
        ref.partId,
        writeInput(entry.part, response(ref.partId), ref, value),
      );
      markSaved(ref.partId);
    },
    [index, store, response, markSaved],
  );

  const setResponseValue = useCallback(
    (partId: string, change: (response: PartResponse) => PartResponse) => {
      store.setResponse(partId, change(response(partId)));
      markSaved(partId);
    },
    [store, response, markSaved],
  );

  const checking = useChecking(index, store, response, ui.help, setUi);
  const field = useActiveField(index, response, setInput);

  return {
    chapter,
    index,
    viewer,
    teacher: viewer === "teacher",
    links,
    state,
    store,
    ui,
    setUi,
    response,
    setInput,
    setResponseValue,
    ...checking,
    ...field,
  };
}

export type WorksheetController = ReturnType<typeof useWorksheetController>;

export type { UiState, WorksheetLinks };
