import { ContentIssue, IssueContext, IssuePath } from "./issues";

const courseIdCodes = new Set([
  "content.missing_folder",
  "content.missing_chapter_folder",
  "file.read_failed",
]);

function formatPath(path: IssuePath): string {
  if (path.length === 0) return "(root)";
  return path
    .map((part) =>
      typeof part === "number"
        ? `[${part}]`
        : /^[a-zA-Z_]\w*$/.test(part)
          ? `.${part}`
          : `["${part}"]`
    )
    .join("")
    .replace(/^\./, "");
}

function formatLocation(issue: ContentIssue): string {
  if (!issue.line) return "";
  if (!issue.col) return `Line ${issue.line}:`;
  return `Line ${issue.line}, Col ${issue.col}:`;
}

function withContentPrefix(path: string): string {
  return path.startsWith("content/") ? path : `content/${path}`;
}

function groupLabel(issue: ContentIssue): string {
  if (issue.filePath) return issue.filePath;
  const ctx = issue.context;
  if (!ctx) return "(unknown file)";
  if (ctx.basePath) return withContentPrefix(ctx.basePath);
  const parts = [ctx.subjectId, ctx.topicId, ctx.chapterId].filter(Boolean);
  if (parts.length > 0) return parts.join("/");
  return "(unknown file)";
}

function mergeContexts(a?: IssueContext, b?: IssueContext): IssueContext | undefined {
  if (!a && !b) return undefined;
  const merged: IssueContext = { ...(a ?? {}) };
  if (b?.courseIds?.length) {
    const current = new Set(merged.courseIds ?? []);
    for (const id of b.courseIds) current.add(id);
    merged.courseIds = [...current];
  }
  return merged;
}

function issueKey(issue: ContentIssue): string {
  return [
    issue.filePath ?? "",
    issue.line ?? "",
    issue.col ?? "",
    issue.code,
    issue.message,
    issue.hint ?? "",
    JSON.stringify(issue.path ?? []),
  ].join("|");
}

function collectCourseIds(issues: ContentIssue[]): string[] {
  const ids = new Set<string>();

  for (const issue of issues) {
    if (!courseIdCodes.has(issue.code)) continue;
    const courseIds = issue.context?.courseIds ?? [];
    for (const courseId of courseIds) ids.add(courseId);
  }

  return [...ids].sort();
}

export function bundleIssues(issues: ContentIssue[]): ContentIssue[] {
  const map = new Map<string, ContentIssue>();

  for (const issue of issues) {
    const key = issueKey(issue);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, issue);
      continue;
    }

    const mergedContext = mergeContexts(existing.context, issue.context);
    map.set(key, mergedContext ? { ...existing, context: mergedContext } : existing);
  }

  return [...map.values()];
}

export function formatIssueReport(
  issues: ContentIssue[],
  title = "Content issues found"
): string {
  const bundled = bundleIssues(issues);
  if (bundled.length === 0) return title;

  const byGroup = new Map<string, ContentIssue[]>();
  for (const issue of bundled) {
    const label = groupLabel(issue);
    const list = byGroup.get(label) ?? [];
    list.push(issue);
    byGroup.set(label, list);
  }

  const lines: string[] = [`${title} (${bundled.length})`, ""];

  const entries = [...byGroup.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [label, list] of entries) {
    lines.push(label);
    const courseIds = collectCourseIds(list);
    if (courseIds.length > 0) {
      lines.push(`Courses: ${courseIds.join(", ")}`);
    }

    const sorted = [...list].sort((a, b) => {
      const lineA = a.line ?? Number.POSITIVE_INFINITY;
      const lineB = b.line ?? Number.POSITIVE_INFINITY;
      if (lineA !== lineB) return lineA - lineB;
      const colA = a.col ?? Number.POSITIVE_INFINITY;
      const colB = b.col ?? Number.POSITIVE_INFINITY;
      if (colA !== colB) return colA - colB;
      return a.message.localeCompare(b.message);
    });

    for (const issue of sorted) {
      const location = formatLocation(issue);
      const field = issue.path?.length ? `Field ${formatPath(issue.path)}: ` : "";
      const prefix = location ? `${location} ` : "";
      lines.push(`- ${prefix}${field}${issue.message}`);
      if (issue.hint) lines.push(`  Fix: ${issue.hint}`);
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
