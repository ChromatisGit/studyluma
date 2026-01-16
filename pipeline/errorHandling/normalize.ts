import { ZodError } from "zod";
import { issueCatalog } from "./catalog";
import { ContentError, ContentIssueError } from "./errors";
import { ContentIssue, IssueContext, isContentIssue } from "./issues";
import { extractLineCol } from "./utils";
import { issuesFromZodError } from "./zod";

function extractQuotedList(text: string): string[] {
  const matches = text.match(/"([^"]+)"/g) ?? [];
  if (matches.length > 0) {
    return matches.map((m) => m.slice(1, -1));
  }
  return text
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function issueFromMessage(message: string): ContentIssue {
  const trimmed = message.trim();

  if (/^No title found/i.test(trimmed)) {
    return { ...issueCatalog.missingTitle(), line: 1, col: 1 };
  }

  let match = trimmed.match(/^Unknown macro\s+([A-Za-z_]\w*)/);
  if (match) {
    return issueCatalog.unknownMacro(match[1]);
  }

  match = trimmed.match(/^Invalid key "([^"]+)" for (\w+)/);
  if (match) {
    return issueCatalog.invalidParamKey(match[2], match[1]);
  }

  match = trimmed.match(
    /^Invalid type for (\w+)\. (\w+): expected (\w+), got (\w+)/
  );
  if (match) {
    return issueCatalog.invalidParamType(match[1], match[2], match[3], match[4]);
  }

  match = trimmed.match(/^Invalid inline macro\(s\) for (\w+): (.+)$/);
  if (match) {
    return issueCatalog.invalidInlineMacro(match[1], extractQuotedList(match[2]));
  }

  match = trimmed.match(/^Missing required inline macro\(s\) in (\w+): (.+)$/);
  if (match) {
    return issueCatalog.missingInlineMacro(match[1], extractQuotedList(match[2]));
  }

  if (/^Unclosed macro content/i.test(trimmed)) {
    return issueCatalog.unclosedMacroBlock();
  }

  match = trimmed.match(
    /^Duplicate folder mapping for chapter "([^"]+)": "([^"]+)" and "([^"]+)"/
  );
  if (match) {
    return issueCatalog.duplicateChapterFolder(match[1], match[2], match[3]);
  }

  match = trimmed.match(/^Missing folder for chapter "([^"]+)"/);
  if (match) {
    return issueCatalog.missingChapterFolder(
      match[1],
      `"<number>-${match[1]}" or "${match[1]}"`
    );
  }

  const issue = issueCatalog.generic(trimmed);
  const loc = extractLineCol(trimmed);
  if (loc.line || loc.col) return { ...issue, ...loc };
  return issue;
}

export function applyContext(issue: ContentIssue, ctx?: IssueContext): ContentIssue {
  if (!ctx) return issue;

  const { filePath, ...rest } = ctx;
  const mergedContext: IssueContext = { ...rest };

  if (issue.context) {
    for (const [key, value] of Object.entries(issue.context) as [
      keyof IssueContext,
      IssueContext[keyof IssueContext]
    ][]) {
      if (value === undefined) continue;

      if (key === "courseIds") {
        mergedContext.courseIds = value as IssueContext["courseIds"];
        continue;
      }

      mergedContext[key] = value as IssueContext[Exclude<keyof IssueContext, "courseIds">];
    }
  }

  return {
    ...issue,
    filePath: issue.filePath ?? filePath,
    context: Object.keys(mergedContext).length > 0 ? mergedContext : issue.context,
  };
}

export function applyContextToIssues(
  issues: ContentIssue[],
  ctx?: IssueContext
): ContentIssue[] {
  if (!ctx) return issues;
  return issues.map((issue) => applyContext(issue, ctx));
}

export function toContentIssues(err: unknown, ctx?: IssueContext): ContentIssue[] {
  let issues: ContentIssue[] = [];

  if (err instanceof ContentError) {
    issues = err.issues;
  } else if (err instanceof ContentIssueError) {
    issues = [err.issue];
  } else if (err instanceof ZodError) {
    issues = issuesFromZodError(err);
  } else if (Array.isArray(err) && err.every(isContentIssue)) {
    issues = err;
  } else if (isContentIssue(err)) {
    issues = [err];
  } else if (err instanceof Error) {
    issues = [issueFromMessage(err.message)];
  } else if (typeof err === "string") {
    issues = [issueFromMessage(err)];
  } else {
    issues = [issueCatalog.generic(String(err))];
  }

  return applyContextToIssues(issues, ctx);
}
