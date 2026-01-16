import { issueCatalog } from "./catalog";
import { ContentIssue } from "./issues";
import { extractLineCol } from "./utils";

export function issueFromYamlError(err: unknown): ContentIssue {
  const message = err instanceof Error ? err.message : String(err);
  const loc = extractLineCol(message);
  return { ...issueCatalog.yamlSyntax(message), ...loc, cause: err };
}
