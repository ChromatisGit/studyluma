"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { TextTaskMacro as TextTaskMacroType } from "@schema/macroTypes";
import type { MacroComponentProps } from "@features/contentpage/macros/types";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { CollapsibleSection } from "@features/contentpage/components/CollapsibleSection/CollapsibleSection";
import { getMarkdown } from "@features/contentpage/utils/textUtils";
import { useWorksheetStorage } from "@features/contentpage/storage/WorksheetStorageContext";
import { Stack } from "@components/Stack";
import styles from "./TextTaskMacro.module.css";
import CONTENTPAGE_TEXT from "../../contentpage.de.json";

type Props = MacroComponentProps<TextTaskMacroType>;

export function TextTaskMacro({ macro, context }: Props) {
  const storage = useWorksheetStorage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [answer, setAnswer] = useState("");
  const [isChecked, setIsChecked] = useState(false);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(100, textarea.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [answer, adjustHeight]);

  // Load persisted state
  useEffect(() => {
    if (context.persistState && context.storageKey && storage) {
      const saved = storage.readResponse(context.storageKey);
      if (saved) {
        setAnswer(saved);
      }
    }
  }, [context.persistState, context.storageKey, storage]);

  // Save state when it changes
  useEffect(() => {
    if (context.persistState && context.storageKey && storage && answer) {
      storage.saveResponse(context.storageKey, answer);
    }
  }, [context.persistState, context.storageKey, storage, answer]);

  // Respond to check trigger
  useEffect(() => {
    if (context.checkTrigger && context.checkTrigger > 0) {
      setIsChecked(true);
    }
  }, [context.checkTrigger]);

  const instruction = getMarkdown(macro.instruction);
  const hint = getMarkdown(macro.hint);
  const solution = getMarkdown(macro.solution);

  return (
    <Stack gap="md">
      {instruction && <MarkdownRenderer markdown={instruction} />}

      <textarea
        ref={textareaRef}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        className={styles.textarea}
        rows={4}
        placeholder={CONTENTPAGE_TEXT.freeResponseTask.placeholder}
      />

      {(hint || (isChecked && solution)) && (
        <Stack gap="sm">
          {hint && (
            <CollapsibleSection type="hint" content={<MarkdownRenderer markdown={hint} />} />
          )}
          {isChecked && solution && (
            <CollapsibleSection
              type="solution"
              defaultOpen
              content={<MarkdownRenderer markdown={solution} />}
            />
          )}
        </Stack>
      )}
    </Stack>
  );
}
