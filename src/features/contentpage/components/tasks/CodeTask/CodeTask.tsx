"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";


import { CodeRunner } from "@features/contentpage/components/CodeRunner/CodeRunner";
import { useTsRunner } from "@features/contentpage/components/CodeRunner/useTsRunner";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { useTaskPersistence } from "@features/contentpage/storage/useTaskPersistence";
import sharedStyles from "@features/contentpage/styles/shared.module.css";
import type { CodeTaskMacro } from "@domain/macroTypes";
import { CollapsibleSection } from "@features/contentpage/components/CollapsibleSection/CollapsibleSection";
import { getMarkdown } from "@features/contentpage/utils/textUtils";

interface CodeTaskProps {
  task: CodeTaskMacro;
  isSingleTask?: boolean;
  triggerCheck: number;
  taskKey: string;
}

export function CodeTask({ task, isSingleTask = false, triggerCheck, taskKey }: CodeTaskProps) {
  const { value: code, setValue: setCode, worksheetId } = useTaskPersistence<string>(
    taskKey,
    task.starter,
    {
      serialize: (value) => value,
      deserialize: (raw) => raw,
    }
  );
  const [showValidation, setShowValidation] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const lastHandledCheckRef = useRef(0);

  const {
    isLoading,
    diagnostics,
    consoleOutput,
    runtimeError,
    lastPassed,
    hadRuntime,
    runCode,
  } = useTsRunner();

  const instructionText = getMarkdown(task.instruction) ?? "";
  const hintText = getMarkdown(task.hint) ?? null;
  const solutionText = getMarkdown(task.solution) ?? null;
  const hasValidation = Boolean(task.validation?.trim());
  // Compute number of rows for editor from solution length
  const solutionLines = solutionText ? solutionText.split('\n').length : 10;
  const codeRows = Math.max(6, solutionLines + 1);
  const hasTypeErrors = diagnostics.some((diag) => diag.category === "error");

  // Derive testResult from lastPassed + showValidation
  const testResult: "success" | "failure" | null = (() => {
    if (!showValidation || isLoading) return null;
    if (hasValidation) {
      if (lastPassed === null) return null;
      return lastPassed ? "success" : "failure";
    }
    if (hasTypeErrors || runtimeError) return "failure";
    if (hadRuntime) return "success";
    return null;
  })();

  // Reset state when code changes
  const handleCodeChange = (value: string) => {
    setCode(value);
    setShowValidation(false);
  };

  useEffect(() => {
    setShowValidation(false);
    setIsChecked(false);
    lastHandledCheckRef.current = 0;
  }, [worksheetId]);

  const handleRunCode = () => {
    setShowValidation(false);
    runCode({
      code,
      validation: task.validation,
      validate: false,
    });
  };

  useEffect(() => {
    if (triggerCheck === lastHandledCheckRef.current) return;
    lastHandledCheckRef.current = triggerCheck;

    if (triggerCheck > 0 && code !== task.starter) {
      setShowValidation(true);
      setIsChecked(true);
      runCode({
        code,
        validation: task.validation,
        validate: hasValidation,
      });
    }
  }, [code, hasValidation, runCode, task.starter, task.validation, triggerCheck]);

  // -----------------------------
  // Render helpers
  // -----------------------------

  const renderHintAndSolution = () => {
    const hasHint = Boolean(hintText);
    const hasSolution = Boolean(solutionText && isChecked);

    if (!hasHint && !hasSolution) return null;

    return (
      <div className={sharedStyles.stackSmall}>
        {hasHint && hintText ? (
          <CollapsibleSection type="hint" content={<MarkdownRenderer markdown={hintText} />} />
        ) : null}

        {hasSolution && (
          <CollapsibleSection
            type="solution"
            defaultOpen={!hasValidation}
            content={<MarkdownRenderer markdown={solutionText!} />}
          />
        )}
      </div>
    );
  };

  // -----------------------------
  // Render
  // -----------------------------

  return (
    <div className={clsx(sharedStyles.stackMedium, isSingleTask && sharedStyles.stackTight)}>
      <div className={sharedStyles.bodyText}>
        <MarkdownRenderer markdown={instructionText} />
      </div>

      <CodeRunner
        code={code}
        onChange={handleCodeChange}
        onRun={handleRunCode}
        rows={codeRows}
        isLoading={isLoading}
        diagnostics={diagnostics}
        consoleOutput={consoleOutput}
        runtimeError={runtimeError}
        hadRuntime={hadRuntime}
        testResult={testResult}
        hasValidation={hasValidation}
      />
      {renderHintAndSolution()}
    </div>
  );
}
