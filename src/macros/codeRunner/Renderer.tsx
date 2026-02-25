"use client";

import { useEffect } from "react";
import type { CodeRunnerMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { CodeRunner } from "@features/contentpage/components/CodeRunner/CodeRunner";
import { useTsRunner } from "@features/contentpage/components/CodeRunner/useTsRunner";
import { useMacroValue } from "@macros/state/useMacroValue";
import { useMacroState } from "@macros/state/MacroStateContext";

type CodeRunnerOutput = {
  consoleOutput: string;
  runtimeError: string | null;
  hadRuntime: boolean;
};

const EMPTY_OUTPUT: CodeRunnerOutput = {
  consoleOutput: "",
  runtimeError: null,
  hadRuntime: false,
};

type Props = MacroComponentProps<CodeRunnerMacro>;

export default function CodeRunnerRenderer({ macro, context }: Props) {
  const adapter = useMacroState();
  const [code, setCode] = useMacroValue<string>(context.storageKey, macro.code);
  const isReadOnly = context.readOnly ?? false;

  const outputKey = context.storageKey ? `${context.storageKey}:output` : undefined;
  const [syncedOutput, setSyncedOutput] = useMacroValue<CodeRunnerOutput>(outputKey, EMPTY_OUTPUT);

  const { isLoading, diagnostics, consoleOutput, runtimeError, hadRuntime, runCode } =
    useTsRunner();

  // Presenter: after running code, sync output to projector
  useEffect(() => {
    if (!isReadOnly && hadRuntime) {
      setSyncedOutput({ consoleOutput, runtimeError, hadRuntime });
    }
  }, [isReadOnly, consoleOutput, runtimeError, hadRuntime, setSyncedOutput]);

  // Use local output on presenter, synced output on projector
  const displayOutput = isReadOnly && adapter
    ? syncedOutput
    : { consoleOutput, runtimeError, hadRuntime };

  const handleRun = () => {
    runCode({ code, validate: false });
  };

  return (
    <CodeRunner
      code={code}
      onChange={setCode}
      onRun={handleRun}
      rows={Math.max(1, code.split("\n").length)}
      readOnly={isReadOnly}
      isLoading={isLoading}
      diagnostics={diagnostics}
      runtimeError={displayOutput.runtimeError}
      consoleOutput={displayOutput.consoleOutput}
      hadRuntime={displayOutput.hadRuntime}
    />
  );
}
