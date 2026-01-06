'use client';

import { Children, isValidElement, ReactNode, useMemo } from "react";
import { CodeRunner, useTsRunner } from "@components/CodeRunner";
import strings from "@components/components.de.json";

type CodeExampleProps = {
  children: ReactNode;
};

function childrenToCodeString(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }

      if (isValidElement(child)) {
        // props von unknown auf einen Typ mit optionalen children casten
        const props = child.props as { children?: ReactNode };
        if (props.children) {
          return childrenToCodeString(props.children);
        }
        return "";
      }

      // null, undefined, boolean etc. ignorieren
      return "";
    })
    .join("\n");
}

export function CodeExample({ children }: CodeExampleProps) {
  const cleanedCode = useMemo(
    () => childrenToCodeString(children).trim(),
    [children],
  );

  const {
    isLoading,
    diagnostics,
    consoleOutput,
    runtimeError,
    hadRuntime,
    runCode,
  } = useTsRunner();

  const codeRows = Math.max(1, cleanedCode.split("\n").length);

  const handleReadOnlyChange = () => {
    // CodeExample renders a read-only editor
  };

  const handleRun = () => {
    runCode({ code: cleanedCode, validate: false });
  };

  return (
    <CodeRunner
      code={cleanedCode}
      onChange={handleReadOnlyChange}
      onRun={handleRun}
      rows={codeRows}
      readOnly
      isLoading={isLoading}
      diagnostics={diagnostics}
      runtimeError={runtimeError}
      consoleOutput={consoleOutput}
      hadRuntime={hadRuntime}
      runButtonLabel={strings.buttons.runCode}
      headerTitle={strings.codeRunner.editorTitle}
    />
  );
}
