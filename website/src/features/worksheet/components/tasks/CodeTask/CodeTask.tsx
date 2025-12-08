// src/components/tasks/CodeTask.tsx
import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { CodeEditor } from '@features/worksheet/components/tasks/CodeTask/CodeEditor';
import { CollapsibleSection } from '@features/worksheet/components/CollapsibleSection/CollapsibleSection';
import { useTsRunner } from '@features/worksheet/components/tasks/CodeTask/codeRunner/useTsRunner';
import { parseTextWithCode } from '@features/worksheet/components/CodeBlock/parseTextWithCode';
import { strings } from '@features/worksheet/config/strings';
import styles from './CodeTask.module.css';
import type { CodeTask as CodeTaskType } from '@worksheet/worksheetModel';

interface CodeTaskProps {
  task: CodeTaskType;
  isSingleTask?: boolean;
  triggerCheck: number;
}

export function CodeTask({ task, isSingleTask = false, triggerCheck }: CodeTaskProps) {
  const [code, setCode] = useState(task.starter);
  const [showValidation, setShowValidation] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const {
    isLoading,
    diagnostics,
    consoleOutput,
    runtimeError,
    lastPassed,
    hadRuntime,
    runCode,
  } = useTsRunner();

  const hasValidation = Boolean(task.validation?.trim());
  // Compute number of rows for editor from solution length
  const solutionLines = task.solution ? task.solution.split('\n').length : 10;
  const codeRows = Math.max(6, solutionLines + 1);
  const hasTypeErrors = diagnostics.some(diag => diag.category === 'error');

  // Derive testResult from lastPassed + showValidation
  const testResult: 'success' | 'failure' | null = (() => {
    if (!showValidation || isLoading) return null;
    if (hasValidation) {
      if (lastPassed === null) return null;
      return lastPassed ? 'success' : 'failure';
    }
    if (hasTypeErrors || runtimeError) return 'failure';
    if (hadRuntime) return 'success';
    return null;
  })();

  // Reset state when code changes
  const handleCodeChange = (value: string) => {
    setCode(value);
    setShowValidation(false);
  };

  const handleRunCode = () => {
    setShowValidation(false);
    runCode({
      code,
      validation: task.validation,
      validate: false,
    });
  };

  // Auto-run validation when triggerCheck changes
  useEffect(() => {
    if (triggerCheck > 0 && code !== task.starter) {
      setShowValidation(true);
      setIsChecked(true);
      runCode({
        code,
        validation: task.validation,
        validate: hasValidation,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerCheck]);

  // -----------------------------
  // Render helpers
  // -----------------------------

  const renderTypeDiagnostics = () => {
    if (diagnostics.length === 0) return null;

    return (
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
    );
  };

  const renderResultPanel = () => {
    const showNoOutput = hadRuntime && !runtimeError && !consoleOutput;
    const hasConsoleData = runtimeError !== null || consoleOutput || showNoOutput;
    const hasAnyOutput = Boolean(testResult || hasConsoleData);

    if (!hasAnyOutput) return null;

    const isSuccess = testResult === 'success';
    const isFailure = testResult === 'failure';

    const resultClasses = [styles.result];
    if (isSuccess) resultClasses.push(styles.resultSuccess);
    if (isFailure) resultClasses.push(styles.resultFailure);

    const resultLabel = (() => {
      if (isSuccess) {
        return hasValidation
          ? strings.codeTask.resultSuccess
          : strings.codeTask.resultCompiled;
      }
      if (isFailure) {
        return hasValidation
          ? strings.codeTask.resultFailure
          : strings.codeTask.resultCompileError;
      }
      if (hasConsoleData) {
        return strings.codeTask.consoleOutput;
      }
      return null;
    })();

    return (
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
    );
  };

  const renderHintAndSolution = () => {
    const hasHint = Boolean(task.hint);
    const hasSolution = Boolean(task.solution && isChecked);

    if (!hasHint && !hasSolution) return null;

    return (
      <div className={styles.stackSmall}>
        {hasHint && <CollapsibleSection type="hint" content={task.hint!} />}

        {hasSolution && (
          <CollapsibleSection
            type="solution"
            content={parseTextWithCode(task.solution!, styles.bodyText)}
          />
        )}
      </div>
    );
  };

  // -----------------------------
  // Render
  // -----------------------------

  return (
    <div className={`${styles.stackMedium} ${isSingleTask ? styles.stackTight : ''}`}>
      <div className={styles.bodyText}>{parseTextWithCode(task.instruction, styles.bodyText)}</div>

      <div className={styles.codeShell}>
        <div className={styles.codeHeader}>
          <span className={styles.codeHeaderTitle}>{strings.codeTask.editorTitle}</span>
          <button
            onClick={handleRunCode}
            disabled={isLoading}
            className={styles.runButton}
          >
            <Play className={styles.runIcon} />
            <span>{strings.buttons.runCode}</span>
          </button>
        </div>

        <CodeEditor value={code} onChange={handleCodeChange} rows={codeRows} />
      </div>

      {renderTypeDiagnostics()}
      {renderResultPanel()}
      {renderHintAndSolution()}
    </div>
  );
}
