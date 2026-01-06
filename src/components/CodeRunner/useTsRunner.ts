"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

export type DiagnosticCategory = 'error' | 'warning' | 'message' | 'suggestion';

export type TsWorkerDiagnostic = {
  message: string;
  line?: number;
  character?: number;
  category: DiagnosticCategory;
};

type TsWorkerRuntime = {
  output: string;
  passed: boolean;
  error?: string;
};

type TsWorkerResponse = {
  requestId: number;
  diagnostics: TsWorkerDiagnostic[];
  runtime?: TsWorkerRuntime;
};

type RunOptions = {
  code: string;
  validation?: string;
  validate?: boolean;
};

const WORKER_TIMEOUT_MS = 6000;

function clearTimeoutRef(ref: React.MutableRefObject<number | null>) {
  if (ref.current) {
    clearTimeout(ref.current);
    ref.current = null;
  }
}

function ensureWorker(ref: React.MutableRefObject<Worker | null>): Worker {
  if (!ref.current) {
    ref.current = new Worker(
      new URL('./tsRunner.ts', import.meta.url),
      { type: 'module' }
    );
  }
  return ref.current;
}

export function useTsRunner() {
  const [isLoading, setIsLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<TsWorkerDiagnostic[]>([]);
  const [consoleOutput, setConsoleOutput] = useState('');
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [lastPassed, setLastPassed] = useState<boolean | null>(null);
  const [hadRuntime, setHadRuntime] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const pendingRequestRef = useRef<{ id: number; validate: boolean } | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const runCode = useCallback(
    ({ code, validation, validate = false }: RunOptions) => {
      const requestId = Date.now();

      setIsLoading(true);

      pendingRequestRef.current = { id: requestId, validate };

      const worker = ensureWorker(workerRef);

      // Timeout
      clearTimeoutRef(timeoutRef);
      timeoutRef.current = window.setTimeout(() => {
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
        pendingRequestRef.current = null;
        setIsLoading(false);
        setDiagnostics([]);
        setHadRuntime(false);
        setConsoleOutput('');
        setRuntimeError('Execution timed out');
        setLastPassed(validate ? false : null);
      }, WORKER_TIMEOUT_MS);

      worker.onmessage = (event: MessageEvent<TsWorkerResponse>) => {
        const pending = pendingRequestRef.current;
        if (!pending || event.data.requestId !== pending.id) return;

        const { validate: pendingValidate } = pending;
        pendingRequestRef.current = null;
        setIsLoading(false);
        clearTimeoutRef(timeoutRef);

        const incomingDiagnostics = event.data.diagnostics || [];
        setDiagnostics(incomingDiagnostics);

        // Reset runtime-related state once we have a response so the previous
        // output stays visible while the worker runs.
        setHadRuntime(false);
        setConsoleOutput('');
        setRuntimeError(null);

        const hasErrors = incomingDiagnostics.some(d => d.category === 'error');
        if (hasErrors) {
          setLastPassed(pendingValidate ? false : null);
          return;
        }

        const runtime = event.data.runtime;
        if (!runtime) {
          setLastPassed(pendingValidate ? false : null);
          return;
        }

        setHadRuntime(true);
        setConsoleOutput(runtime.output || '');

        if (runtime.error) {
          setRuntimeError(runtime.error);
          setLastPassed(pendingValidate ? false : null);
          return;
        }

        if (pendingValidate) {
          setLastPassed(runtime.passed);
        } else {
          setLastPassed(null);
        }
      };

      worker.onerror = (error) => {
        pendingRequestRef.current = null;
        setIsLoading(false);
        clearTimeoutRef(timeoutRef);

        setDiagnostics([]);
        setHadRuntime(false);
        setConsoleOutput('');
        setRuntimeError(error.message || 'Worker failed to execute code');
        setLastPassed(validate ? false : null);
      };

      worker.postMessage({
        code,
        validation,
        requestId,
      });
    },
    []
  );

  // Preload worker on mount and clean up on unmount
  useEffect(() => {
    ensureWorker(workerRef);

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      clearTimeoutRef(timeoutRef);
    };
  }, []);

  return {
    isLoading,
    diagnostics,
    consoleOutput,
    runtimeError,
    lastPassed,
    hadRuntime,
    runCode,
  };
}
