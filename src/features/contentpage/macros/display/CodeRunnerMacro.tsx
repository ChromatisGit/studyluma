"use client";

import type { CodeRunnerMacro as CodeRunnerMacroType } from "@domain/macroTypes";
import type { MacroComponentProps } from "../types";
import { CodeRunner } from "../../components/CodeRunner/CodeRunner";
import { useTsRunner } from "../../components/CodeRunner/useTsRunner";

type Props = MacroComponentProps<CodeRunnerMacroType>;

export function CodeRunnerMacro({ macro }: Props) {
  const { isLoading, diagnostics, consoleOutput, runtimeError, hadRuntime, runCode } =
    useTsRunner();

  const handleRun = () => {
    runCode({ code: macro.code, validate: false });
  };

  return (
    <CodeRunner
      code={macro.code}
      onChange={() => {}}
      onRun={handleRun}
      rows={Math.max(1, macro.code.split("\n").length)}
      readOnly
      isLoading={isLoading}
      diagnostics={diagnostics}
      runtimeError={runtimeError}
      consoleOutput={consoleOutput}
      hadRuntime={hadRuntime}
    />
  );
}
