import { useState, useEffect, useRef, useCallback } from "react";
import type { TextTaskMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { MarkdownRenderer } from "@components/MarkdownRenderer";
import { getMarkdown } from "@macros/markdownParser";
import { useMacroValue } from "@macros/state/useMacroValue";
import { useMacroCheck } from "@macros/state/useMacroCheck";
import { TaskFeedback } from "@macros/TaskFeedback";
import { Stack } from "@components/Stack";
import styles from "./styles.module.css";
import MACROS_TEXT from "@macros/macros.de.json";

type Props = MacroComponentProps<TextTaskMacro>;

export default function TextTaskRenderer({ macro, context }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [answer, setAnswer] = useMacroValue<string>(context.storageKey, "");
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

  const isAttempted = answer.trim().length > 0;
  useMacroCheck(context, isAttempted, () => setIsChecked(true));

  const instruction = getMarkdown(macro.instruction);
  const hint = getMarkdown(macro.hint);
  const answerMd = getMarkdown(macro.answer);
  const why = getMarkdown(macro.why);

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

      <TaskFeedback hint={hint} answer={answerMd} why={why} showAnswer={isChecked} showWhy={isChecked} />
    </Stack>
  );
}
