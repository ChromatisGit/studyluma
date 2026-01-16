export type IssuePath = (string | number)[];

export type IssueContext = {
  filePath?: string;
  basePath?: string;
  subjectId?: string;
  topicId?: string;
  chapterId?: string;
  courseIds?: string[];
};

export type ContentIssue = {
  code: string;
  message: string;
  hint?: string;
  filePath?: string;
  line?: number;
  col?: number;
  path?: IssuePath;
  context?: IssueContext;
  cause?: unknown;
};

export function createIssue(code: string, message: string, hint?: string): ContentIssue {
  return { code, message, hint };
}

export function isContentIssue(value: unknown): value is ContentIssue {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.code === "string" && typeof record.message === "string";
}
