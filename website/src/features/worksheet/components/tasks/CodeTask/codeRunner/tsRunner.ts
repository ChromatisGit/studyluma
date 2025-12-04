import * as ts from 'typescript';

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
// Compiler options
// =========================

const compilerOptions: ts.TranspileOptions['compilerOptions'] = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  esModuleInterop: true,
  jsx: ts.JsxEmit.ReactJSX,
};

// =========================
// Helpers
// =========================

const formatArg = (arg: unknown): string => {
  if (typeof arg === 'string') return arg;
  if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);

  try {
    return JSON.stringify(arg, null, 2);
  } catch {
    return String(arg);
  }
};

const normalizeDiagnostics = (diagnostics: readonly ts.Diagnostic[] = []): DiagnosticInfo[] => {
  return diagnostics.map(diagnostic => {
    const position = diagnostic.file
      ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0)
      : undefined;

    const category: DiagnosticCategory =
      diagnostic.category === ts.DiagnosticCategory.Error
        ? 'error'
        : diagnostic.category === ts.DiagnosticCategory.Warning
        ? 'warning'
        : diagnostic.category === ts.DiagnosticCategory.Suggestion
        ? 'suggestion'
        : 'message';

    return {
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      line: position ? position.line + 1 : undefined,
      character: position ? position.character + 1 : undefined,
      category,
    };
  });
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
  } catch (error: any) {
    return {
      passed: false,
      error: error?.message || String(error),
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

    const transpileResult = ts.transpileModule(wrappedSource, {
      compilerOptions,
      reportDiagnostics: true,
    });

    const diagnostics = normalizeDiagnostics(transpileResult.diagnostics);
    const hasErrors = diagnostics.some(d => d.category === 'error');

    // If there are TypeScript errors, we don't execute the code.
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
      transpileResult.outputText,
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
  } catch (error: any) {
    respondWithError(requestId, error?.message || String(error));
  }
};

export {};
