"use client";

import type { CodeRunnerMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { CodeRunner } from "@features/contentpage/components/CodeRunner/CodeRunner";
import { useTsRunner } from "@features/contentpage/components/CodeRunner/useTsRunner";

type Props = MacroComponentProps<CodeRunnerMacro>;

export default function CodeRunnerRenderer({ macro }: Props) {
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
