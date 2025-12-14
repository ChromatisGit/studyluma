// src/components/tasks/CodeTask.tsx
import { useEffect, useState } from 'react';
import { CodeRunner, useTsRunner } from '@site/src/components/CodeRunner';
import { CollapsibleSection } from '@features/worksheet/components/CollapsibleSection/CollapsibleSection';
import { parseTextWithCode } from '@features/worksheet/components/CodeBlock/parseTextWithCode';
import styles from './CodeTask.module.css';
import type { CodeTask as CodeTaskType } from '@worksheet/worksheetModel';
import { useTaskPersistence } from '@features/worksheet/storage/useTaskPersistence';

interface CodeTaskProps {
  task: CodeTaskType;
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

  useEffect(() => {
    setShowValidation(false);
    setIsChecked(false);
  }, [worksheetId]);

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
