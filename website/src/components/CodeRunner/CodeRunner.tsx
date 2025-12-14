import { Play } from 'lucide-react';
import { strings } from '@features/worksheet/config/strings';
import { CodeEditor } from './CodeEditor';
import type { TsWorkerDiagnostic } from './useTsRunner';
import styles from './CodeRunner.module.css';

export type CodeRunnerResult = 'success' | 'failure';

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
  rows = 10,
  readOnly = false,
  diagnostics = [],
  runtimeError = null,
  consoleOutput = '',
  hadRuntime = false,
  testResult = null,
  hasValidation = false,
  headerTitle = strings.codeTask.editorTitle,
  runButtonLabel = strings.buttons.runCode,
  className,
}: CodeRunnerProps) {
  const showNoOutput = hadRuntime && !runtimeError && !consoleOutput;
  const hasConsoleData = runtimeError !== null || Boolean(consoleOutput) || showNoOutput;
  const hasAnyOutput = Boolean(testResult || hasConsoleData);

  const isSuccess = testResult === 'success';
  const isFailure = testResult === 'failure';

  const resultClasses = [styles.result];
  if (isSuccess) resultClasses.push(styles.resultSuccess);
  if (isFailure) resultClasses.push(styles.resultFailure);

  const resultLabel = (() => {
    if (isSuccess) {
      return hasValidation ? strings.codeTask.resultSuccess : strings.codeTask.resultCompiled;
    }
    if (isFailure) {
      return hasValidation ? strings.codeTask.resultFailure : strings.codeTask.resultCompileError;
    }
    if (hasConsoleData) {
      return strings.codeTask.consoleOutput;
    }
    return null;
  })();

  return (
    <div className={[styles.runner, className].filter(Boolean).join(' ')}>
      <div className={styles.codeShell}>
        <div className={styles.codeHeader}>
          <span className={styles.codeHeaderTitle}>{headerTitle}</span>
          <button
            onClick={onRun}
            disabled={isLoading}
            className={styles.runButton}
          >
            <Play className={styles.runIcon} />
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
          <div className={styles.diagnosticsTitle}>{strings.codeTask.diagnosticsTitle}</div>
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
        <div className={resultClasses.join(' ')}>
          {resultLabel && <div className={styles.resultLabel}>{resultLabel}</div>}
          {hasConsoleData && (
            <pre
              className={`${styles.consoleOutput} ${runtimeError ? styles.consoleError : ''}`}
            >
              {runtimeError || consoleOutput || strings.codeTask.noOutput}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
