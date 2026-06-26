"use client";

import { useState } from "react";
import type { HandwrittenTaskMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { MarkdownRenderer } from "@components/MarkdownRenderer";
import { getMarkdown } from "@macros/markdownParser";
import { useMacroCheck } from "@macros/state/useMacroCheck";
import { TaskFeedback } from "@macros/TaskFeedback";
import { Stack } from "@components/Stack";

export default function HandwrittenTaskRenderer({ macro, context }: MacroComponentProps<HandwrittenTaskMacro>) {
  const [isChecked, setIsChecked] = useState(false);

  // handwritten tasks are always "attempted" — the student has to work on paper
  useMacroCheck(context, true, () => setIsChecked(true));

  const instruction = getMarkdown(macro.instruction);
  const hint = getMarkdown(macro.hint);
  const answer = getMarkdown(macro.answer);
  const why = getMarkdown(macro.why);
  // No teacher-unlock feature yet - `solutionsUnlocked` defaults to unlocked.
  const solutionsUnlocked = context.solutionsUnlocked !== false;
  const feedback = (
    <TaskFeedback
      hint={hint}
      answer={answer}
      why={why}
      showAnswer={isChecked}
      showWhy={isChecked && solutionsUnlocked}
      answerDefaultOpen={false}
      whyDefaultOpen={false}
    />
  );

  if (context.pdfSection) {
    return (
      <Stack gap="md">
        {instruction && <MarkdownRenderer markdown={instruction} />}
        {hint && <TaskFeedback hint={hint} />}
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {instruction && <MarkdownRenderer markdown={instruction} />}
      {feedback}
    </Stack>
  );
}
