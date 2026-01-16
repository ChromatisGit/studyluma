"use client";

import clsx from "clsx";
import { Play } from "lucide-react";

import strings from "@components/components.de.json";
import { CodeEditor } from "@features/contentpage/components/CodeEditor/CodeEditor";
import type { TsWorkerDiagnostic } from "./useTsRunner";
import styles from "./CodeRunner.module.css";

export type CodeRunnerResult = "success" | "failure";

type CodeRunnerProps = {
  code: string;
  onChange: (value: string) => void;
  onRun: () => void;
  isLoading?: boolean;
  rows?: number;
  readOnly?: boolean;
  diagnostics?: TsWorkerDiagnostic[];
  runtimeError?: string | null;
  consoleOutput?: string;
  hadRuntime?: boolean;
  testResult?: CodeRunnerResult | null;
  hasValidation?: boolean;
  headerTitle?: string;
  runButtonLabel?: string;
  className?: string;
};

export function CodeRunner({
  code,
  onChange,
  onRun,
  isLoading = false,
  rows = 5,
  readOnly = false,
  diagnostics = [],
  runtimeError = null,
  consoleOutput = "",
  hadRuntime = false,
  testResult = null,
  hasValidation = false,
  headerTitle = strings.codeRunner.editorTitle,
  runButtonLabel = strings.buttons.runCode,
  className,
}: CodeRunnerProps) {
  const showNoOutput = hadRuntime && !runtimeError && !consoleOutput;
  const hasConsoleData = runtimeError !== null || Boolean(consoleOutput) || showNoOutput;
  const hasAnyOutput = testResult !== null || hasConsoleData;

  const isSuccess = testResult === "success";
  const isFailure = testResult === "failure";

  const resultClassName = clsx(
    styles.result,
    isSuccess && styles.resultSuccess,
    isFailure && styles.resultFailure
  );

  const resultLabel = (() => {
    if (isSuccess) {
      return hasValidation ? strings.codeRunner.resultSuccess : strings.codeRunner.resultCompiled;
    }
    if (isFailure) {
      return hasValidation ? strings.codeRunner.resultFailure : strings.codeRunner.resultCompileError;
    }
    if (hasConsoleData) {
      return strings.codeRunner.consoleOutput;
    }
    return null;
  })();

  return (
    <div className={clsx(styles.runner, className)}>
      <div className={styles.codeShell}>
        <div className={styles.codeHeader}>
          <span className={styles.codeHeaderTitle}>{headerTitle}</span>
          <button
            type="button"
            onClick={onRun}
            disabled={isLoading}
            className={styles.runButton}
          >
            <Play className={styles.runIcon} aria-hidden />
            <span>{runButtonLabel}</span>
          </button>
        </div>

        <CodeEditor
          value={code}
          onChange={onChange}
          rows={rows}
          readOnly={readOnly}
        />
      </div>

      {diagnostics.length > 0 && (
        <div className={styles.diagnostics}>
          <div className={styles.diagnosticsTitle}>{strings.codeRunner.diagnosticsTitle}</div>
          <ul className={styles.diagnosticList}>
            {diagnostics.map((diag, index) => (
              <li key={index}>
                {diag.line ? `(${diag.line}:${diag.character ?? 1}) ` : ''}
                {diag.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasAnyOutput && (
        <div className={resultClassName}>
          {resultLabel && <div className={styles.resultLabel}>{resultLabel}</div>}
          {hasConsoleData && (
            <pre
              className={`${styles.consoleOutput} ${runtimeError ? styles.consoleError : ''}`}
            >
              {runtimeError || consoleOutput || strings.codeRunner.noOutput}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
