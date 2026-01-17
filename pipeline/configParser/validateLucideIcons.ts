import * as LucideIcons from "lucide-react";
import type { ContentIssue } from "../errorHandling";
import { issueCatalog } from "../errorHandling";
import type { GroupDefinitions } from "./schema/definitions";
import type { YamlCoursePlan } from "./schema/yamlCoursePlan";

type AnyRecord = Record<string, unknown>;
type CourseConfig = { filePath: string; data: YamlCoursePlan };
export type LucideIconExportName = keyof typeof LucideIcons;

function toKebabCase(input: string): string {
  return input
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

function isIconExport(v: unknown): v is (...args: unknown[]) => unknown {
  if (typeof v === "function") return true;
  if (!v || typeof v !== "object") return false;
  return "$$typeof" in v;
}

const LUCIDE_ICON_LOOKUP = (() => {
  const map = new Map<string, LucideIconExportName>();

  for (const key of Object.keys(LucideIcons) as LucideIconExportName[]) {
    const value = (LucideIcons as AnyRecord)[key];
    if (!isIconExport(value)) continue;
    map.set(toKebabCase(key), key);
  }

  return map;
})();

export const lucideIconNames = [...new Set(LUCIDE_ICON_LOOKUP.values())].sort();

export function resolveLucideIcon(
  input: string
): { kebabCase: string; exportName: LucideIconExportName } | null {
  const kebabCase = toKebabCase(input);
  const exportName = LUCIDE_ICON_LOOKUP.get(kebabCase);
  if (!exportName) return null;
  return { kebabCase, exportName };
}

export function validateLucideIcons(
  definitions: GroupDefinitions,
  courses: CourseConfig[]
): ContentIssue[] {
  const issues: ContentIssue[] = [];

  for (const [subjectId, subject] of Object.entries(definitions.subjects)) {
    if (!subject.icon) continue;
    const resolved = resolveLucideIcon(subject.icon);
    if (resolved) {
      subject.icon = resolved.kebabCase;
      continue;

    }
    issues.push({
      ...issueCatalog.invalidIcon(subject.icon),
      filePath: "content/definitions.yml",
      path: ["subjects", subjectId, "icon"],
    });
  }

  for (const course of courses) {
    const icon = course.data.course.icon;
    if (!icon) continue;
    const resolved = resolveLucideIcon(icon);
    if (resolved) {
      course.data.course.icon = resolved.kebabCase;
      continue
    }
    issues.push({
      ...issueCatalog.invalidIcon(icon),
      filePath: course.filePath,
      path: ["course", "icon"],
    });
  }

  return issues;
}
