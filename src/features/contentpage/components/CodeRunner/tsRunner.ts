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
// Minimal TypeScript lib for educational use
// =========================

const USER_FILE = 'user.ts';
const LIB_FILE = 'lib.d.ts';

/**
 * Hand-written minimal type declarations covering what students need for a
 * TypeScript foundations course. Used with `noLib: true` so the full
 * built-in lib files are not needed.
 */
const MINIMAL_LIB_DTS = `
// Primitive wrapper interfaces (needed for methods like .toFixed(), .trim(), etc.)
interface Boolean {}
interface BooleanConstructor {
  new(value?: unknown): Boolean;
  (value?: unknown): boolean;
}
declare const Boolean: BooleanConstructor;

interface Number {
  toFixed(fractionDigits?: number): string;
  toString(radix?: number): string;
  valueOf(): number;
}
interface NumberConstructor {
  (value?: unknown): number;
  isFinite(value: unknown): boolean;
  isInteger(value: unknown): value is number;
  isNaN(value: unknown): boolean;
  parseInt(string: string, radix?: number): number;
  parseFloat(string: string): number;
  readonly NaN: number;
  readonly POSITIVE_INFINITY: number;
  readonly NEGATIVE_INFINITY: number;
  readonly MAX_VALUE: number;
  readonly MIN_VALUE: number;
  readonly MAX_SAFE_INTEGER: number;
  readonly MIN_SAFE_INTEGER: number;
}
declare const Number: NumberConstructor;

interface String {
  readonly length: number;
  charAt(pos: number): string;
  charCodeAt(index: number): number;
  codePointAt(pos: number): number | undefined;
  concat(...strings: string[]): string;
  indexOf(searchString: string, position?: number): number;
  lastIndexOf(searchString: string, position?: number): number;
  includes(searchString: string, position?: number): boolean;
  startsWith(searchString: string, position?: number): boolean;
  endsWith(searchString: string, endPosition?: number): boolean;
  slice(start?: number, end?: number): string;
  substring(start: number, end?: number): string;
  toLowerCase(): string;
  toUpperCase(): string;
  trim(): string;
  trimStart(): string;
  trimEnd(): string;
  split(separator: string | RegExp, limit?: number): string[];
  replace(searchValue: string | RegExp, replaceValue: string): string;
  replaceAll(searchValue: string | RegExp, replaceValue: string): string;
  repeat(count: number): string;
  padStart(maxLength: number, fillString?: string): string;
  padEnd(maxLength: number, fillString?: string): string;
  at(index: number): string | undefined;
  match(regexp: string | RegExp): RegExpMatchArray | null;
  matchAll(regexp: RegExp): IterableIterator<RegExpMatchArray>;
  [index: number]: string;
  [Symbol.iterator](): IterableIterator<string>;
}
interface StringConstructor {
  (value?: unknown): string;
  fromCharCode(...codes: number[]): string;
}
declare const String: StringConstructor;

// Iteration support (needed for for...of loops and generators)
interface Iterator<T, TReturn = unknown, TNext = undefined> {
  next(...args: [] | [TNext]): IteratorResult<T, TReturn>;
  return?(value?: TReturn): IteratorResult<T, TReturn>;
  throw?(e?: unknown): IteratorResult<T, TReturn>;
}
type IteratorResult<T, TReturn = unknown> =
  | IteratorYieldResult<T>
  | IteratorReturnResult<TReturn>;
interface IteratorYieldResult<TYield> { done?: false; value: TYield; }
interface IteratorReturnResult<TReturn> { done: true; value: TReturn; }
interface Iterable<T> {
  [Symbol.iterator](): Iterator<T>;
}
interface IterableIterator<T> extends Iterator<T> {
  [Symbol.iterator](): IterableIterator<T>;
}

// Symbol (needed for iterable support)
interface Symbol {
  toString(): string;
  valueOf(): symbol;
}
interface SymbolConstructor {
  readonly iterator: unique symbol;
  readonly hasInstance: unique symbol;
  readonly toPrimitive: unique symbol;
  readonly toStringTag: unique symbol;
  (description?: string | number): symbol;
}
declare const Symbol: SymbolConstructor;

// Array
interface Array<T> {
  readonly length: number;
  push(...items: T[]): number;
  pop(): T | undefined;
  shift(): T | undefined;
  unshift(...items: T[]): number;
  splice(start: number, deleteCount?: number, ...items: T[]): T[];
  slice(start?: number, end?: number): T[];
  indexOf(searchElement: T, fromIndex?: number): number;
  lastIndexOf(searchElement: T, fromIndex?: number): number;
  includes(searchElement: T, fromIndex?: number): boolean;
  find<S extends T>(predicate: (value: T, index: number, obj: T[]) => value is S): S | undefined;
  find(predicate: (value: T, index: number, obj: T[]) => unknown): T | undefined;
  findIndex(predicate: (value: T, index: number, obj: T[]) => unknown): number;
  filter<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S): S[];
  filter(predicate: (value: T, index: number, array: T[]) => unknown): T[];
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U): U[];
  flatMap<U>(callbackfn: (value: T, index: number, array: T[]) => U | U[]): U[];
  flat(depth?: number): unknown[];
  forEach(callbackfn: (value: T, index: number, array: T[]) => void): void;
  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
  reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
  reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
  join(separator?: string): string;
  reverse(): T[];
  sort(compareFn?: (a: T, b: T) => number): this;
  some(predicate: (value: T, index: number, array: T[]) => unknown): boolean;
  every<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S): this is S[];
  every(predicate: (value: T, index: number, array: T[]) => unknown): boolean;
  fill(value: T, start?: number, end?: number): this;
  copyWithin(target: number, start: number, end?: number): this;
  entries(): IterableIterator<[number, T]>;
  keys(): IterableIterator<number>;
  values(): IterableIterator<T>;
  at(index: number): T | undefined;
  [Symbol.iterator](): IterableIterator<T>;
  [index: number]: T;
}
interface ReadonlyArray<T> {
  readonly length: number;
  readonly [index: number]: T;
  includes(searchElement: T, fromIndex?: number): boolean;
  indexOf(searchElement: T, fromIndex?: number): number;
  find<S extends T>(predicate: (value: T, index: number, obj: readonly T[]) => value is S): S | undefined;
  find(predicate: (value: T, index: number, obj: readonly T[]) => unknown): T | undefined;
  filter<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S): S[];
  filter(predicate: (value: T, index: number, array: readonly T[]) => unknown): T[];
  map<U>(callbackfn: (value: T, index: number, array: readonly T[]) => U): U[];
  forEach(callbackfn: (value: T, index: number, array: readonly T[]) => void): void;
  some(predicate: (value: T, index: number, array: readonly T[]) => unknown): boolean;
  every(predicate: (value: T, index: number, array: readonly T[]) => unknown): boolean;
  slice(start?: number, end?: number): T[];
  join(separator?: string): string;
  [Symbol.iterator](): IterableIterator<T>;
}
interface ArrayConstructor {
  new<T>(arrayLength?: number): T[];
  new<T>(...items: T[]): T[];
  <T>(arrayLength?: number): T[];
  <T>(...items: T[]): T[];
  isArray(arg: unknown): arg is unknown[];
  from<T>(iterable: Iterable<T> | ArrayLike<T>): T[];
  from<T, U>(iterable: Iterable<T> | ArrayLike<T>, mapfn: (v: T, k: number) => U): U[];
  of<T>(...items: T[]): T[];
}
declare const Array: ArrayConstructor;

interface ArrayLike<T> {
  readonly length: number;
  readonly [n: number]: T;
}

// Object
interface Object {
  toString(): string;
  hasOwnProperty(v: string | number | symbol): boolean;
  valueOf(): Object;
}
interface ObjectConstructor {
  keys(o: object): string[];
  values<T>(o: { [s: string]: T } | ArrayLike<T>): T[];
  values(o: {}): unknown[];
  entries<T>(o: { [s: string]: T } | ArrayLike<T>): [string, T][];
  entries(o: {}): [string, unknown][];
  assign<T extends {}, U>(target: T, source: U): T & U;
  assign<T extends {}, U, V>(target: T, source1: U, source2: V): T & U & V;
  create(proto: object | null): unknown;
  freeze<T>(obj: T): Readonly<T>;
  isFrozen(o: unknown): boolean;
  is(value1: unknown, value2: unknown): boolean;
  hasOwn(o: object, v: string | number | symbol): boolean;
  fromEntries<T = unknown>(entries: Iterable<readonly [PropertyKey, T]>): { [k: string]: T };
}
declare const Object: ObjectConstructor;

// Global constants and functions
declare var undefined: undefined;
declare var NaN: number;
declare var Infinity: number;
declare function parseInt(string: string, radix?: number): number;
declare function parseFloat(string: string): number;
declare function isNaN(number: number): boolean;
declare function isFinite(number: number): boolean;
declare function encodeURIComponent(uriComponent: string | number | boolean): string;
declare function decodeURIComponent(encodedURIComponent: string): string;
declare function encodeURI(uri: string): string;
declare function decodeURI(encodedURI: string): string;

// Math
interface Math {
  readonly PI: number;
  readonly E: number;
  readonly LN2: number;
  readonly LN10: number;
  readonly LOG2E: number;
  readonly LOG10E: number;
  readonly SQRT2: number;
  abs(x: number): number;
  ceil(x: number): number;
  floor(x: number): number;
  round(x: number): number;
  max(...values: number[]): number;
  min(...values: number[]): number;
  sqrt(x: number): number;
  cbrt(x: number): number;
  pow(x: number, y: number): number;
  random(): number;
  log(x: number): number;
  log2(x: number): number;
  log10(x: number): number;
  exp(x: number): number;
  sign(x: number): number;
  trunc(x: number): number;
  hypot(...values: number[]): number;
  sin(x: number): number;
  cos(x: number): number;
  tan(x: number): number;
  asin(x: number): number;
  acos(x: number): number;
  atan(x: number): number;
  atan2(y: number, x: number): number;
  clz32(x: number): number;
  fround(x: number): number;
  imul(x: number, y: number): number;
}
declare const Math: Math;

// Console
interface Console {
  log(...data: unknown[]): void;
  warn(...data: unknown[]): void;
  error(...data: unknown[]): void;
  info(...data: unknown[]): void;
  debug(...data: unknown[]): void;
}
declare const console: Console;

// Error
interface Error {
  message: string;
  name: string;
  stack?: string;
}
interface ErrorConstructor {
  new(message?: string): Error;
  (message?: string): Error;
}
declare const Error: ErrorConstructor;

// Promise
interface PromiseLike<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): PromiseLike<TResult1 | TResult2>;
}
interface Promise<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): Promise<TResult1 | TResult2>;
  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null | undefined,
  ): Promise<T | TResult>;
  finally(onfinally?: (() => void) | null | undefined): Promise<T>;
}
interface PromiseConstructor {
  new<T>(executor: (
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: unknown) => void,
  ) => void): Promise<T>;
  resolve(): Promise<void>;
  resolve<T>(value: T | PromiseLike<T>): Promise<T>;
  reject<T = never>(reason?: unknown): Promise<T>;
  all<T extends readonly unknown[] | []>(values: T): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }>;
  race<T>(values: Iterable<T | PromiseLike<T>>): Promise<T>;
}
declare const Promise: PromiseConstructor;
type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

// Date
interface Date {
  getTime(): number;
  getFullYear(): number;
  getMonth(): number;
  getDate(): number;
  getDay(): number;
  getHours(): number;
  getMinutes(): number;
  getSeconds(): number;
  getMilliseconds(): number;
  toISOString(): string;
  toLocaleDateString(locales?: string): string;
  toLocaleTimeString(locales?: string): string;
  toLocaleString(locales?: string): string;
  toString(): string;
  valueOf(): number;
}
interface DateConstructor {
  new(): Date;
  new(value: number | string): Date;
  new(year: number, monthIndex: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): Date;
  (): string;
  now(): number;
  parse(s: string): number;
}
declare const Date: DateConstructor;

// JSON
interface JSON {
  parse(text: string, reviver?: (this: unknown, key: string, value: unknown) => unknown): unknown;
  stringify(value: unknown, replacer?: ((this: unknown, key: string, value: unknown) => unknown) | null, space?: string | number): string;
}
declare const JSON: JSON;

// Map
interface Map<K, V> {
  clear(): void;
  delete(key: K): boolean;
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void): void;
  get(key: K): V | undefined;
  has(key: K): boolean;
  set(key: K, value: V): this;
  readonly size: number;
  entries(): IterableIterator<[K, V]>;
  keys(): IterableIterator<K>;
  values(): IterableIterator<V>;
  [Symbol.iterator](): IterableIterator<[K, V]>;
}
interface MapConstructor {
  new(): Map<unknown, unknown>;
  new<K, V>(entries?: readonly (readonly [K, V])[] | null): Map<K, V>;
}
declare const Map: MapConstructor;

// Set
interface Set<T> {
  add(value: T): this;
  clear(): void;
  delete(value: T): boolean;
  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void): void;
  has(value: T): boolean;
  readonly size: number;
  entries(): IterableIterator<[T, T]>;
  keys(): IterableIterator<T>;
  values(): IterableIterator<T>;
  [Symbol.iterator](): IterableIterator<T>;
}
interface SetConstructor {
  new<T = unknown>(values?: readonly T[] | null): Set<T>;
}
declare const Set: SetConstructor;

// RegExp
interface RegExpMatchArray extends Array<string> {
  index?: number;
  input?: string;
  groups?: Record<string, string>;
}
interface RegExp {
  exec(string: string): RegExpExecArray | null;
  test(string: string): boolean;
  readonly source: string;
  readonly flags: string;
  readonly global: boolean;
  readonly ignoreCase: boolean;
  readonly multiline: boolean;
}
interface RegExpExecArray extends Array<string> {
  index: number;
  input: string;
  groups?: Record<string, string>;
}
interface RegExpConstructor {
  new(pattern: string | RegExp, flags?: string): RegExp;
  (pattern: string | RegExp, flags?: string): RegExp;
}
declare const RegExp: RegExpConstructor;

// Utility types
type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };
type Readonly<T> = { readonly [P in keyof T]: T[P] };
type Record<K extends keyof any, T> = { [P in K]: T };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type NonNullable<T> = T extends null | undefined ? never : T;
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
type InstanceType<T extends abstract new (...args: any) => any> = T extends abstract new (...args: any) => infer R ? R : any;
type PropertyKey = string | number | symbol;
`;

// =========================
// Compiler configuration
// =========================

const COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.None,
  strict: true,
  noImplicitReturns: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  noFallthroughCasesInSwitch: true,
  noLib: true,
};

/**
 * These TypeScript error codes are downgraded from 'error' to 'warning' so
 * that unused variables/parameters don't block code execution — they are
 * still shown to students, but don't prevent running the code.
 */
const DOWNGRADE_TO_WARNING = new Set([
  6133, // '{name}' is declared but its value is never read.
  6196, // '{name}' is declared but never used.
  6199, // All imports in import declaration are unused.
  6205, // All destructured elements are unused.
]);

// =========================
// Virtual compiler host
// =========================

function createCompilerHost(userCode: string): ts.CompilerHost {
  const files = new Map<string, string>([
    [USER_FILE, userCode],
    [LIB_FILE, MINIMAL_LIB_DTS],
  ]);

  return {
    getSourceFile: (fileName: string, languageVersion: ts.ScriptTarget) => {
      const content = files.get(fileName);
      if (content !== undefined) {
        return ts.createSourceFile(fileName, content, languageVersion);
      }
      return undefined;
    },
    writeFile: () => {},
    getDefaultLibFileName: () => LIB_FILE,
    useCaseSensitiveFileNames: () => true,
    getCanonicalFileName: (fileName: string) => fileName,
    getCurrentDirectory: () => '/',
    getNewLine: () => '\n',
    fileExists: (fileName: string) => files.has(fileName),
    readFile: (fileName: string) => files.get(fileName),
    directoryExists: () => true,
    getDirectories: () => [],
  };
}

// =========================
// Diagnostic formatting
// =========================

function tsCategoryToString(category: ts.DiagnosticCategory): DiagnosticCategory {
  switch (category) {
    case ts.DiagnosticCategory.Error: return 'error';
    case ts.DiagnosticCategory.Warning: return 'warning';
    case ts.DiagnosticCategory.Message: return 'message';
    case ts.DiagnosticCategory.Suggestion: return 'suggestion';
    default: return 'error';
  }
}

function flattenMessage(msg: string | ts.DiagnosticMessageChain): string {
  if (typeof msg === 'string') return msg;
  const parts = [msg.messageText];
  if (msg.next) {
    for (const next of msg.next) {
      parts.push('  ' + flattenMessage(next));
    }
  }
  return parts.join('\n');
}

function formatDiagnostic(d: ts.Diagnostic, sourceFile: ts.SourceFile): DiagnosticInfo {
  const message = flattenMessage(d.messageText);
  const category = DOWNGRADE_TO_WARNING.has(d.code)
    ? 'warning'
    : tsCategoryToString(d.category);

  if (d.start === undefined) {
    return { message, category };
  }

  const { line, character } = sourceFile.getLineAndCharacterOfPosition(d.start);
  return {
    message,
    line: line + 1,
    character: character + 1,
    category,
  };
}

// =========================
// Semicolon check
// =========================

/**
 * Walks the AST and reports a warning for every statement that should end with
 * a semicolon but doesn't. Teaches students to write explicit semicolons.
 */
function checkSemicolons(sourceFile: ts.SourceFile): DiagnosticInfo[] {
  const diagnostics: DiagnosticInfo[] = [];
  const text = sourceFile.getFullText();

  function needsSemicolon(node: ts.Node): boolean {
    return (
      ts.isVariableStatement(node) ||
      ts.isExpressionStatement(node) ||
      ts.isReturnStatement(node) ||
      ts.isThrowStatement(node) ||
      ts.isBreakStatement(node) ||
      ts.isContinueStatement(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isPropertyDeclaration(node)
    );
  }

  function visit(node: ts.Node): void {
    if (needsSemicolon(node)) {
      const end = node.getEnd();
      if (end > 0 && text[end - 1] !== ';') {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(end - 1);
        diagnostics.push({
          message: 'Semikolon fehlt.',
          line: line + 1,
          character: character + 2,
          category: 'warning',
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);
  return diagnostics;
}

// =========================
// Type checking
// =========================

function typeCheck(userCode: string): DiagnosticInfo[] {
  const host = createCompilerHost(userCode);
  // Include LIB_FILE as a root so TypeScript resolves our custom declarations.
  const program = ts.createProgram([USER_FILE, LIB_FILE], COMPILER_OPTIONS, host);

  const sourceFile = program.getSourceFile(USER_FILE);
  if (!sourceFile) {
    return [{ message: 'Internal error: could not create source file.', category: 'error' }];
  }

  const tsDiagnostics = [
    ...program.getSyntacticDiagnostics(sourceFile),
    ...program.getSemanticDiagnostics(sourceFile),
  ].map(d => formatDiagnostic(d, sourceFile));

  const semiDiagnostics = checkSemicolons(sourceFile);

  return [...tsDiagnostics, ...semiDiagnostics];
}

// =========================
// Transpilation (execution only — no type checking)
// =========================

function transpile(source: string): { code: string | null; diagnostics: DiagnosticInfo[] } {
  try {
    const result = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.None,
      },
      reportDiagnostics: false,
    });
    return { code: result.outputText, diagnostics: [] };
  } catch (error: unknown) {
    return {
      code: null,
      diagnostics: [{ message: getErrorMessage(error, 'Transpilation failed'), category: 'error' }],
    };
  }
}

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

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (isRecord(error) && typeof error.message === 'string') return error.message;
  return fallback;
}

/**
 * Wrap user code + validation into a single source string.
 * - Injects a custom console (`__console`)
 * - Defines `__userCode__`
 * - Returns the validation result of that function
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
    info: (...args: unknown[]) => {
      outputBuffer.push(args.map(formatArg).join(' '));
    },
    debug: (...args: unknown[]) => {
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
    // Phase 1: Full type check on the raw user code.
    // This gives accurate line numbers and catches all TypeScript errors.
    const diagnostics = typeCheck(code);
    const hasErrors = diagnostics.some(d => d.category === 'error');

    if (hasErrors) {
      const response: WorkerResponse = { requestId, diagnostics };
      self.postMessage(response);
      return;
    }

    // Phase 2: Wrap + transpile (type-strip only) + execute.
    const wrappedSource = buildWrappedSource(code, validation);
    const { code: transpiledJs, diagnostics: transpileDiags } = transpile(wrappedSource);

    if (!transpiledJs) {
      self.postMessage({ requestId, diagnostics: [...diagnostics, ...transpileDiags] });
      return;
    }

    const outputBuffer: string[] = [];
    const fakeConsole = createFakeConsole(outputBuffer);
    const { passed, error: runtimeError } = executeTranspiledCode(transpiledJs, fakeConsole);

    const response: WorkerResponse = {
      requestId,
      diagnostics,
      runtime: {
        output: outputBuffer.join('\n'),
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
