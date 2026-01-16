import type { ZodError } from "zod";
import { issueCatalog } from "./catalog";
import { ContentIssue, createIssue } from "./issues";

type AnyIssue = {
  code: string;
  message: string;
  path?: (string | number)[];
  keys?: string[];
  values?: unknown[];
  options?: unknown[];
  expected?: string;
  received?: string;
  issues?: AnyIssue[];
};

function flattenIssues(issues: AnyIssue[], parentPath: (string | number)[] = []): AnyIssue[] {
  const out: AnyIssue[] = [];
  for (const issue of issues) {
    const mergedPath = [...parentPath, ...(issue.path ?? [])];
    out.push({ ...issue, path: mergedPath });
    if (issue.issues?.length) out.push(...flattenIssues(issue.issues, mergedPath));
  }
  return out;
}

function humanizeType(value?: string): string | undefined {
  if (!value) return value;
  switch (value) {
    case "string":
      return "text";
    case "number":
      return "number";
    case "boolean":
      return "true/false";
    case "array":
      return "list";
    case "object":
      return "object";
    case "null":
      return "empty value";
    case "undefined":
      return "empty value";
    default:
      return value;
  }
}

function formatValueList(values: unknown[]): string {
  return values.map((v) => JSON.stringify(v)).join(" | ");
}

function formatIssueMessage(issue: AnyIssue): string {
  if (issue.code === "unrecognized_keys" && issue.keys?.length) {
    return `Unknown key(s): ${issue.keys.map((k) => `"${k}"`).join(", ")}`;
  }
  if (issue.code === "invalid_type") {
    const expected = issue.expected;
    let received = issue.received;

    if (!received) {
      const m = issue.message.match(/expected (\w+), received (\w+)/i);
      if (m) received = m[2];
    }

    if (expected) {
      const expectedText = humanizeType(expected);
      const receivedText = received ? humanizeType(received) : undefined;
      if (receivedText) return `Expected ${expectedText}, got ${receivedText}.`;
      return `Expected ${expectedText}.`;
    }
  }
  if (
    (issue.code === "invalid_enum_value" || issue.code === "invalid_value") &&
    (issue.options?.length || issue.values?.length)
  ) {
    const values = issue.options ?? issue.values ?? [];
    if (values.length === 1) {
      return `Value must be ${JSON.stringify(values[0])}.`;
    }
    return "Value is not allowed.";
  }
  if (issue.code === "invalid_literal" && issue.expected) {
    return `Value must be ${JSON.stringify(issue.expected)}.`;
  }
  return issue.message;
}

function issueFromCustomMessage(issue: AnyIssue): ContentIssue | null {
  if (issue.code !== "custom") return null;

  const match = issue.message.match(/^Unknown icon "([^"]+)"\.?$/);
  if (match) return issueCatalog.invalidIcon(match[1]);

  return null;
}

function suggestIssue(issue: AnyIssue): string | undefined {
  if (issue.code === "unrecognized_keys" && issue.keys?.length) {
    return "Remove the unknown keys or fix the spelling.";
  }
  if (
    (issue.code === "invalid_enum_value" || issue.code === "invalid_value") &&
    (issue.options?.length || issue.values?.length)
  ) {
    const values = issue.options ?? issue.values ?? [];
    if (values.length === 1) return undefined;
    return `Allowed values: ${formatValueList(values)}.`;
  }
  if (issue.code === "invalid_type" && issue.expected) {
    return `Use a ${humanizeType(issue.expected)} value.`;
  }
  if (/Invalid key format\. Use lowercase letters and '-' only\./i.test(issue.message)) {
    return "Use only a-z and '-' in the key.";
  }
  if (/Remove the starting numbers/i.test(issue.message)) {
    return 'Remove leading numbers (e.g. "01-intro" -> "intro").';
  }
  if (/is not defined in definitions\.yml/i.test(issue.message)) {
    return "Add it to definitions.yml or fix the key.";
  }
  return undefined;
}

export function issuesFromZodError(err: ZodError): ContentIssue[] {
  const flat = flattenIssues((err as { issues: AnyIssue[] }).issues ?? []);
  return flat.map((issue) => {
    const catalogIssue = issueFromCustomMessage(issue);
    if (catalogIssue) {
      return { ...catalogIssue, path: issue.path };
    }
    return {
      ...createIssue(`zod.${issue.code}`, formatIssueMessage(issue), suggestIssue(issue)),
      path: issue.path,
    };
  });
}
