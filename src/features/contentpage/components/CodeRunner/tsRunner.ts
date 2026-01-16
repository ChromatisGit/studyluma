import { transform, type Options as SucraseOptions } from 'sucrase';

// =========================
// Types
// =========================

type WorkerRequest = {
  code: string;
  validation?: string;
  requestId: number;
};

type DiagnosticCategory = 'error' | 'warning' | 'message' | 'suggestion';

type DiagnosticInfo = {
  message: string;
  line?: number;
  character?: number;
  category: DiagnosticCategory;
};

type RuntimeResult = {
  output: string;
  passed: boolean;
  error?: string;
};

type WorkerResponse = {
  requestId: number;
  diagnostics: DiagnosticInfo[];
  runtime?: RuntimeResult;
};

// =========================
// Transpiler options
// =========================

const sucraseOptions: SucraseOptions = {
  transforms: ['typescript', 'jsx'],
  jsxRuntime: 'automatic',
  production: true,
};

// =========================
// Helpers
// =========================

const formatArg = (arg: unknown): string => {
  if (arg === undefined) return 'undefined';
  if (arg === null) return 'null';
  if (typeof arg === 'string') return arg;
  if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);

  try {
    return JSON.stringify(arg, null, 2);
  } catch {
    return String(arg);
  }
};

const respondWithError = (requestId: number, message: string) => {
  const response: WorkerResponse = {
    requestId,
    diagnostics: [],
    runtime: {
      output: '',
      passed: false,
      error: message,
    },
  };

  self.postMessage(response);
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (isRecord(error) && typeof error.message === 'string') return error.message;
  return fallback;
}

const buildDiagnosticsFromError = (error: unknown): DiagnosticInfo[] => {
  const loc = isRecord(error) ? error.loc : undefined;
  const locRecord = isRecord(loc) ? loc : null;
  const line = locRecord ? getOptionalNumber(locRecord.line) : undefined;
  const column = locRecord ? getOptionalNumber(locRecord.column) : undefined;

  return [
    {
      message: getErrorMessage(error, 'Failed to transpile code'),
      line,
      character: typeof column === 'number' ? column + 1 : undefined,
      category: 'error',
    },
  ];
};

/**
 * Wrap user code + validation into a single source string
 * that:
 * - injects a custom console (`__console`)
 * - defines __userCode__
 * - returns the validation result of that function.
 */
const buildWrappedSource = (code: string, validation?: string): string => {
  const validationExpr = validation ?? 'true';

  return `
const console = __console;

function __userCode__() {
${code}
  return (${validationExpr});
}

return __userCode__();
`;
};

/**
 * Creates a fake console that collects output into an array.
 */
const createFakeConsole = (outputBuffer: string[]) => {
  return {
    log: (...args: unknown[]) => {
      outputBuffer.push(args.map(formatArg).join(' '));
    },
    warn: (...args: unknown[]) => {
      outputBuffer.push(args.map(formatArg).join(' '));
    },
    error: (...args: unknown[]) => {
      outputBuffer.push(args.map(formatArg).join(' '));
    },
  };
};

/**
 * Transpile with Sucrase (fast, TS + JSX only).
 */
const transpile = (source: string): { code: string | null; diagnostics: DiagnosticInfo[] } => {
  try {
    const { code } = transform(source, sucraseOptions);
    return { code, diagnostics: [] };
  } catch (error: unknown) {
    return {
      code: null,
      diagnostics: buildDiagnosticsFromError(error),
    };
  }
};

/**
 * Execute transpiled JS code with a fake console and return
 * the validation result + potential runtime error.
 */
const executeTranspiledCode = (
  transpiledJs: string,
  fakeConsole: ReturnType<typeof createFakeConsole>,
): { passed: boolean; error?: string } => {
  try {
    const runner = new Function(
      '__console',
      `"use strict";\n${transpiledJs}`,
    );

    const validationResult = runner(fakeConsole);
    return { passed: Boolean(validationResult) };
  } catch (error: unknown) {
    return {
      passed: false,
      error: getErrorMessage(error, String(error)),
    };
  }
};

// =========================
// Worker message handler
// =========================

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { code, validation, requestId } = event.data;

  try {
    const wrappedSource = buildWrappedSource(code, validation);

    const { code: transpiledJs, diagnostics } = transpile(wrappedSource);
    const hasErrors = diagnostics.some(d => d.category === 'error') || !transpiledJs;

    // If there are transpilation errors, we don't execute the code.
    if (hasErrors) {
      const response: WorkerResponse = {
        requestId,
        diagnostics,
      };
      self.postMessage(response);
      return;
    }

    const consoleOutput: string[] = [];
    const fakeConsole = createFakeConsole(consoleOutput);

    const { passed, error: runtimeError } = executeTranspiledCode(
      transpiledJs,
      fakeConsole,
    );

    const response: WorkerResponse = {
      requestId,
      diagnostics,
      runtime: {
        output: consoleOutput.join('\n'),
        passed,
        error: runtimeError,
      },
    };

    self.postMessage(response);
  } catch (error: unknown) {
    respondWithError(requestId, getErrorMessage(error, String(error)));
  }
};

export {};
