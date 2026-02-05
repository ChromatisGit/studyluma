"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { TextTaskMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { CollapsibleSection } from "@features/contentpage/components/CollapsibleSection/CollapsibleSection";
import { getMarkdown } from "@macros/markdownParser";
import { useWorksheetStorage } from "@features/contentpage/storage/WorksheetStorageContext";
import { Stack } from "@components/Stack";
import styles from "./styles.module.css";
import MACROS_TEXT from "@macros/macros.de.json";

type Props = MacroComponentProps<TextTaskMacro>;

export default function TextTaskRenderer({ macro, context }: Props) {
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

  // Respond to check trigger - only if task was attempted (answer not empty)
  useEffect(() => {
    if (context.checkTrigger && context.checkTrigger > 0 && answer.trim().length > 0) {
      setIsChecked(true);
    }
  }, [context.checkTrigger, answer]);

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
        placeholder={MACROS_TEXT.textTask.placeholder}
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
