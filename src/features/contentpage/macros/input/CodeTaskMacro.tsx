"use client";

import { useState, useEffect } from "react";
import type { CodeTaskMacro as CodeTaskMacroType } from "@schema/macroTypes";
import type { MacroComponentProps } from "@features/contentpage/macros/types";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { CollapsibleSection } from "@features/contentpage/components/CollapsibleSection/CollapsibleSection";
import { getMarkdown } from "@features/contentpage/utils/textUtils";
import { useWorksheetStorage } from "@features/contentpage/storage/WorksheetStorageContext";
import { CodeRunner, type CodeRunnerResult } from "@features/contentpage/components/CodeRunner/CodeRunner";
import { useTsRunner } from "@features/contentpage/components/CodeRunner/useTsRunner";
import { Stack } from "@components/Stack";

type Props = MacroComponentProps<CodeTaskMacroType>;

function getTestResult(
  lastPassed: boolean | null,
  runtimeError: string | null,
  hasValidation: boolean
): CodeRunnerResult | null {
  if (lastPassed === null) return null;

  if (hasValidation) {
    return lastPassed ? "success" : "failure";
  }

  // No validation: show "compiled" on success, "failure" on runtime error
  if (runtimeError) return "failure";
  return "compiled";
}

export function CodeTaskMacro({ macro, context }: Props) {
  const storage = useWorksheetStorage();
  const [code, setCode] = useState(macro.starter || "");
  const [isChecked, setIsChecked] = useState(false);

  const { isLoading, diagnostics, consoleOutput, runtimeError, hadRuntime, lastPassed, runCode } =
    useTsRunner();

  // Load persisted state
  useEffect(() => {
    if (context.persistState && context.storageKey && storage) {
      const saved = storage.readResponse(context.storageKey);
      if (saved) {
        setCode(saved);
      }
    }
  }, [context.persistState, context.storageKey, storage]);

  // Save state when it changes
  useEffect(() => {
    if (context.persistState && context.storageKey && storage && code !== macro.starter) {
      storage.saveResponse(context.storageKey, code);
    }
  }, [context.persistState, context.storageKey, storage, code, macro.starter]);

  // Respond to check trigger
  useEffect(() => {
    if (context.checkTrigger && context.checkTrigger > 0) {
      setIsChecked(true);
      if (macro.validation) {
        runCode({ code, validate: true, validation: macro.validation });
      } else {
        runCode({ code, validate: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.checkTrigger]);

  const handleRun = () => {
    runCode({ code, validate: false });
  };

  const instruction = getMarkdown(macro.instruction);
  const hint = getMarkdown(macro.hint);
  const solution = getMarkdown(macro.solution);

  return (
    <Stack gap="md">
      {instruction && <MarkdownRenderer markdown={instruction} />}

      <CodeRunner
        code={code}
        onChange={setCode}
        onRun={handleRun}
        rows={Math.max(3, code.split("\n").length)}
        isLoading={isLoading}
        diagnostics={diagnostics}
        runtimeError={runtimeError}
        consoleOutput={consoleOutput}
        hadRuntime={hadRuntime}
        testResult={getTestResult(lastPassed, runtimeError, Boolean(macro.validation))}
        hasValidation={Boolean(macro.validation)}
      />

      {(hint || (isChecked && solution)) && (
        <Stack gap="sm">
          {hint && (
            <CollapsibleSection type="hint" content={<MarkdownRenderer markdown={hint} />} />
          )}
          {isChecked && solution && (
            <CollapsibleSection
              type="solution"
              defaultOpen={!macro.validation}
              content={<MarkdownRenderer markdown={solution} />}
            />
          )}
        </Stack>
      )}
    </Stack>
  );
}
