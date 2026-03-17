"use client";

import { useEffect } from "react";
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

type Props = {
  code: string;
  language: string;
  storageKey?: string;
  readOnly?: boolean;
};

export function SlideCodeRunner({ code: initialCode, language: _language, storageKey, readOnly = false }: Props) {
  const adapter = useMacroState();
  const [code, setCode] = useMacroValue<string>(storageKey, initialCode);

  const outputKey = storageKey ? `${storageKey}:output` : undefined;
  const [syncedOutput, setSyncedOutput] = useMacroValue<CodeRunnerOutput>(outputKey, EMPTY_OUTPUT);

  const { isLoading, diagnostics, consoleOutput, runtimeError, hadRuntime, runCode } =
    useTsRunner();

  useEffect(() => {
    if (!readOnly && hadRuntime) {
      setSyncedOutput({ consoleOutput, runtimeError, hadRuntime });
    }
  }, [readOnly, consoleOutput, runtimeError, hadRuntime, setSyncedOutput]);

  const displayOutput = readOnly && adapter
    ? syncedOutput
    : { consoleOutput, runtimeError, hadRuntime };

  return (
    <CodeRunner
      code={code}
      onChange={setCode}
      onRun={() => runCode({ code, validate: false })}
      rows={Math.max(3, code.split("\n").length)}
      readOnly={readOnly}
      isLoading={isLoading}
      diagnostics={diagnostics}
      consoleOutput={displayOutput.consoleOutput}
      runtimeError={displayOutput.runtimeError}
      hadRuntime={displayOutput.hadRuntime}
    />
  );
}
