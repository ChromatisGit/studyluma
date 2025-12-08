import { Children, isValidElement, ReactNode, useMemo } from "react";
import { Play } from "lucide-react";
import { CodeEditor } from "@features/worksheet/components/tasks/CodeTask/CodeEditor";
import { useTsRunner } from "@features/worksheet/components/tasks/CodeTask/codeRunner/useTsRunner";
import { strings } from "@features/worksheet/config/strings";
import styles from "@features/worksheet/components/tasks/CodeTask/CodeTask.module.css";

type CodeExampleProps = {
  children: ReactNode;
};

type DiagnosticsPanelProps = {
  diagnostics: {
    line?: number;
    character?: number;
    message: string;
  }[];
};

function DiagnosticsPanel({ diagnostics }: DiagnosticsPanelProps) {
  if (!diagnostics.length) return null;

  return (
    <div className={styles.diagnostics}>
      <div className={styles.diagnosticsTitle}>
        {strings.codeTask.diagnosticsTitle}
      </div>
      <ul className={styles.diagnosticList}>
        {diagnostics.map((diag, index) => (
          <li key={index}>
            {diag.line ? `(${diag.line}:${diag.character ?? 1}) ` : ""}
            {diag.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

type OutputPanelProps = {
  runtimeError: string | null;
  consoleOutput: string;
  hadRuntime: boolean;
};

function OutputPanel({ runtimeError, consoleOutput, hadRuntime }: OutputPanelProps) {
  const hasAnyRuntime = runtimeError !== null || !!consoleOutput || hadRuntime;
  if (!hasAnyRuntime) return null;

  const label = strings.codeTask.consoleOutput;

  return (
    <div className={styles.result}>
      <div className={styles.resultLabel}>{label}</div>
      <pre
        className={`${styles.consoleOutput} ${
          runtimeError ? styles.consoleError : ""
        }`}
      >
        {runtimeError || consoleOutput || strings.codeTask.noOutput}
      </pre>
    </div>
  );
}


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

  const handleRun = () => {
    runCode({ code: cleanedCode, validate: false });
  };

  return (
    <div className={styles.stackMedium}>
      <div className={styles.codeShell}>
        <div className={styles.codeHeader}>
          <span className={styles.codeHeaderTitle}>
            {strings.codeTask.editorTitle}
          </span>
          <button
            onClick={handleRun}
            disabled={isLoading}
            className={styles.runButton}
          >
            <Play className={styles.runIcon} />
            <span>{strings.buttons.runCode}</span>
          </button>
        </div>

        <CodeEditor
          value={cleanedCode}
          onChange={() => {}}
          rows={codeRows}
          readOnly
        />
      </div>

      <DiagnosticsPanel diagnostics={diagnostics} />
      <OutputPanel
        runtimeError={runtimeError}
        consoleOutput={consoleOutput}
        hadRuntime={hadRuntime}
      />
    </div>
  );
}
