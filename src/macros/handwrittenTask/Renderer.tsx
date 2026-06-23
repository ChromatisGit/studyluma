"use client";

import { useState } from "react";
import type { HandwrittenTaskMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { CollapsibleSection } from "@features/contentpage/components/CollapsibleSection/CollapsibleSection";
import { getMarkdown } from "@macros/markdownParser";
import { useMacroCheck } from "@macros/state/useMacroCheck";
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

  if (context.pdfSection) {
    return (
      <Stack gap="md">
        {instruction && <MarkdownRenderer markdown={instruction} />}
        {hint && (
          <Stack gap="sm">
            <CollapsibleSection type="hint" content={<MarkdownRenderer markdown={hint} />} />
          </Stack>
        )}
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {instruction && <MarkdownRenderer markdown={instruction} />}
      {(hint || (isChecked && answer) || (isChecked && why && solutionsUnlocked)) && (
        <Stack gap="sm">
          {hint && (
            <CollapsibleSection type="hint" content={<MarkdownRenderer markdown={hint} />} />
          )}
          {isChecked && answer && (
            <CollapsibleSection
              type="answer"
              defaultOpen={false}
              content={<MarkdownRenderer markdown={answer} />}
            />
          )}
          {isChecked && why && solutionsUnlocked && (
            <CollapsibleSection
              type="why"
              defaultOpen={false}
              content={<MarkdownRenderer markdown={why} />}
            />
          )}
        </Stack>
      )}
    </Stack>
  );
}
