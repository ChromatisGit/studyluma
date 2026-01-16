import { ContentIssue } from "./issues";
import { bundleIssues, formatIssueReport } from "./format";

export class ContentIssueError extends Error {
  readonly issue: ContentIssue;

  constructor(issue: ContentIssue) {
    super(issue.message);
    this.name = "ContentIssueError";
    this.issue = issue;
  }
}

export class ContentError extends Error {
  readonly issues: ContentIssue[];

  constructor(issues: ContentIssue[], title = "Content issues found") {
    const bundled = bundleIssues(issues);
    super(formatIssueReport(bundled, title));
    this.name = "ContentError";
    this.issues = bundled;
  }
}
