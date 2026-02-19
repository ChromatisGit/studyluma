"use client";

import { useState } from "react";
import type { CodeTaskMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { CollapsibleSection } from "@features/contentpage/components/CollapsibleSection/CollapsibleSection";
import { getMarkdown } from "@macros/markdownParser";
import { useMacroValue } from "@macros/state/useMacroValue";
import { useMacroCheck } from "@macros/state/useMacroCheck";
import { CodeRunner, type CodeRunnerResult } from "@features/contentpage/components/CodeRunner/CodeRunner";
import { useTsRunner } from "@features/contentpage/components/CodeRunner/useTsRunner";
import { Stack } from "@components/Stack";

type Props = MacroComponentProps<CodeTaskMacro>;

export default function CodeTaskRenderer({ macro, context }: Props) {
  const [code, setCode] = useMacroValue<string>(context.storageKey, macro.starter || "");
  const [isChecked, setIsChecked] = useState(false);
  const [isValidateRun, setIsValidateRun] = useState(false);

  const { isLoading, diagnostics, consoleOutput, runtimeError, hadRuntime, lastPassed, runCode } =
    useTsRunner();

  const isAttempted = code !== (macro.starter || "");

  useMacroCheck(context, isAttempted, () => {
    setIsChecked(true);
    setIsValidateRun(true);
    if (macro.validation) {
      runCode({ code, validate: true, validation: macro.validation });
    } else {
      runCode({ code, validate: false });
    }
  });

  const handleRun = () => {
    setIsValidateRun(false);
    runCode({ code, validate: false });
  };

  // Only show a pass/fail/compiled result when the run was triggered by validation.
  // Manual runs just show raw console output with a neutral label.
  const testResult: CodeRunnerResult | null = (() => {
    if (!isValidateRun || lastPassed === null) return null;
    if (macro.validation) return lastPassed ? "success" : "failure";
    if (runtimeError) return "failure";
    return "compiled";
  })();

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
        testResult={testResult}
        hasValidation={Boolean(macro.validation)}
      />

      {(() => {
        const showSolution = isChecked && solution;

        if (!hint && !showSolution) return null;

        return (
          <Stack gap="sm">
            {hint && (
              <CollapsibleSection type="hint" content={<MarkdownRenderer markdown={hint} />} />
            )}
            {showSolution && (
              <CollapsibleSection
                type="solution"
                defaultOpen={testResult === "compiled"}
                content={<MarkdownRenderer markdown={solution} />}
              />
            )}
          </Stack>
        );
      })()}
    </Stack>
  );
}
