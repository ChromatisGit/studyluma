import { ContentError } from "./errors";
import { bundleIssues } from "./format";
import { applyContextToIssues, toContentIssues } from "./normalize";
import { ContentIssue, IssueContext } from "./issues";

export class ContentIssueCollector {
  private issues: ContentIssue[] = [];

  add(err: unknown, ctx?: IssueContext): void {
    this.issues.push(...toContentIssues(err, ctx));
  }

  addIssue(issue: ContentIssue, ctx?: IssueContext): void {
    this.issues.push(...applyContextToIssues([issue], ctx));
  }

  addIssues(issues: ContentIssue[], ctx?: IssueContext): void {
    this.issues.push(...applyContextToIssues(issues, ctx));
  }

  get hasIssues(): boolean {
    return this.issues.length > 0;
  }

  getIssues(): ContentIssue[] {
    return bundleIssues(this.issues);
  }

  clear(): void {
    this.issues = [];
  }

  throwIfAny(title?: string): void {
    if (!this.issues.length) return;
    throw new ContentError(this.getIssues(), title);
  }
}
